/**
 * CRO site-wide injection
 * - Header: phone link + "Get Free Quote" button (desktop)
 * - Sticky mobile CTA bar (Call / WhatsApp / Quote)
 * - Floating WhatsApp button
 * - /js/cro.js loader (lead-form AJAX + conversion event tracking)
 * - Phone number consistency (+971 56 568 8660 everywhere)
 *
 * Pure string edits — never reserializes the DOM, so SEO markup is untouched.
 * Idempotent: skips any page that already contains the injected markers.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PHONE_DISPLAY = '+971 56 568 8660';
const PHONE_TEL = '+971565688660';
const WA_URL = 'https://wa.me/971565688660?text=Hello%2C%20I%27d%20like%20a%20free%20facade%20lighting%20assessment%20for%20my%20building.';

const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';

const HEADER_CTA = `<div class="header-cta"><a href="tel:${PHONE_TEL}" class="header-phone">${PHONE_SVG}<span>${PHONE_DISPLAY}</span></a><a href="/contact/#quote-form" class="btn btn-primary btn-header"><span>Get Free Quote</span></a></div>\n      `;

const FLOATERS = `  <!-- CRO: floating WhatsApp + sticky mobile CTA bar -->
  <a href="${WA_URL}" class="whatsapp-float" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${WA_SVG}</a>
  <nav class="mobile-cta-bar" aria-label="Quick contact">
    <a href="tel:${PHONE_TEL}" class="cta-call">${PHONE_SVG}<span>Call</span></a>
    <a href="${WA_URL}" class="cta-whatsapp" target="_blank" rel="noopener">${WA_SVG}<span>WhatsApp</span></a>
    <a href="/contact/#quote-form" class="cta-quote"><span>Get Free Quote</span></a>
  </nav>
`;

const CRO_SCRIPT = '<script src="/js/cro.js" defer></script>';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

let stats = { headerCta: 0, floaters: 0, croJs: 0, phoneFix: 0, skipped: 0, total: 0 };

for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  stats.total++;

  // 1. Phone consistency (old placeholder mobile number in schema)
  if (html.includes('+971501234567')) {
    html = html.split('+971501234567').join(PHONE_TEL);
    stats.phoneFix++;
  }

  // 2. Header CTA before the mobile toggle button
  if (!html.includes('header-cta') && html.includes('<button class="mobile-toggle"')) {
    html = html.replace('<button class="mobile-toggle"', HEADER_CTA + '<button class="mobile-toggle"');
    stats.headerCta++;
  }

  // 3. Floating WhatsApp + sticky mobile bar, before closing body
  if (!html.includes('mobile-cta-bar') && html.includes('</body>')) {
    html = html.replace('</body>', FLOATERS + '</body>');
    stats.floaters++;
  }

  // 4. cro.js loader
  if (!html.includes('/js/cro.js') && html.includes('</body>')) {
    html = html.replace('</body>', '  ' + CRO_SCRIPT + '\n</body>');
    stats.croJs++;
  }

  if (html !== original) fs.writeFileSync(file, html);
  else stats.skipped++;
}

console.log(JSON.stringify(stats, null, 2));
