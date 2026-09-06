#!/usr/bin/env node
/**
 * CRO quote upgrade (v2) — site-wide injection
 *
 * What it does to every page (pure string edits, never re-serialises the DOM,
 * idempotent — every edit is guarded by a marker so re-running is a no-op):
 *
 *  1. Replaces the injected `<section class="page-conversion" id="get-quote">`
 *     block with the v2 two-step quote form (property-type chips + name +
 *     WhatsApp/phone, then optional detail step), with a trust strip and a
 *     page-type-aware headline / subhead / button label derived from the URL.
 *  2. Homepage: swaps the `#home-quote-form` for the same v2 form and points
 *     every `/contact/#quote-form` link at the on-page `#quote` panel.
 *  3. Header CTA + sticky mobile bar: "Get Free Quote" -> "Get a Free Quote",
 *     and links to the on-page form (`#get-quote`, or `#quote` on the home page).
 *  4. Article pages: inserts a compact `cta-inline--compact` after the first
 *     paragraph that follows the 2nd `<h2>` inside `.article-content`.
 *  5. Desktop scroll-intent nudge markup (`#quote-nudge`) — behaviour lives in
 *     js/cro.js: desktop only, 60 % depth, once per session, dismissible.
 *  6. Cache-bust: /js/cro.js and /css/site.min.css get `?v=20260905`.
 *  7. Pages that never received the base CRO layer (header CTA, sticky bar,
 *     cro.js loader) get it, in the same markup cro-inject.js emits.
 *
 * Usage:
 *   node scripts/cro-quote-upgrade.js                 # run against the repo
 *   node scripts/cro-quote-upgrade.js --root /tmp/copy # run against a copy
 *   node scripts/cro-quote-upgrade.js --dry-run        # report only, no writes
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const rootArg = args.indexOf('--root');
const ROOT = rootArg !== -1 && args[rootArg + 1] ? path.resolve(args[rootArg + 1]) : path.join(__dirname, '..');

const VERSION = '20260905';
const PHONE_DISPLAY = '+971 56 568 8660';
const PHONE_TEL = '+971565688660';
const WA_URL = 'https://wa.me/971565688660?text=Hello%2C%20I%27d%20like%20a%20free%20facade%20lighting%20assessment%20for%20my%20building.';
const GBP_URL = 'https://www.google.com/maps?cid=11118681450332476342';

/* ---------------------------------------------------------------- icons */
const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
const SHIELD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const GIFT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

/* ------------------------------------------------------ page-type copy */
/**
 * Copy per page type. Every promise here already exists on the site:
 * "free site assessment", "no obligation", "response within one business
 * day", "Al Sa'fat / DEWA / DCD handled". Nothing stronger is invented.
 */
const AREA_NAMES = {
  'al-quoz-design-district': 'Al Quoz &amp; Dubai Design District',
  'deira-creek': 'Deira &amp; Dubai Creek',
  'difc-city-walk': 'DIFC &amp; City Walk',
  'downtown-business-bay': 'Downtown &amp; Business Bay',
  'emirates-dubai-hills': 'Emirates Hills &amp; Dubai Hills',
  'marina-jbr': 'Dubai Marina &amp; JBR',
  'palm-bluewaters': 'Palm Jumeirah &amp; Bluewaters',
};

const BASE = {
  overline: 'Free Site Assessment',
  headline: 'Get a free facade lighting assessment',
  subhead: 'Tell us what we are lighting and where to reach you. An engineer calls within one business day with a fixture approach and a realistic budget range. Free, no obligation.',
  button: 'Request My Free Assessment',
  preselect: '',
  inline: {
    lead: 'Not sure what your facade needs?',
    support: 'A free site assessment gives you a fixture approach and budget range from a licensed electrical contractor.',
    cta: 'Get a Free Assessment',
  },
};

const TYPES = {
  cost: {
    headline: 'Get a line-item facade lighting budget',
    subhead: 'Pick your property type and leave a number. An engineer calls within one business day with a realistic AED range for your building, itemised so you can see where the money goes. Free, no obligation.',
    button: 'Get My Budget Range',
    inline: {
      lead: 'Want these numbers for your own building?',
      support: 'Send the property type and a phone number; an engineer comes back with a line-item budget range within one business day.',
      cta: 'Get My Budget Range',
    },
  },
  regulations: {
    headline: "Get your design checked against Al Sa'fat and DEWA",
    subhead: "Tell us the property type and we will map the Al Sa'fat, DEWA and DCD requirements to your project on the first call, before anything is submitted. Free, no obligation.",
    button: 'Check My Compliance',
    inline: {
      lead: 'Unsure whether your scheme will pass?',
      support: "We handle Al Sa'fat, DEWA and DCD submissions on every project. A free assessment tells you where you stand before you submit.",
      cta: 'Check My Design',
    },
  },
  installation: {
    headline: 'Book an installation assessment',
    subhead: 'Tell us what we are wiring. A licensed electrical fitting contractor assesses the facade, risers and supply, then calls within one business day with a method and budget range. Free, no obligation.',
    button: 'Book My Site Assessment',
    inline: {
      lead: 'Planning an install?',
      support: 'Book a free site assessment. The same licensed team designs, wires and commissions the system under one contract.',
      cta: 'Book an Assessment',
    },
  },
  maintenance: {
    headline: 'Get a facade lighting maintenance assessment',
    subhead: 'Tell us the property type and a number to reach you. An engineer calls within one business day to scope a maintenance or repair plan for the system you already have. Free, no obligation.',
    button: 'Request My Free Assessment',
    inline: {
      lead: 'Fixtures failing or drivers dropping out?',
      support: 'A free assessment scopes the repair or maintenance plan for your existing system. No obligation.',
      cta: 'Get a Free Assessment',
    },
  },
  design: {
    headline: 'Get a free facade lighting design consultation',
    subhead: 'Tell us the property type and where to reach you. A designer-engineer calls within one business day with a lighting concept direction and budget range. Free, no obligation.',
    button: 'Request My Free Consultation',
    inline: {
      lead: 'Want a concept for your own facade?',
      support: 'A free consultation gives you a design direction and a budget range from the team that will also wire it.',
      cta: 'Get a Free Consultation',
    },
  },
  villa: {
    headline: 'Get a free villa facade lighting assessment',
    subhead: 'Tell us about the villa and where to reach you. An engineer calls within one business day with a lighting approach, fixture options and a realistic budget range. Free, no obligation.',
    button: 'Request My Free Assessment',
    preselect: 'villa',
    inline: {
      lead: 'Lighting your own villa?',
      support: 'A free site assessment gives you a fixture approach and budget range for the property, from a licensed electrical contractor.',
      cta: 'Get a Villa Assessment',
    },
  },
  tower: {
    headline: 'Get a free tower facade lighting assessment',
    subhead: 'Tell us about the tower and where to reach you. An engineer calls within one business day with a lighting approach, a control strategy and a budget range. Free, no obligation.',
    button: 'Request My Free Assessment',
    preselect: 'tower',
    inline: {
      lead: 'Specifying a tower facade?',
      support: 'A free assessment covers fixture approach, controls, riser and DEWA implications, with a budget range.',
      cta: 'Get a Tower Assessment',
    },
  },
  hotel: {
    headline: 'Get a free hotel facade lighting assessment',
    subhead: 'Tell us about the property and where to reach you. An engineer calls within one business day with a lighting approach that suits guests, operators and Al Sa\'fat alike, plus a budget range. Free, no obligation.',
    button: 'Request My Free Assessment',
    preselect: 'hotel',
    inline: {
      lead: 'Planning hotel or resort lighting?',
      support: 'A free assessment gives you a fixture approach, controls strategy and budget range for the property.',
      cta: 'Get a Hotel Assessment',
    },
  },
  commercial: {
    headline: 'Get a free commercial facade lighting assessment',
    subhead: 'Tell us about the building and where to reach you. An engineer calls within one business day with a lighting approach and budget range. Free, no obligation.',
    button: 'Request My Free Assessment',
    preselect: 'commercial',
    inline: {
      lead: 'Lighting a commercial building?',
      support: 'A free assessment covers fixture approach, compliance and a realistic budget range for the property.',
      cta: 'Get a Free Assessment',
    },
  },
  area: {
    headline: 'Get a free facade lighting assessment in {AREA}',
    subhead: 'Tell us the property type and where to reach you. A Dubai-based engineer calls within one business day with a fixture approach and budget range for the building. Free, no obligation.',
    button: 'Request My Free Assessment',
    inline: {
      lead: 'Have a building in {AREA}?',
      support: 'A free site assessment gives you a fixture approach and budget range from a licensed Dubai electrical contractor.',
      cta: 'Get a Free Assessment',
    },
  },
  proof: {
    headline: 'Get a free assessment for your own building',
    subhead: 'Tell us the property type and where to reach you. An engineer calls within one business day with a fixture approach and a realistic budget range. Free, no obligation.',
    button: 'Request My Free Assessment',
    inline: {
      lead: 'Want a result like this on your own facade?',
      support: 'A free site assessment gives you a fixture approach and budget range from the team that wires what it designs.',
      cta: 'Get a Free Assessment',
    },
  },
};

function fill(str, area) {
  return str.replace(/\{AREA\}/g, area || 'Dubai');
}

/** Derive the page type from the URL path (relative to site root). */
function pageTypeFor(rel) {
  const p = '/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '');
  const seg = p.split('/').filter(Boolean);
  const top = seg[0] || '';
  const second = seg[1] || '';

  if (top === 'cost') return { key: 'cost' };
  if (top === 'regulations' || top === 'developer-compliance') return { key: 'regulations' };
  if (top === 'installation') return { key: 'installation' };
  if (top === 'maintenance') return { key: 'maintenance' };
  if (top === 'design') return { key: 'design' };
  if (top === 'services') {
    if (second === 'installation' || second === 'electrical-contracting') return { key: 'installation' };
    if (second === 'maintenance-programs' || second === 'emergency-repair') return { key: 'maintenance' };
    if (second === 'design') return { key: 'design' };
    return { key: 'default' };
  }
  if (top === 'building-types') {
    if (second.startsWith('villa')) return { key: 'villa' };
    if (second === 'hotel') return { key: 'hotel' };
    if (second === 'commercial-tower' || second === 'residential-tower' || second === 'mixed-use') return { key: 'tower' };
    if (second === 'retail-mall' || second === 'warehouse-industrial') return { key: 'commercial' };
    return { key: 'default' };
  }
  if (top === 'areas' && AREA_NAMES[second]) return { key: 'area', area: AREA_NAMES[second] };
  if (top === 'case-studies' || top === 'before-and-after') return { key: 'proof' };
  return { key: 'default' };
}

function copyFor(rel) {
  const t = pageTypeFor(rel);
  const src = Object.assign({}, BASE, TYPES[t.key] || {});
  const inline = Object.assign({}, BASE.inline, (TYPES[t.key] || {}).inline || {});
  return {
    key: t.key,
    overline: src.overline,
    headline: fill(src.headline, t.area),
    subhead: fill(src.subhead, t.area),
    button: src.button,
    preselect: src.preselect || '',
    inline: {
      lead: fill(inline.lead, t.area),
      support: fill(inline.support, t.area),
      cta: inline.cta,
    },
  };
}

/* -------------------------------------------------------------- markup */
const CHIPS = [
  ['villa', 'Villa'],
  ['tower', 'Tower'],
  ['hotel', 'Hotel / resort'],
  ['commercial', 'Commercial'],
  ['other', 'Other'],
];

function trustStrip() {
  return `<ul class="quote-trust" aria-label="Why enquire with us">
            <li>${SHIELD_SVG}<span>Licensed electrical fitting contractor <strong>(UNQOOD ALNUJOOM Electrical Fitting Contracting L.L.C)</strong></span></li>
            <li>${STAR_SVG}<span><strong>4.8<span class="quote-trust-stars" aria-hidden="true">&#9733;</span></strong> from <a href="${GBP_URL}" target="_blank" rel="noopener">15 Google reviews</a></span></li>
            <li>${CHECK_SVG}<span>Al Sa'fat &amp; DEWA compliance handled for you</span></li>
            <li>${GIFT_SVG}<span>Free site assessment &middot; no obligation</span></li>
          </ul>`;
}

function quoteForm(opts) {
  const { id, prefix, pageSource, copy } = opts;
  const chips = CHIPS.map(([value, label]) =>
    `<label class="quote-chip"><input type="radio" name="project_type" value="${value}"${copy.preselect === value ? ' checked' : ''}><span>${label}</span></label>`
  ).join('\n                ');

  return `<form class="lead-form page-conversion-form quote-form" id="${id}" action="/api/contact" method="POST" novalidate data-page-type="${copy.key}"${copy.preselect ? ` data-preselect="${copy.preselect}"` : ''} data-cro-quote="v2">
          ${trustStrip()}
          <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;">
          <input type="hidden" name="page_source" value="${pageSource}">
          <div class="quote-step quote-step--1" data-step="1">
            <p class="form-heading"><span class="quote-step-label">Step 1 of 2</span><span class="quote-step-time">About 20 seconds</span></p>
            <fieldset class="quote-chips">
              <legend>What are we lighting?</legend>
              <div class="quote-chip-row">
                ${chips}
              </div>
              <span class="field-error" aria-live="polite"></span>
            </fieldset>
            <div class="form-grid-2">
              <div class="form-field">
                <label for="${prefix}-name">Your name</label>
                <input type="text" id="${prefix}-name" name="name" autocomplete="name" required placeholder="Who should we ask for?" aria-describedby="${prefix}-name-error">
                <span class="field-error" id="${prefix}-name-error" aria-live="polite"></span>
              </div>
              <div class="form-field">
                <label for="${prefix}-phone">WhatsApp / phone</label>
                <input type="tel" id="${prefix}-phone" name="phone" autocomplete="tel" inputmode="tel" required placeholder="+971 5x xxx xxxx" aria-describedby="${prefix}-phone-hint ${prefix}-phone-error">
                <span class="field-hint" id="${prefix}-phone-hint">UAE mobile or international number with country code. We call and WhatsApp this number.</span>
                <span class="field-error" id="${prefix}-phone-error" aria-live="polite"></span>
              </div>
            </div>
            <div class="form-status" role="status" aria-live="polite"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><span>${copy.button}</span></button>
              <p class="form-privacy-note">An engineer calls within one business day. No obligation, no spam.</p>
            </div>
          </div>
          <div class="quote-step quote-step--2" data-step="2" hidden>
            <div class="quote-thanks" role="status" aria-live="polite">
              <p class="quote-step-heading">Thanks<span class="quote-thanks-name-wrap">, <span class="quote-thanks-name">there</span></span> &mdash; we have your number.</p>
              <p>An engineer calls or WhatsApps you within one business day. Prefer to start on WhatsApp now?</p>
              <a class="quote-whatsapp-fallback" href="${WA_URL}" target="_blank" rel="noopener">${WA_SVG}<span>Prefer WhatsApp? Tap here</span></a>
            </div>
            <div class="quote-step-2-fields">
              <p class="form-heading"><span class="quote-step-label">Step 2 of 2 &middot; optional</span><span class="quote-step-time">Makes the first call sharper</span></p>
              <p class="quote-step-2-intro">Add anything that helps us prepare. Skip it if you would rather talk first.</p>
              <div class="form-grid-2">
                <div class="form-field">
                  <label for="${prefix}-location">Area / location <span class="field-optional">(optional)</span></label>
                  <input type="text" id="${prefix}-location" name="location" autocomplete="address-level2" placeholder="e.g. Business Bay, Palm Jumeirah">
                </div>
                <div class="form-field">
                  <label for="${prefix}-timeline">Timeline <span class="field-optional">(optional)</span></label>
                  <select id="${prefix}-timeline" name="timeline">
                    <option value="">When do you need it lit?</option>
                    <option value="As soon as possible">As soon as possible</option>
                    <option value="Within 3 months">Within 3 months</option>
                    <option value="3 to 12 months">3 to 12 months</option>
                    <option value="Planning / budgeting stage">Planning / budgeting stage</option>
                  </select>
                </div>
              </div>
              <div class="form-field">
                <label for="${prefix}-email">Email <span class="field-optional">(optional, for the written proposal)</span></label>
                <input type="email" id="${prefix}-email" name="email" autocomplete="email" inputmode="email" placeholder="name@company.com" aria-describedby="${prefix}-email-error">
                <span class="field-error" id="${prefix}-email-error" aria-live="polite"></span>
              </div>
              <div class="form-field">
                <label for="${prefix}-message">Anything else? <span class="field-optional">(optional)</span></label>
                <textarea id="${prefix}-message" name="message" rows="3" placeholder="Building height, existing lighting, drawings you can share, what prompted the enquiry..."></textarea>
              </div>
              <div class="form-status" role="status" aria-live="polite"></div>
              <div class="quote-step-2-actions">
                <button type="submit" class="btn btn-primary"><span>Send Details</span></button>
                <button type="button" class="quote-skip">Skip &mdash; the call is enough</button>
              </div>
            </div>
            <div class="quote-done" hidden>
              <p class="quote-done-copy">All set. An engineer calls or WhatsApps you within one business day.</p>
              <p class="quote-done-alt">Need it sooner? Call <a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> (Sun&ndash;Thu 08:00&ndash;18:00, Sat 09:00&ndash;14:00).</p>
            </div>
          </div>
        </form>`;
}

function conversionSection(rel, copy) {
  const pageSource = '/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '');
  return `<section class="page-conversion" id="get-quote" aria-labelledby="page-conversion-title" data-cro-quote="v2">
    <div class="container">
      <div class="page-conversion-inner">
        <div class="page-conversion-info">
          <span class="text-overline">${copy.overline}</span>
          <h2 id="page-conversion-title">${copy.headline}</h2>
          <p>${copy.subhead}</p>
          <ul class="page-conversion-points">
            <li>Free evaluation of your facade, electrical setup and regulatory position</li>
            <li>Al Sa'fat, DEWA and DCD compliance mapped and handled for you</li>
            <li>Dubai-grade specification rated for 48&deg;C heat and coastal air</li>
          </ul>
          <div class="page-conversion-contact">
            <a href="tel:${PHONE_TEL}">${PHONE_SVG} ${PHONE_DISPLAY}</a>
            <a class="pcc-whatsapp" href="${WA_URL}" target="_blank" rel="noopener">${WA_SVG} WhatsApp us</a>
          </div>
        </div>
        ${quoteForm({ id: 'page-lead-form', prefix: 'pl', pageSource, copy })}
      </div>
    </div>
  </section>`;
}

function inlineCta(copy) {
  return `\n\n            <aside class="cta-inline cta-inline--compact" aria-label="Free facade lighting assessment" data-cro-inline="v2">
              <p><strong>${copy.inline.lead}</strong> ${copy.inline.support}</p>
              <a href="#get-quote" class="btn btn-primary"><span>${copy.inline.cta}</span></a>
            </aside>`;
}

const NUDGE = `  <!-- CRO v2: desktop scroll-intent nudge (js/cro.js shows it once per session at 60% depth) -->
  <aside class="quote-nudge" id="quote-nudge" aria-label="Free facade lighting assessment" hidden>
    <button type="button" class="quote-nudge-close" aria-label="Dismiss">&times;</button>
    <span class="quote-nudge-eyebrow">Free site assessment</span>
    <p class="quote-nudge-title">Want this worked out for your building?</p>
    <p>Pick a property type, leave a number, and an engineer calls within one business day. No obligation.</p>
    <a href="#get-quote" class="btn btn-primary quote-nudge-cta"><span>Get a Free Quote</span></a>
  </aside>
`;

/* ------------------------------------------------------------- helpers */
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'functions' || entry.name === 'outputs') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const SECTION_RE = /<section class="page-conversion" id="get-quote"[^>]*>[\s\S]*?<\/section>/;

/* Base CRO layer (from scripts/cro-inject.js) for any page that never received it. */
function headerCta(target) {
  return `<div class="header-cta"><a href="tel:${PHONE_TEL}" class="header-phone">${PHONE_SVG}<span>${PHONE_DISPLAY}</span></a><a href="${target}" class="btn btn-primary btn-header"><span>Get a Free Quote</span></a></div>\n      `;
}
function floaters(target) {
  return `  <!-- CRO: floating WhatsApp + sticky mobile CTA bar -->
  <a href="${WA_URL}" class="whatsapp-float" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${WA_SVG}</a>
  <nav class="mobile-cta-bar" aria-label="Quick contact">
    <a href="tel:${PHONE_TEL}" class="cta-call">${PHONE_SVG}<span>Call</span></a>
    <a href="${WA_URL}" class="cta-whatsapp" target="_blank" rel="noopener">${WA_SVG}<span>WhatsApp</span></a>
    <a href="${target}" class="cta-quote"><span>Get a Free Quote</span></a>
  </nav>
`;
}
const HOME_FORM_RE = /<form class="lead-form" id="home-quote-form"[\s\S]*?<\/form>/;

/**
 * Insert the compact CTA after the first </p> that follows the 2nd <h2> of the
 * article body (.article-content, else <main>). If no paragraph sits directly
 * under that heading (tables, glossary lists), fall back to the start of the
 * 3rd <h2>'s block — but only when that h2 opens a block (preceded by a closing
 * tag or a <section> opener), so the aside never lands inside a card.
 */
function insertInlineCta(html, copy) {
  let start = html.indexOf('class="article-content"');
  if (start === -1) start = html.indexOf('<main');
  if (start === -1) return { html, done: false, why: 'no article body' };
  const end = html.indexOf('</main>', start);
  const region = html.slice(start, end === -1 ? undefined : end);

  const h2Re = /<h2(?![^>]*page-conversion-title)[^>]*>/g;
  let m; let second = -1; let third = -1; let n = 0;
  while ((m = h2Re.exec(region))) {
    n += 1;
    if (n === 2) second = m.index;
    if (n === 3) { third = m.index; break; }
  }
  if (second === -1) return { html, done: false, why: 'fewer than 2 h2' };

  const pClose = region.indexOf('</p>', second);
  if (pClose !== -1 && (third === -1 || pClose < third)) {
    const at = start + pClose + '</p>'.length;
    return { html: html.slice(0, at) + inlineCta(copy) + html.slice(at), done: true };
  }
  if (third === -1) return { html, done: false, why: 'no paragraph under 2nd h2' };

  // Fallback: before the 3rd h2's block.
  const before = region.slice(0, third);
  const sectionOpen = before.match(/<section[^>]*>\s*$/);
  if (sectionOpen) {
    const at = start + third - sectionOpen[0].length;
    return { html: html.slice(0, at) + inlineCta(copy) + '\n\n            ' + html.slice(at), done: true };
  }
  if (/<\/[a-z0-9]+>\s*$/i.test(before)) {
    const at = start + third;
    return { html: html.slice(0, at) + inlineCta(copy).replace(/^\n\n/, '') + '\n\n            ' + html.slice(at), done: true };
  }
  return { html, done: false, why: '3rd h2 not at block start' };
}

/* ---------------------------------------------------------------- main */
const stats = {
  total: 0, section: 0, homeForm: 0, baseLayer: 0, ctaCopy: 0, ctaHref: 0, inlineCta: 0,
  nudge: 0, croVersion: 0, cssVersion: 0, unchanged: 0, inlineSkipped: {},
};
const perPage = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const isHome = rel === 'index.html';
  const skipInline = isHome || /^(contact|404\.html|privacy-policy)/.test(rel);
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  const copy = copyFor(rel);
  const changes = [];
  stats.total++;

  // 1. Replace the injected page-conversion section with the v2 two-step form
  if (!html.includes('data-cro-quote="v2"') && SECTION_RE.test(html)) {
    html = html.replace(SECTION_RE, conversionSection(rel, copy));
    stats.section++; changes.push(`section:${copy.key}`);
  }

  // 2. Homepage: same v2 form in the quote panel; point contact links at #quote
  if (isHome && !html.includes('data-cro-quote="v2"') && HOME_FORM_RE.test(html)) {
    html = html.replace(HOME_FORM_RE, quoteForm({ id: 'home-quote-form', prefix: 'hq', pageSource: '/', copy }));
    stats.homeForm++; changes.push('home-form');
  }

  // 2b. Base CRO layer for pages cro-inject.js never touched
  const quoteTarget = html.includes('id="get-quote"') ? '#get-quote'
    : html.includes('id="quote"') ? '#quote'
      : html.includes('id="quote-form"') ? '#quote-form'
        : '/contact/#quote-form';
  if (!html.includes('header-cta') && html.includes('<button class="mobile-toggle"')) {
    html = html.replace('<button class="mobile-toggle"', headerCta(quoteTarget) + '<button class="mobile-toggle"');
    stats.baseLayer++; changes.push('base:header-cta');
  }
  if (!html.includes('mobile-cta-bar') && html.includes('</body>')) {
    html = html.replace('</body>', floaters(quoteTarget) + '</body>');
    stats.baseLayer++; changes.push('base:floaters');
  }
  if (!html.includes('/js/cro.js') && html.includes('</body>')) {
    html = html.replace('</body>', `  <script src="/js/cro.js?v=${VERSION}" defer></script>\n</body>`);
    stats.baseLayer++; changes.push('base:cro-js');
  }

  // 3. Header CTA + sticky bar copy and target
  const before3 = html;
  html = html
    .replace(/(class="btn btn-primary btn-header"><span>)Get Free Quote(<\/span>)/, '$1Get a Free Quote$2')
    .replace(/(class="cta-quote"><span>)Get Free Quote(<\/span>)/, '$1Get a Free Quote$2');
  if (html !== before3) { stats.ctaCopy++; changes.push('cta-copy'); }
  const before3b = html;
  html = html
    .replace(/href="\/contact\/#quote-form"( class="btn btn-primary btn-header")/, `href="${quoteTarget}"$1`)
    .replace(/href="\/contact\/#quote-form"( class="cta-quote")/, `href="${quoteTarget}"$1`);
  if (isHome) html = html.split('href="/contact/#quote-form"').join('href="#quote"');
  if (html !== before3b) { stats.ctaHref++; changes.push(`cta-href:${quoteTarget}`); }

  // 4. Mid-article compact CTA
  if (!skipInline && !html.includes('data-cro-inline="v2"')) {
    const r = insertInlineCta(html, copy);
    if (r.done) { html = r.html; stats.inlineCta++; changes.push('inline-cta'); }
    else stats.inlineSkipped[r.why] = (stats.inlineSkipped[r.why] || 0) + 1;
  }

  // 5. Desktop nudge markup (only where there is an on-page form to send people to)
  if (!html.includes('id="quote-nudge"') && (html.includes('id="get-quote"') || html.includes('id="quote"')) && html.includes('<script src="/js/cro.js')) {
    html = html.replace(/(\s*)<script src="\/js\/cro\.js/, `\n${NUDGE}$1<script src="/js/cro.js`);
    stats.nudge++; changes.push('nudge');
  }

  // 6. Cache-bust cro.js and the stylesheet
  const before6 = html;
  html = html.replace(/src="\/js\/cro\.js(\?v=[^"]*)?"/g, `src="/js/cro.js?v=${VERSION}"`);
  if (html !== before6) { stats.croVersion++; changes.push('cro-v'); }
  const before6b = html;
  html = html.replace(/href="\/css\/site\.min\.css(\?v=[^"]*)?"/g, `href="/css/site.min.css?v=${VERSION}"`);
  if (html !== before6b) { stats.cssVersion++; changes.push('css-v'); }

  if (html !== original) {
    if (!DRY) fs.writeFileSync(file, html);
    perPage.push(`${rel}: ${changes.join(', ')}`);
  } else {
    stats.unchanged++;
  }
}

if (args.includes('--verbose')) console.log(perPage.join('\n'));
console.log(JSON.stringify(Object.assign({ root: ROOT, dryRun: DRY }, stats), null, 2));
