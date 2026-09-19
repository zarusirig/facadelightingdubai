/* Entity + internal-link overhaul driven by the 2026-09-05 GSC analysis
   (see outputs/commercial-keywords-2026-09-05.md):
     1. retire /facade-lighting-dubai/ (0 impressions; Google folds it into /)
     2. diversify the two over-repeated anchor-text footprints
     3. give the homepage contextual inbound links from the top-ranking hubs
     4. cross-link the pages that carry impressions on almost no inbound links
     5. one Organization node (@id #organization) on every page; NAP unified
     6. trim titles that truncate on desktop; reframe /led-technology/
     7. wire the new service pages into nav, sidebars and grids
     8. provider-proof block on the homepage
   Idempotent: running it twice changes nothing. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://facadelightingdubai.com';
const ORG_ID = `${SITE}/#organization`;

// Real Google Business Profile figures as of 2026-09-05 (cid 11118681450332476342).
// UPDATE these whenever the listing's rating/count changes.
const GBP_RATING = '4.8';
const GBP_REVIEWS = '15';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const rel = (f) => path.relative(ROOT, f);
const isPage = (f, p) => rel(f) === p;
const stats = {};
const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&quot;/g, '"')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ').replace(/&#176;/g, '°');
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const jsonBlock = (obj) => `  <script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n  </script>\n`;

/* Insert a paragraph before the first related-pages / cta-banner block, else before </article>. */
function insertBridge(s, html) {
  const anchors = ['<div class="related-pages"', '<section class="related-pages"', '<div class="cta-banner"'];
  for (const a of anchors) {
    const i = s.indexOf(a);
    if (i !== -1) return s.slice(0, i) + html + '\n' + s.slice(i);
  }
  const i = s.indexOf('</article>');
  return i === -1 ? null : s.slice(0, i) + html + '\n' + s.slice(i);
}

/* ---------- static content ---------- */

const HOME_BRIDGES = {
  'regulations/index.html': `Every requirement on this page is easier to meet when the party designing the scheme is also the licensed DEWA electrical contractor submitting it. That is how we work as a <a href="/">facade lighting company in Dubai</a> — design, cabling and the approval file come from one engineering team.`,
  'design/index.html': `Technique is only half of the result; the other half is whether the <a href="/">Dubai facade lighting contractors</a> installing it can hold the aiming angles and beam control the design assumes. We design and install under one contract so nothing is lost between the two.`,
  'led-technology/index.html': `Specifying the right LED system and then sourcing something cheaper defeats the point. As an <a href="/">LED facade lighting supplier and installer in Dubai</a> we hold every fixture we install to the Dubai-Grade standard set out above, with ESMA certification checked before it reaches site.`,
  'installation/index.html': `If you would rather not manage this sequence yourself, <a href="/services/installation/">our facade lighting installation team in Dubai</a> runs it end to end — structural assessment, DEWA-compliant electrical work, rope-access or BMU mounting, and commissioning — with <a href="/">Facade Lighting Dubai</a> carrying the licence and the accountability.`,
  'cost/index.html': `The figures above are only useful if the quote you receive is broken down the same way. As a <a href="/">facade lighting company in Dubai</a> we issue line-item budgets on every proposal, so fixtures, access, electrical work and controls can each be checked against these benchmarks.`,
  'building-types/index.html': `Whatever the building type, <a href="/">Facade Lighting Dubai</a> starts with the same free site assessment: facade materials, orientation, electrical capacity and the specific approvals that apply before a single fixture is proposed.`,
  'sourcing/index.html': `Procurement risk drops sharply when the <a href="/">facade lighting contractor in Dubai</a> who specifies the fixtures is also the one who has to install, commission and warrant them. We source against our own specification and stand behind what arrives on site.`,
  'areas/index.html': `Location changes the specification, but not the process. Wherever the building sits, a <a href="/">Dubai facade lighting company</a> that already knows the master-developer review process and the local corrosion zone will save you a design round — which is why our site assessment starts with the area, not the fixture.`,
};

const CROSSLINKS = {
  'design/index.html': `For the tools behind the photometric work described here, see our guide to <a href="/software/">facade lighting design software: DIALux, AGi32 and Relux</a>. If you are still deciding what belongs on the building and what belongs in the landscape, the <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a> draws the line, and our <a href="/case-studies/">facade lighting case studies</a> show how Dubai landmarks apply these techniques at scale.`,
  'engineering/index.html': `The calculations on this page are normally produced in dedicated photometric software; our <a href="/software/">facade lighting design software comparison</a> covers which tool suits which deliverable.`,
  'engineering/photometric-reporting/index.html': `Choosing the right package for the report matters as much as the settings — see the <a href="/software/">facade lighting design software guide</a> for how DIALux, AGi32 and Relux differ in output and file formats.`,
  'controls/index.html': `Control design is usually modelled alongside the photometric scheme; the <a href="/software/">facade lighting design software guide</a> explains which tools handle DMX and DALI integration natively.`,
  'controls/dmx512/index.html': `DMX channel mapping is easier to plan in the same environment as the photometric model — our <a href="/software/">facade lighting design software comparison</a> sets out which packages support it.`,
  'services/consultation/index.html': `Every consultation deliverable is produced in professional photometric software; our <a href="/software/">facade lighting design software guide</a> explains what you will receive and in which format.`,
  'project-management/index.html': `Design coordination goes faster when everyone works from the same model — see the <a href="/software/">facade lighting design software guide</a> for the file formats architects, engineers and contractors exchange.`,
  'how-to-vet-contractor/index.html': `One quick test of a contractor's engineering depth: ask which photometric package they use and for a sample report. Our <a href="/software/">facade lighting design software guide</a> explains what a credible answer looks like.`,
  'building-types/index.html': `Building type sets the design brief, but district sets the constraints — the <a href="/areas/">facade lighting guides by Dubai area</a> cover master-developer rules and corrosion zones location by location, and our <a href="/case-studies/">facade lighting case studies</a> show each building type lit in practice.`,
  'climate/index.html': `Exposure varies sharply across the city; the <a href="/areas/">facade lighting guides by Dubai area</a> map the coastal and inland corrosion zones district by district.`,
  'developer-compliance/index.html': `Master-developer rules overlap with location-specific ones — see the <a href="/areas/">facade lighting guides by Dubai area</a> for Downtown, Business Bay, Marina, JBR, DIFC and Palm Jumeirah.`,
  'cost/index.html': `Location is one of the largest cost drivers; the <a href="/areas/">facade lighting guides by Dubai area</a> explain why a Marina waterfront tower and a Business Bay tower do not price the same.`,
  'services/index.html': `We work across the city; the <a href="/areas/">facade lighting guides by Dubai area</a> set out the local approval and corrosion considerations for each district, and our <a href="/case-studies/">facade lighting case studies</a> show the results.`,
  'installation/index.html': `Access, corrosion protection and approval routes all change by district — see the <a href="/areas/">facade lighting guides by Dubai area</a> before finalising an installation plan.`,
  'regulations/index.html': `Authority requirements are city-wide, but master-developer and free-zone rules are local — the <a href="/areas/">facade lighting guides by Dubai area</a> cover what applies where.`,
  'types-of-facade-lighting/index.html': `Not everything lit around a building is facade lighting; the <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a> explains where the two disciplines divide.`,
  'what-is-facade-lighting/index.html': `Two common points of confusion are covered separately: the full <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a>, and the short answer in our <a href="/faq/facade-vs-landscape/">facade vs landscape lighting FAQ</a>.`,
  'faq/index.html': `For the most common scope question we hear, see the short <a href="/faq/facade-vs-landscape/">facade vs landscape lighting FAQ</a> or the full <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a>.`,
  'specialty/index.html': `Specialty schemes often sit at the boundary of the two disciplines; the <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a> explains how they are scoped and regulated differently.`,
  'facade-vs-architectural-lighting/index.html': `The other boundary that causes confusion is ground level — see the <a href="/facade-lighting-vs-landscape-lighting/">facade lighting vs landscape lighting comparison</a>.`,
  'facade-lighting-vs-landscape-lighting/index.html': `Want the short version? Our <a href="/faq/facade-vs-landscape/">facade vs landscape lighting FAQ</a> answers the question in a paragraph.`,
  'about/index.html': `To see how this approach plays out on real buildings, read our <a href="/case-studies/">facade lighting case studies</a> of Dubai landmarks.`,
  'led-technology/index.html': `For these systems applied at landmark scale, see our <a href="/case-studies/">facade lighting case studies</a>.`,
};

const TITLES = {
  'index.html': 'Facade Lighting Company in Dubai | Design &amp; Installation',
  'software/index.html': 'Facade Lighting Design Software: DIALux, AGi32 &amp; Relux',
  'installation/index.html': 'Facade Lighting Installation Dubai: Process &amp; Engineering',
  'areas/downtown-business-bay/index.html': 'Facade Lighting Downtown Dubai &amp; Business Bay Guide',
  'sourcing/index.html': 'Facade Lighting Suppliers Dubai: Sourcing &amp; Procurement',
  'building-types/government-institutional/index.html': 'Government Building Facade Lighting in Dubai',
  'areas/marina-jbr/index.html': 'Facade Lighting Dubai Marina &amp; JBR: Waterfront Guide',
  'developer-compliance/damac/index.html': 'DAMAC Facade Lighting Standards &amp; Restrictions',
  'led-technology/ip-rating-comparison/index.html': 'IP65 vs IP67 vs IP68 for Facade Lighting',
  'areas/al-quoz-design-district/index.html': 'Al Quoz &amp; Design District (d3) Facade Lighting Guide',
  'trends/sustainable/index.html': "Sustainable Facade Lighting Dubai: Energy &amp; Al Sa'fat",
  'services/electrical-contracting/index.html': 'Electrical Contractor Dubai | Lighting &amp; Power',
  'led-technology/index.html': 'LED Facade Lighting Systems Dubai: RGBW, Linear &amp; IP67',
};
for (const [f, t] of Object.entries(TITLES)) {
  if (decode(t).length > 58) throw new Error(`title too long for ${f}: ${decode(t).length}`);
}

const LED_H1 = 'LED Facade Lighting Systems for Dubai Buildings: RGBW, Linear and IP67-Rated';
const LED_DESC = 'LED facade lighting systems supplied and installed in Dubai — RGBW, linear and IP67-rated fixtures, Dubai-Grade for 48°C heat and coastal air.';
const LED_CTA = `
          <div class="cta-banner" data-cta="led-supply">
            <div class="cta-content">
              <h3>Need the LED system specified, supplied and installed?</h3>
              <p>We specify Dubai-Grade, ESMA-certified LED facade fixtures, source them against that specification, and install and commission them under one contract. Send us the building and we will return a fixture schedule and budget.</p>
              <a href="#get-quote" class="btn btn-primary">Request an LED Specification</a>
              <p><a href="/services/installation/">See our facade lighting installation service</a></p>
            </div>
          </div>`;

const HOME_PROOF = `
    <!-- ========== LICENSED CONTRACTOR ========== -->
    <section class="home-section" data-block="provider-proof">
      <div class="container">
        <div class="section-header">
          <h2>A Licensed Dubai Contractor, Not a Directory</h2>
          <p>Facade Lighting Dubai is an operating contractor with an office, a licence and a Google listing you can check — not a lead-generation site.</p>
        </div>

        <div class="services-grid">
          <div class="service-item">
            <div class="section-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 21H21M5 21V7L12 3L19 7V21M9 21V15H15V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <h3>Licensed Electrical Fitting Contractor</h3>
            <p>Facade Lighting Dubai is the lighting division of UNQOOD ALNUJOOM Electrical Fitting Contracting L.L.C, a licensed electrical fitting contractor based at Anwaj Building, Meena Bazar, Bur Dubai. The people who design your scheme are the same licensed team that wires it.</p>
          </div>

          <div class="service-item">
            <div class="section-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <h3>Rated ${GBP_RATING} on Google</h3>
            <p>Rated ${GBP_RATING} out of 5 from ${GBP_REVIEWS} Google reviews. <a href="https://www.google.com/maps?cid=11118681450332476342" target="_blank" rel="noopener">Read the reviews on our Google Business Profile</a> — every one is from a client, not a directory.</p>
          </div>

          <div class="service-item">
            <div class="section-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                <path d="M4 10H20M10 4V20" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </div>
            <h3>One Contract, Start to Finish</h3>
            <p><a href="/services/design/">Facade lighting design</a>, DEWA-compliant electrical work, rope-access or BMU <a href="/services/installation/">installation</a>, commissioning and maintenance are delivered under one contract — so there is one party accountable for the result.</p>
          </div>
        </div>
      </div>
    </section>
`;

/* ---------- pull the canonical org node from the homepage (single source of truth) ---------- */

const homePath = path.join(ROOT, 'index.html');
let home = fs.readFileSync(homePath, 'utf8');
const orgMatch = home.match(/<script type="application\/ld\+json">\s*(\{[\s\S]*?"@id": "https:\/\/facadelightingdubai\.com\/#organization"[\s\S]*?\})\s*<\/script>/);
if (!orgMatch) throw new Error('homepage #organization node not found');
let orgObj = JSON.parse(orgMatch[1]);
if (!orgObj.aggregateRating) {
  orgObj.aggregateRating = { '@type': 'AggregateRating', ratingValue: GBP_RATING, reviewCount: GBP_REVIEWS, bestRating: '5', worstRating: '1' };
  home = home.replace(orgMatch[0], `<script type="application/ld+json">\n${JSON.stringify(orgObj, null, 2)}\n  </script>`);
  fs.writeFileSync(homePath, home);
  bump('home:aggregateRating');
}
const FULL_ORG_BLOCK = `<script type="application/ld+json">\n${JSON.stringify(orgObj, null, 2)}\n  </script>`;
const COMPACT_ORG = {
  '@context': 'https://schema.org', '@type': 'Organization', '@id': ORG_ID,
  name: orgObj.name, legalName: orgObj.legalName, alternateName: orgObj.alternateName,
  url: orgObj.url, logo: orgObj.logo.url, telephone: orgObj.telephone, email: orgObj.email,
  address: orgObj.address, sameAs: orgObj.sameAs,
};

/* ---------- ordered file lists for the anchor rotations ---------- */

const files = walk(ROOT).sort();
const CONSULT_RE = /<a href="\/services\/consultation\/">facade lighting consultation in Dubai<\/a>/;
const SERVICES_RE = /<a href="\/services\/">our facade lighting services in Dubai<\/a>/;
const CONSULT_VARIANTS = [
  null,
  '<a href="/services/installation/">facade lighting installation service in Dubai</a>',
  '<a href="/services/design/">facade lighting design service in Dubai</a>',
  '<a href="/">facade lighting company in Dubai</a>',
  '<a href="/services/consultation/">free facade lighting site assessment in Dubai</a>',
];
const SERVICES_VARIANTS = [
  null,
  '<a href="/services/">our Dubai facade lighting services</a>',
  '<a href="/services/design/">our facade lighting design service</a>',
  '<a href="/services/">our facade lighting engineering services</a>',
];
// Rotation index is the file's position among files that carry the anchor (or one of its
// rotated forms), so the assignment is stable across runs.
const carriesConsult = (s) => CONSULT_RE.test(s) || CONSULT_VARIANTS.slice(1).some((v) => s.includes(v));
const carriesServices = (s) => SERVICES_RE.test(s) || SERVICES_VARIANTS.slice(1).some((v) => s.includes(v));
const consultFiles = files.filter((f) => carriesConsult(fs.readFileSync(f, 'utf8')));
const servicesFiles = files.filter((f) => carriesServices(fs.readFileSync(f, 'utf8')));

/* ---------- main pass ---------- */

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let s = before;
  const r = rel(file);

  // 1. retire the pillar
  if (s.includes('<a href="/facade-lighting-dubai/">Complete Guide</a>')) {
    s = s.replace('<a href="/facade-lighting-dubai/">Complete Guide</a>', '<a href="/services/installation/">Installation Service</a>');
    bump('pillar:footer');
  }
  s = s.replace(/<a([^>]*)href="\/facade-lighting-dubai\/[^"]*"/g, () => { bump('pillar:contextual'); return '<a$1href="/"'; });

  // 2. anchor diversification
  const ci = consultFiles.indexOf(file);
  if (ci !== -1 && CONSULT_RE.test(s)) {
    const v = CONSULT_VARIANTS[ci % 5];
    if (v) { s = s.replace(CONSULT_RE, v); bump('anchors:consultation'); }
  }
  const si = servicesFiles.indexOf(file);
  if (si !== -1 && SERVICES_RE.test(s)) {
    const v = SERVICES_VARIANTS[si % 4];
    if (v) { s = s.replace(SERVICES_RE, v); bump('anchors:services'); }
  }

  // 3. homepage bridges
  if (HOME_BRIDGES[r] && !s.includes('data-bridge="home"')) {
    const out = insertBridge(s, `          <p class="contextual-bridge" data-bridge="home">${HOME_BRIDGES[r]}</p>`);
    if (out) { s = out; bump('bridges:home'); }
  }

  // 4. cross-links
  if (CROSSLINKS[r] && !s.includes('data-bridge="crosslink"')) {
    const out = insertBridge(s, `          <p class="contextual-bridge" data-bridge="crosslink">${CROSSLINKS[r]}</p>`);
    if (out) { s = out; bump('bridges:crosslink'); }
  }

  // 5. schema
  s = s.replace(/"publisher"\s*:\s*\{\s*"@type"\s*:\s*"Organization"\s*,\s*"name"\s*:\s*"Facade Lighting Dubai"\s*(?:,\s*"url"\s*:\s*"https:\/\/facadelightingdubai\.com"\s*)?(?:,\s*"address"\s*:\s*\{[^}]*\}\s*)?\}/g,
    () => { bump('schema:publisher'); return `"publisher": { "@id": "${ORG_ID}" }`; });
  if (r === 'contact/index.html') {
    const lb = s.match(/<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "LocalBusiness"[\s\S]*?\}\s*<\/script>/);
    if (lb) { s = s.replace(lb[0], FULL_ORG_BLOCK); bump('schema:contact-localbusiness'); }
  }
  // a definition (not just a publisher reference) carries "name" right after the @id
  if (!new RegExp(`"@id":\\s*"${ORG_ID.replace(/[/.]/g, '\\$&')}"\\s*,\\s*"name"`).test(s)) {
    s = s.replace('</head>', jsonBlock(COMPACT_ORG) + '</head>');
    bump('schema:org-node');
  }
  if (s.includes('class="faq-section"') && !s.includes('"FAQPage"')) {
    const items = [];
    const re = /<button class="faq-question"[^>]*>([\s\S]*?)<\/button>\s*<div class="faq-answer">([\s\S]*?)<\/div>/g;
    let m;
    while ((m = re.exec(s))) items.push({ '@type': 'Question', name: textOf(m[1]), acceptedAnswer: { '@type': 'Answer', text: textOf(m[2]) } });
    if (items.length) {
      s = s.replace('</head>', jsonBlock({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items }) + '</head>');
      bump('schema:faqpage');
    }
  }
  if ((r === 'led-technology/index.html' || r === 'regulations/index.html') && /"@type": "Article"/.test(s)) {
    s = s.replace('"@type": "Article"', '"@type": "TechArticle"'); bump('schema:techarticle');
  }

  // 6. titles
  if (TITLES[r]) {
    const cur = s.match(/<title>([^<]*)<\/title>/);
    if (cur && cur[1] !== TITLES[r]) {
      const old = cur[1];
      s = s.replace(`<title>${old}</title>`, `<title>${TITLES[r]}</title>`);
      s = s.replace(`property="og:title" content="${decode(old)}"`, `property="og:title" content="${decode(TITLES[r])}"`);
      s = s.replace(`property="og:title" content="${old}"`, `property="og:title" content="${TITLES[r]}"`);
      s = s.replace(`name="twitter:title" content="${decode(old)}"`, `name="twitter:title" content="${decode(TITLES[r])}"`);
      s = s.replace(`name="twitter:title" content="${old}"`, `name="twitter:title" content="${TITLES[r]}"`);
      bump('titles');
    }
  }
  if (r === 'led-technology/index.html') {
    if (!s.includes(LED_H1)) { s = s.replace(/<h1([^>]*)>[^<]*<\/h1>/, `<h1$1>${LED_H1}</h1>`); bump('led:h1'); }
    if (!s.includes(LED_DESC)) {
      s = s.replace(/(<meta name="description"\s*content=")[^"]*(")/, `$1${LED_DESC}$2`);
      s = s.replace(/(property="og:description" content=")[^"]*(")/, `$1${LED_DESC}$2`);
      s = s.replace(/(name="twitter:description" content=")[^"]*(")/, `$1${LED_DESC}$2`);
      bump('led:description');
    }
    if (!s.includes('data-cta="led-supply"')) {
      const i = s.indexOf('<div class="article-hero-image">');
      const j = s.indexOf('</div>', i) + '</div>'.length;
      s = s.slice(0, j) + LED_CTA + s.slice(j);
      bump('led:cta');
    }
  }

  // 7. navigation
  if (!s.includes('<a href="/services/installation/">Installation</a><a href="/services/design/">Design</a>') && s.includes('nav-dropdown-menu')) {
    const i = s.indexOf('nav-dropdown-menu');
    const j = s.indexOf('<a href="/services/">Services</a>', i);
    if (j !== -1) {
      const k = j + '<a href="/services/">Services</a>'.length;
      s = s.slice(0, k) + '<a href="/services/installation/">Installation</a><a href="/services/design/">Design</a>' + s.slice(k);
      bump('nav:dropdown');
    }
  }
  if (r === 'services/index.html' && !s.includes('href="/services/installation/" class="related-card"')) {
    s = s.replace('<div class="related-grid">', `<div class="related-grid">
              <a href="/services/installation/" class="related-card">
                <h3>Facade Lighting Installation</h3>
                <p>DEWA-compliant electrical work, rope-access and BMU mounting, and commissioning under one contract.</p>
              </a>
              <a href="/services/design/" class="related-card">
                <h3>Facade Lighting Design Service</h3>
                <p>Concept, photometric simulation, fixture schedule and permit-ready documentation for your building.</p>
              </a>`);
    bump('nav:services-grid');
  }
  if (s.includes('aria-label="Services navigation"') && !s.includes('href="/services/installation/">Installation Service</a>')) {
    s = s.replace(/(aria-label="Services navigation">\s*<a href="\/services\/"[^>]*>Services Overview<\/a>)/,
      '$1<a href="/services/installation/">Installation Service</a><a href="/services/design/">Design Service</a>');
    bump('nav:services-sidebar');
  }
  if (r === 'installation/index.html' && !s.includes('href="/installation/rope-access/"')) {
    s = s.replace('<a href="/installation/">High-Rise Installation</a>', '<a href="/installation/high-rise/">High-Rise Installation</a>\n              <a href="/installation/rope-access/">Rope Access Installation</a>');
    bump('nav:installation-sidebar');
  }
  if (r === 'installation/high-rise/index.html') {
    if (!s.includes('href="/installation/rope-access/">Rope Access Installation</a>')) {
      s = s.replace('href="/installation/high-rise/" class="active">High-Rise Installation</a>', 'href="/installation/high-rise/" class="active">High-Rise Installation</a><a href="/installation/rope-access/">Rope Access Installation</a>');
      bump('nav:high-rise-sidebar');
    }
    if (!s.includes('data-bridge="rope-access"')) {
      const out = insertBridge(s, `                    <p class="contextual-bridge" data-bridge="rope-access">On most occupied towers the practical access method is rope access rather than scaffold or a full BMU programme — see our <a href="/installation/rope-access/">rope access facade lighting installation guide</a> for when it applies and how it is permitted. If you want the work done rather than explained, <a href="/services/installation/">our facade lighting installation service</a> supplies the certified crews and the DEWA-licensed electrical team together.</p>`);
      if (out) { s = out; bump('nav:high-rise-bridge'); }
    }
  }

  // 8. homepage provider-proof block
  if (r === 'index.html' && !s.includes('data-block="provider-proof"')) {
    s = s.replace('    <!-- ========== HOW IT WORKS ========== -->', HOME_PROOF + '\n    <!-- ========== HOW IT WORKS ========== -->');
    bump('home:provider-proof');
  }

  if (s !== before) { fs.writeFileSync(file, s); bump('files-changed'); }
}

/* ---------- non-HTML: directory, firebase.json, sitemap ---------- */

const pillarDir = path.join(ROOT, 'facade-lighting-dubai');
if (fs.existsSync(pillarDir)) { fs.rmSync(pillarDir, { recursive: true }); bump('pillar:dir-removed'); }

const fbPath = path.join(ROOT, 'firebase.json');
const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
fb.hosting.redirects = fb.hosting.redirects || [];
if (!fb.hosting.redirects.some((x) => x.source === '/facade-lighting-dubai{,/**}')) {
  fb.hosting.redirects.push({ source: '/facade-lighting-dubai{,/**}', destination: '/', type: 301 });
  fs.writeFileSync(fbPath, JSON.stringify(fb, null, 4) + '\n');
  bump('firebase:redirect');
}

const smPath = path.join(ROOT, 'sitemap.xml');
let sm = fs.readFileSync(smPath, 'utf8');
const smBefore = sm;
sm = sm.replace(/\s*<url><loc>https:\/\/facadelightingdubai\.com\/facade-lighting-dubai\/<\/loc>.*?<\/url>/s, '');
const entry = (p, pr) => `<url><loc>${SITE}${p}</loc><priority>${pr}</priority><changefreq>monthly</changefreq><lastmod>2026-09-05</lastmod></url>`;
for (const [p, pr] of [['/services/installation/', '0.8'], ['/services/design/', '0.8'], ['/installation/rope-access/', '0.7']]) {
  if (!sm.includes(`<loc>${SITE}${p}</loc>`)) sm = sm.replace('</urlset>', `  ${entry(p, pr)}\n</urlset>`);
}
if (sm !== smBefore) { fs.writeFileSync(smPath, sm); bump('sitemap'); }

console.log(JSON.stringify(stats, null, 2));
if (!Object.keys(stats).length) console.log('No changes.');
