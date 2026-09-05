/* ============================================================================
   Contact / quote handler — facadelightingdubai.com

   Hosting rewrites POST /api/contact to this function (see firebase.json:
   functionId "contact", region us-central1 — do not rename either).

   Lead-safety design, in order:
     1. Honeypot + per-IP throttle (cheap, before any I/O).
     2. Normalise + validate (UAE phone -> E.164, property type -> 5 values).
     3. PERSIST the lead to Firestore `leads/{leadId}` first.
     4. Email the owner over Purelymail SMTP (one retry). A mail failure never
        loses the lead: it is already in Firestore with the error recorded.
     5. Optional acknowledgement to the lead, best effort.
     6. Always answer JSON: { ok: true, leadId, step, emailed } or
        { ok: false, error }.

   Contract (JSON or form-encoded body):
     Required : phone  (any UAE format; +E.164 international also accepted)
     Preferred: propertyType  villa|tower|hotel|commercial|other
     Optional : name, email, area, timeline, message, page, step (1|2),
                leadId (step 2), referrer, utm_source/medium/campaign/term/content
     Honeypot : _honey (also website, _gotcha) — filled => silent 200
     Legacy aliases still accepted: project_type, location, page_source.

   The SMTP password is NEVER in this file. It lives in Google Secret Manager:
     firebase functions:secrets:set PURELYMAIL_PASSWORD
   ========================================================================= */

'use strict';

const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const {
  clean,
  cleanMultiline,
  isEmail,
  normalizePhone,
  normalizePropertyType,
} = require('./lib/normalize');
const { buildOwnerEmail, buildAckEmail } = require('./lib/mail');

/* --- configuration ------------------------------------------------------ */

const PURELYMAIL_PASSWORD = defineSecret('PURELYMAIL_PASSWORD');

const MAILBOX = process.env.SMTP_USER || 'info@facadelightingdubai.com'; // SMTP login + From
const OWNER_EMAIL = process.env.OWNER_EMAIL || MAILBOX; // where notifications go (comma-separated ok)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.purelymail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const OWNER_PHONE = process.env.OWNER_PHONE || '+971 56 568 8660';
const OWNER_WHATSAPP = 'https://wa.me/' + OWNER_PHONE.replace(/\D/g, '');
const FROM = `"Facade Lighting Dubai — Website" <${MAILBOX}>`;

// Set MAIL_DRY_RUN=1 (functions/.env.local) to skip SMTP in the emulator.
const MAIL_DRY_RUN = process.env.MAIL_DRY_RUN === '1';
const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';

const ALLOWED_ORIGINS = new Set([
  'https://facadelightingdubai.com',
  'https://www.facadelightingdubai.com',
  'https://facadelightingdubai.web.app',
  'https://facadelightingdubai.firebaseapp.com',
]);
if (IS_EMULATOR) {
  ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:5002', 'http://127.0.0.1:5002'].forEach((o) =>
    ALLOWED_ORIGINS.add(o)
  );
}

const MAX_LEN = {
  name: 120,
  phone: 40,
  email: 160,
  propertyType: 60,
  area: 160,
  timeline: 120,
  message: 4000,
  page: 500,
  referrer: 500,
  utm: 200,
};

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 5; // submissions per IP per window (step 1 + step 2 both count)
const DEDUPE_WINDOW_MS = 30 * 60 * 1000; // a repeat post from the same phone within 30 min is an update
const LEAD_ID_RE = /^[A-Za-z0-9_-]{8,40}$/;
const HONEYPOT_FIELDS = ['_honey', 'website', '_gotcha', 'fax'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

/* --- Firestore (lazy, tolerant) ----------------------------------------- */

let db = null;
function firestore() {
  if (db) return db;
  try {
    if (!admin.apps.length) admin.initializeApp();
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
  } catch (err) {
    logger.error('Firestore init failed — running without persistence', { message: err.message });
    db = null;
  }
  return db;
}

/* --- per-IP throttle: Firestore-backed, in-memory fallback -------------- */

const memHits = new Map();

function memRateLimited(key, now) {
  const bucket = (memHits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  bucket.push(now);
  memHits.set(key, bucket);
  if (memHits.size > 5000) memHits.clear(); // never let the map grow unbounded
  return bucket.length > RATE_MAX;
}

async function rateLimited(ipHash) {
  const now = Date.now();
  if (memRateLimited(ipHash, now)) return true; // cheap first line per instance
  const store = firestore();
  if (!store) return false;
  try {
    const ref = store.collection('rateLimits').doc(ipHash);
    return await store.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const hits = ((snap.exists && snap.data().hits) || []).filter((t) => now - t < RATE_WINDOW_MS);
      hits.push(now);
      tx.set(ref, { hits, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return hits.length > RATE_MAX;
    });
  } catch (err) {
    // Throttle storage failing must never block a real lead.
    logger.warn('Rate-limit store unavailable, using in-memory only', { message: err.message });
    return false;
  }
}

/* --- SMTP --------------------------------------------------------------- */

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  let pass = '';
  try {
    pass = PURELYMAIL_PASSWORD.value();
  } catch (err) {
    logger.error('PURELYMAIL_PASSWORD secret not available', { message: err.message });
  }
  if (!pass) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // implicit TLS on 465
    auth: { user: MAILBOX, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  return transporter;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Send with one retry. Returns { sent, error, attempts, messageId }. */
async function sendWithRetry(message, label) {
  if (MAIL_DRY_RUN) {
    logger.info(`[dry-run] would send ${label}`, { to: message.to, subject: message.subject });
    return { sent: true, dryRun: true, attempts: 0 };
  }
  const tx = getTransporter();
  if (!tx) return { sent: false, error: 'smtp_not_configured', attempts: 0 };
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await tx.sendMail(message);
      return { sent: true, attempts: attempt, messageId: info && info.messageId };
    } catch (err) {
      lastErr = err;
      logger.warn(`SMTP ${label} attempt ${attempt} failed`, { code: err.code, message: err.message });
      transporter = null; // drop a possibly-broken pooled connection
      if (attempt === 1) await sleep(1500);
    }
  }
  return { sent: false, error: (lastErr && (lastErr.code || lastErr.message)) || 'unknown', attempts: 2 };
}

/* --- request helpers ---------------------------------------------------- */

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  const raw = Buffer.isBuffer(b) ? b.toString('utf8') : typeof b === 'string' ? b : '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    try {
      return Object.fromEntries(new URLSearchParams(raw));
    } catch (_e) {
      return {};
    }
  }
}

function clientIp(req) {
  const xff = req.get('x-forwarded-for');
  return (xff && xff.split(',')[0].trim()) || req.ip || 'unknown';
}

const hashIp = (ip) => crypto.createHash('sha256').update('fld-leads:' + ip).digest('hex').slice(0, 32);

const newLeadId = () => {
  const store = firestore();
  if (store) return store.collection('leads').doc().id;
  return crypto.randomBytes(15).toString('base64url');
};

function pick(body, ...keys) {
  for (const k of keys) {
    if (body[k] != null && body[k] !== '') return body[k];
  }
  return '';
}

/** Build the normalised lead fields from a request body (aliases included). */
function extractFields(body, req) {
  const phoneInput = pick(body, 'phone', 'whatsapp', 'mobile', 'tel');
  const phone = normalizePhone(phoneInput);
  const propertyInput = pick(body, 'propertyType', 'property_type', 'projectType', 'project_type');
  const property = normalizePropertyType(propertyInput);
  const email = clean(pick(body, 'email'), MAX_LEN.email).toLowerCase();

  const utm = {};
  for (const k of UTM_KEYS) {
    const v = clean(body[k] || (body.utm && body.utm[k.replace(/^utm_/, '')]), MAX_LEN.utm);
    if (v) utm[k] = v;
  }
  const page = clean(pick(body, 'page', 'page_source', 'pageSource', 'url'), MAX_LEN.page) || clean(req.get('referer'), MAX_LEN.page);
  // Pull UTMs out of the page URL if the front end did not pass them.
  if (page && /[?&]utm_/.test(page)) {
    try {
      const u = new URL(page, 'https://facadelightingdubai.com');
      for (const k of UTM_KEYS) if (!utm[k] && u.searchParams.get(k)) utm[k] = clean(u.searchParams.get(k), MAX_LEN.utm);
    } catch (_) {
      /* ignore */
    }
  }

  return {
    phone: phone.e164,
    phoneRaw: phone.raw,
    phoneValid: phone.valid,
    phoneUae: phone.uae,
    propertyType: property.value,
    propertyTypeRaw: clean(propertyInput, MAX_LEN.propertyType),
    name: clean(pick(body, 'name', 'fullName', 'full_name'), MAX_LEN.name),
    email,
    emailValid: email ? isEmail(email) : false,
    area: clean(pick(body, 'area', 'location', 'emirate', 'community'), MAX_LEN.area),
    timeline: clean(pick(body, 'timeline', 'timeframe', 'when'), MAX_LEN.timeline),
    message: cleanMultiline(pick(body, 'message', 'details', 'project_details', 'notes'), MAX_LEN.message),
    page,
    referrer: clean(pick(body, 'referrer', 'referer', 'ref'), MAX_LEN.referrer),
    utm,
  };
}

/** Strip empty/undefined values so a step-2 merge never blanks step-1 data. */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

const json = (res, status, payload) => res.status(status).json(payload);

/* --- the function ------------------------------------------------------- */

exports.contact = onRequest(
  {
    region: 'us-central1',
    secrets: [PURELYMAIL_PASSWORD],
    cors: false, // handled explicitly below so we can restrict the origin
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 60, // 2 SMTP attempts (~25s worst case) + Firestore fits comfortably
  },
  async (req, res) => {
    const origin = req.get('origin');
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.set('Access-Control-Max-Age', '86400');
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');

    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    try {
      const body = parseBody(req);

      // Honeypot: real people never fill this in. Return success so bots that
      // check the response cannot tell they were rejected.
      if (HONEYPOT_FIELDS.some((f) => clean(body[f], 100))) {
        logger.info('Honeypot triggered — dropped silently');
        return json(res, 200, { ok: true, leadId: crypto.randomBytes(15).toString('base64url'), step: 1, emailed: true });
      }

      const ip = clientIp(req);
      const ipHash = hashIp(ip);
      if (await rateLimited(ipHash)) {
        logger.warn('Rate limited', { ipHash });
        return json(res, 429, {
          ok: false,
          error: `Too many submissions from your connection. Please call or WhatsApp us on ${OWNER_PHONE}.`,
        });
      }

      const fields = extractFields(body, req);
      const requestedStep = String(body.step || '').trim() === '2' ? 2 : 1;
      const providedLeadId = clean(body.leadId || body.lead_id, 40);

      // Validation: exactly the minimum a human needs to be contactable.
      if (fields.email && !fields.emailValid) {
        return json(res, 400, { ok: false, error: 'That email address does not look valid.' });
      }
      if (requestedStep === 1) {
        if (!fields.phoneRaw && !fields.emailValid) {
          return json(res, 400, { ok: false, error: 'Please enter your phone or WhatsApp number so an engineer can call you.' });
        }
        if (fields.phoneRaw && !fields.phoneValid && !fields.emailValid) {
          return json(res, 400, {
            ok: false,
            error: 'That phone number does not look right. Use a UAE number such as 05x xxx xxxx or +971 5x xxx xxxx.',
          });
        }
      }
      if (!fields.propertyType) fields.propertyType = 'other'; // never reject a lead over a dropdown

      const store = firestore();
      const now = new Date();
      const leadsCol = store ? store.collection('leads') : null;

      // Find the step-1 record this post belongs to:
      //   a) by leadId (the two-step contract), else
      //   b) by the same phone within the last 30 minutes (js/cro.js currently
      //      re-posts step 2 without a leadId; this also folds double-submits).
      // Unknown id / no match => a fresh lead. Never rejected.
      let existing = null;
      let leadId = '';
      if (leadsCol && LEAD_ID_RE.test(providedLeadId)) {
        try {
          const snap = await leadsCol.doc(providedLeadId).get();
          if (snap.exists) {
            existing = snap.data();
            leadId = providedLeadId;
          }
        } catch (err) {
          logger.warn('Lookup of step-1 lead failed', { leadId: providedLeadId, message: err.message });
        }
      }
      if (!existing && leadsCol && fields.phoneValid) {
        try {
          const cutoff = new Date(now.getTime() - DEDUPE_WINDOW_MS).toISOString();
          const q = await leadsCol.where('phone', '==', fields.phone).limit(10).get();
          const recent = q.docs
            .map((d) => ({ id: d.id, data: d.data() }))
            .filter((d) => d.data.createdAtIso && d.data.createdAtIso >= cutoff)
            .sort((a, b) => (a.data.createdAtIso < b.data.createdAtIso ? 1 : -1))[0];
          if (recent) {
            existing = recent.data;
            leadId = recent.id;
          }
        } catch (err) {
          logger.warn('Recent-lead lookup by phone failed', { message: err.message });
        }
      }
      const kind = existing ? 'update' : 'new';
      const effectiveStep = existing ? 2 : requestedStep;
      if (!leadId) leadId = newLeadId();

      const stepFields = compact({
        phone: fields.phone,
        phoneRaw: fields.phoneRaw,
        phoneUae: fields.phoneUae,
        propertyType: fields.propertyType,
        propertyTypeRaw: fields.propertyTypeRaw,
        name: fields.name,
        email: fields.emailValid ? fields.email : '',
        area: fields.area,
        timeline: fields.timeline,
        message: fields.message,
        page: fields.page,
        referrer: fields.referrer,
        utm: fields.utm,
      });

      // Merged view used for the email so the owner sees the whole lead.
      const lead = {
        ...(existing || {}),
        ...stepFields,
        id: leadId,
        propertyType:
          stepFields.propertyType && stepFields.propertyType !== 'other'
            ? stepFields.propertyType
            : (existing && existing.propertyType) || stepFields.propertyType || 'other',
      };
      if (existing && existing.phone && !fields.phoneValid) lead.phone = existing.phone; // keep the good one

      /* 1. Persist BEFORE any SMTP attempt --------------------------------- */
      let persisted = false;
      if (leadsCol) {
        try {
          const meta = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStep: effectiveStep,
            ipHash,
            userAgent: clean(req.get('user-agent'), 300),
          };
          if (kind === 'new') {
            await leadsCol.doc(leadId).set({
              ...stepFields,
              ...meta,
              propertyType: lead.propertyType,
              status: 'new',
              step: effectiveStep,
              source: 'website',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAtIso: now.toISOString(),
            });
          } else {
            await leadsCol.doc(leadId).set(
              { ...stepFields, ...meta, propertyType: lead.propertyType, step: 2, phone: lead.phone },
              { merge: true }
            );
          }
          persisted = true;
        } catch (err) {
          logger.error('Firestore write failed — lead will only exist in email', {
            leadId,
            code: err.code,
            message: err.message,
          });
        }
      } else {
        logger.error('Firestore unavailable — lead will only exist in email', { leadId });
      }

      /* 2. Notify the owner (one retry) ----------------------------------- */
      const ownerResult = await sendWithRetry(
        buildOwnerEmail({ lead, kind, from: FROM, to: OWNER_EMAIL, now }),
        'owner notification'
      );

      /* 3. Acknowledge the lead, once, best effort ------------------------- */
      let ackResult = null;
      const ackAlreadySent = existing && existing.emails && existing.emails.ack && existing.emails.ack.sentAt;
      if (lead.email && !ackAlreadySent) {
        ackResult = await sendWithRetry(
          buildAckEmail({ lead, from: FROM, to: lead.email, ownerPhone: OWNER_PHONE, ownerWhatsApp: OWNER_WHATSAPP }),
          'acknowledgement'
        );
      }

      /* 4. Record delivery state (best effort) ----------------------------- */
      if (persisted) {
        const emailKey = kind === 'new' ? 'owner' : 'followUp';
        const patch = {
          [`emails.${emailKey}`]: compact({
            sentAt: ownerResult.sent ? now.toISOString() : '',
            error: ownerResult.sent ? '' : ownerResult.error,
            attempts: ownerResult.attempts,
            dryRun: ownerResult.dryRun,
          }),
          status: ownerResult.sent ? (kind === 'new' ? 'new' : 'updated') : 'email_failed',
        };
        if (ackResult) {
          patch['emails.ack'] = compact({
            sentAt: ackResult.sent ? now.toISOString() : '',
            error: ackResult.sent ? '' : ackResult.error,
          });
        }
        leadsCol
          .doc(leadId)
          .update(patch)
          .catch((err) => logger.warn('Could not record email status', { leadId, message: err.message }));
      }

      /* 5. Respond --------------------------------------------------------- */
      const logPayload = {
        leadId,
        kind,
        step: effectiveStep,
        propertyType: lead.propertyType,
        page: lead.page || '/',
        persisted,
        emailed: ownerResult.sent,
        acked: ackResult ? ackResult.sent : null,
      };
      if (ownerResult.sent || persisted) {
        if (!ownerResult.sent) logger.error('LEAD SAVED BUT OWNER EMAIL FAILED — check Firestore leads', logPayload);
        else logger.info('Lead handled', logPayload);
        return json(res, 200, { ok: true, leadId, step: effectiveStep, emailed: ownerResult.sent });
      }

      // Nothing worked: tell the visitor honestly so they use phone/WhatsApp.
      logger.error('LEAD LOST — neither Firestore nor SMTP succeeded', logPayload);
      return json(res, 502, {
        ok: false,
        error: `We could not receive your request just now. Please call or WhatsApp us on ${OWNER_PHONE}.`,
        leadId,
      });
    } catch (err) {
      logger.error('Unhandled error in contact handler', { message: err.message, stack: err.stack });
      return json(res, 500, {
        ok: false,
        error: `Something went wrong on our side. Please call or WhatsApp us on ${OWNER_PHONE}.`,
      });
    }
  }
);
