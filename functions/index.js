/* ============================================================================
   Contact form handler — facadelightingdubai.com

   The site is static HTML on Firebase Hosting, so it cannot send mail itself.
   Hosting rewrites POST /api/contact to this function, which relays the
   enquiry over the domain's own Purelymail SMTP. That means notifications
   arrive from an address covered by the domain's SPF/DKIM/DMARC records
   rather than through a third-party form service.

   The SMTP password is NEVER in this file. It lives in Google Secret Manager
   and is injected at runtime. Set it once with:

     firebase functions:secrets:set PURELYMAIL_PASSWORD
   ========================================================================= */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');

const PURELYMAIL_PASSWORD = defineSecret('PURELYMAIL_PASSWORD');

const MAILBOX = 'info@facadelightingdubai.com';
const SMTP_HOST = 'smtp.purelymail.com';
const SMTP_PORT = 465;

const ALLOWED_ORIGINS = new Set([
  'https://facadelightingdubai.com',
  'https://www.facadelightingdubai.com',
  'https://facadelightingdubai.web.app',
  'https://facadelightingdubai.firebaseapp.com',
]);

// Field name -> label shown in the notification email. Anything not listed
// here is ignored, so a bot cannot inject extra rows into the message.
const FIELDS = {
  name: 'Name',
  phone: 'Phone / WhatsApp',
  email: 'Email',
  project_type: 'Project type',
  location: 'Project location',
  message: 'Project details',
  page_source: 'Submitted from',
};

const MAX_LEN = { name: 120, phone: 40, email: 160, project_type: 60, location: 160, message: 4000, page_source: 300 };

/* --- crude per-instance throttle: enough to blunt a naive flood ---------- */
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const bucket = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  bucket.push(now);
  hits.set(ip, bucket);
  if (hits.size > 5000) hits.clear(); // never let the map grow unbounded
  return bucket.length > MAX_PER_WINDOW;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

// Strip CR/LF so a value can never inject extra SMTP headers.
const headerSafe = (v) => String(v || '').replace(/[\r\n]+/g, ' ').trim();

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

exports.contact = onRequest(
  {
    region: 'us-central1',
    secrets: [PURELYMAIL_PASSWORD],
    cors: false, // handled explicitly below so we can restrict the origin
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    const origin = req.get('origin');
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Honeypot: real people never fill this in. Return success so bots that
    // check the response cannot tell they were rejected.
    if (clean(body._honey, 100)) {
      logger.info('Honeypot triggered — dropped silently');
      return res.status(200).json({ ok: true });
    }

    const ip = req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
    if (rateLimited(ip)) {
      logger.warn('Rate limited', { ip });
      return res.status(429).json({ ok: false, error: 'Too many submissions. Please try again shortly.' });
    }

    const data = {};
    for (const key of Object.keys(FIELDS)) {
      const value = clean(body[key], MAX_LEN[key]);
      if (value) data[key] = value;
    }

    if (!data.name || !data.message) {
      return res.status(400).json({ ok: false, error: 'Please provide your name and project details.' });
    }
    if (!data.phone && !data.email) {
      return res.status(400).json({ ok: false, error: 'Please provide a phone number or an email address.' });
    }
    if (data.email && !isEmail(data.email)) {
      return res.status(400).json({ ok: false, error: 'That email address does not look valid.' });
    }

    const rows = Object.entries(FIELDS)
      .filter(([key]) => data[key])
      .map(([key, label]) => ({ label, value: data[key] }));

    const text = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    const html = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
      .map(
        (r) =>
          `<tr><td style="padding:6px 14px 6px 0;color:#555;vertical-align:top"><strong>${escapeHtml(
            r.label
          )}</strong></td><td style="padding:6px 0">${escapeHtml(r.value).replace(/\n/g, '<br>')}</td></tr>`
      )
      .join('')}</table>`;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true, // implicit TLS on 465
      auth: { user: MAILBOX, pass: PURELYMAIL_PASSWORD.value() },
    });

    const subjectWho = headerSafe(data.name);
    const message = {
      // From must stay on the domain or DMARC fails. The visitor goes in Reply-To.
      from: `"Facade Lighting Dubai — Website" <${MAILBOX}>`,
      to: MAILBOX,
      subject: `New enquiry from ${subjectWho}${data.project_type ? ` — ${headerSafe(data.project_type)}` : ''}`,
      text,
      html,
    };
    if (data.email) {
      message.replyTo = `"${headerSafe(data.name)}" <${headerSafe(data.email)}>`;
    }

    try {
      await transporter.sendMail(message);
      logger.info('Enquiry relayed', { page: data.page_source || '/', hasEmail: Boolean(data.email) });
      return res.status(200).json({ ok: true });
    } catch (err) {
      logger.error('SMTP send failed', { message: err.message });
      return res.status(502).json({ ok: false, error: 'Could not send your message. Please call or WhatsApp us.' });
    }
  }
);
