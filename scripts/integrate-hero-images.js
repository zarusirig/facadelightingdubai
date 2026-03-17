#!/usr/bin/env node
/**
 * Insert article-hero-image blocks into inner pages
 * after the article-header div closing tag
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let updatedCount = 0;

// ── All image mappings (same as before) ──
const imageMap = {
  'design': '/assets/images/heroes/design-hero.webp',
  'led-technology': '/assets/images/heroes/led-technology-hero.webp',
  'regulations': '/assets/images/heroes/regulations-hero.webp',
  'installation': '/assets/images/heroes/installation-hero.webp',
  'building-types': '/assets/images/heroes/building-types-hero.webp',
  'cost': '/assets/images/heroes/cost-hero.webp',
  'case-studies': '/assets/images/heroes/case-studies-hero.webp',
  'services': '/assets/images/heroes/services-hero.webp',
  'maintenance': '/assets/images/inline/inline-led-quality.jpg',
  'controls': '/assets/images/technical/dmx-controls.webp',
  'climate': '/assets/images/technical/thermal-management.webp',
  'engineering': '/assets/images/technical/photometric-report.webp',
  'sourcing': '/assets/images/inline/inline-led-quality.jpg',
  'contact': '/assets/images/heroes/services-hero.webp',
  'solutions': '/assets/images/heroes/services-hero.webp',
  'facade-lighting-dubai': '/assets/images/heroes/home-hero.webp',
  'what-is-facade-lighting': '/assets/images/heroes/design-hero.webp',
  'types-of-facade-lighting': '/assets/images/heroes/design-hero.webp',
  'facade-vs-architectural-lighting': '/assets/images/heroes/design-hero.webp',
  'how-to-choose-company': '/assets/images/heroes/services-hero.webp',
  'faq': '/assets/images/heroes/services-hero.webp',
  'contractors-suppliers': '/assets/images/heroes/installation-hero.webp',
  'developer-compliance': '/assets/images/technical/al-safat.webp',

  // Building types
  'building-types/villa': '/assets/images/building-types/villa-hero.webp',
  'building-types/hotel': '/assets/images/building-types/hotel-hero.webp',
  'building-types/commercial-tower': '/assets/images/building-types/commercial-tower-hero.webp',
  'building-types/mosque': '/assets/images/building-types/mosque-hero.webp',
  'building-types/retail-mall': '/assets/images/building-types/retail-mall-hero.webp',

  // Areas
  'areas': '/assets/images/areas/downtown-hero.webp',
  'areas/marina-jbr': '/assets/images/areas/marina-jbr-hero.webp',
  'areas/downtown-business-bay': '/assets/images/areas/downtown-hero.webp',
  'areas/palm-bluewaters': '/assets/images/areas/palm-hero.webp',
  'areas/difc-city-walk': '/assets/images/areas/difc-hero.webp',
  'areas/emirates-dubai-hills': '/assets/images/areas/emirates-hills-hero.webp',

  // Case studies
  'case-studies/burj-khalifa': '/assets/images/case-studies/case-study-1-hero.webp',
  'case-studies/cayan-tower': '/assets/images/case-studies/case-study-2-hero.webp',
  'case-studies/dubai-marina': '/assets/images/case-studies/case-study-3-hero.webp',
  'case-studies/dubai-skyline': '/assets/images/case-studies/case-study-4-hero.webp',

  // Specialty
  'specialty': '/assets/images/specialty/media-facade.webp',
  'specialty/media-facades': '/assets/images/specialty/media-facade.webp',
  'specialty/pixel-mapping': '/assets/images/specialty/pixel-mapping.webp',
  'specialty/kinetic-responsive': '/assets/images/specialty/kinetic-responsive.webp',
  'specialty/dynamic-interactive': '/assets/images/specialty/dynamic-interactive.webp',
  'specialty/perforated-glass': '/assets/images/specialty/minimalist-trends.webp',

  // Trends
  'trends': '/assets/images/specialty/sustainable.webp',
  'trends/arabic-heritage': '/assets/images/specialty/arabic-heritage.webp',
  'trends/minimalist': '/assets/images/specialty/minimalist-trends.webp',
  'trends/sustainable': '/assets/images/specialty/sustainable.webp',
  'trends/villa-ideas': '/assets/images/specialty/villa-ideas.webp',

  // Node-level pages by last segment
  'wall-washing': '/assets/images/technical/wall-washing.webp',
  'grazing': '/assets/images/technical/grazing.webp',
  'accent-spotlighting': '/assets/images/technical/accent-spot.webp',
  'color-temperature': '/assets/images/technical/color-temperature.webp',
  'facade-materials': '/assets/images/heroes/design-hero.webp',
  'layered-techniques': '/assets/images/heroes/design-hero.webp',
  'modern-trends': '/assets/images/specialty/minimalist-trends.webp',
  'ip-rating-comparison': '/assets/images/technical/ip-rating.webp',
  'dubai-grade': '/assets/images/technical/thermal-management.webp',
  'specifications': '/assets/images/technical/ip-rating.webp',
  'led-vs-traditional': '/assets/images/technical/retrofit-vs-new.webp',
  'linear': '/assets/images/technical/wall-washing.webp',
  'rgb-rgbw': '/assets/images/technical/dmx-controls.webp',
  'al-safat': '/assets/images/technical/al-safat.webp',
  'compliance-checklist': '/assets/images/technical/al-safat.webp',
  'dcd-noc': '/assets/images/technical/al-safat.webp',
  'dewa': '/assets/images/technical/al-safat.webp',
  'esma': '/assets/images/technical/al-safat.webp',
  'permit-process': '/assets/images/technical/al-safat.webp',
  'commissioning': '/assets/images/inline/inline-focusing.jpg',
  'electrical-infrastructure': '/assets/images/inline/inline-wiring.jpg',
  'structural-assessment': '/assets/images/inline/inline-mounting.jpg',
  'high-rise': '/assets/images/heroes/installation-hero.webp',
  'retrofit-vs-new': '/assets/images/technical/retrofit-vs-new.webp',
  'annual-inspection': '/assets/images/inline/inline-led-quality.jpg',
  'cleaning-schedule': '/assets/images/inline/inline-led-quality.jpg',
  'dmx-troubleshooting': '/assets/images/technical/dmx-controls.webp',
  'led-driver-failure': '/assets/images/inline/inline-led-quality.jpg',
  'replace-vs-repair': '/assets/images/inline/inline-before-after.jpg',
  'dali': '/assets/images/technical/dmx-controls.webp',
  'dmx512': '/assets/images/technical/dmx-controls.webp',
  'dmx-vs-dali': '/assets/images/technical/dmx-controls.webp',
  'smart-iot': '/assets/images/technical/dmx-controls.webp',
  'installation-breakdown': '/assets/images/technical/roi-analysis.webp',
  'maintenance-budget': '/assets/images/technical/roi-analysis.webp',
  'project-budgeting': '/assets/images/technical/roi-analysis.webp',
  'roi-analysis': '/assets/images/technical/roi-analysis.webp',
  'digital-twin': '/assets/images/technical/photometric-report.webp',
  'photometric-reporting': '/assets/images/technical/photometric-report.webp',
  'tender-template': '/assets/images/technical/photometric-report.webp',
  'voltage-drop': '/assets/images/inline/inline-wiring.jpg',
  'wind-load': '/assets/images/inline/inline-mounting.jpg',
  'import-compliance': '/assets/images/inline/inline-led-quality.jpg',
  'product-evaluation': '/assets/images/inline/inline-led-quality.jpg',
  'brands': '/assets/images/inline/inline-led-quality.jpg',
  'thermal-management': '/assets/images/technical/thermal-management.webp',
  'coastal-vs-inland': '/assets/images/technical/thermal-management.webp',
  'sandstorm-protection': '/assets/images/technical/sandstorm-protection.webp',
  'uv-salt-spray': '/assets/images/technical/sandstorm-protection.webp',
  'consultation': '/assets/images/heroes/services-hero.webp',
  'emergency-repair': '/assets/images/inline/inline-before-after.jpg',
  'maintenance-programs': '/assets/images/inline/inline-led-quality.jpg',
  'uae': '/assets/images/areas/downtown-hero.webp',
  'emaar': '/assets/images/technical/al-safat.webp',
  'dda-community': '/assets/images/technical/al-safat.webp',
  'modifications': '/assets/images/technical/al-safat.webp',
  'best-for-dubai-weather': '/assets/images/technical/thermal-management.webp',
  'facade-vs-landscape': '/assets/images/heroes/design-hero.webp',
  'installation-timeline': '/assets/images/heroes/installation-hero.webp',
  'permit-required': '/assets/images/technical/al-safat.webp',
  'worth-the-investment': '/assets/images/technical/roi-analysis.webp',
};

const defaultImage = '/assets/images/heroes/home-hero.webp';

function getPagePath(filePath) {
  return filePath.replace(ROOT + '/', '').replace('/index.html', '');
}

function getImageForPage(pagePath) {
  if (imageMap[pagePath]) return imageMap[pagePath];
  const lastSegment = pagePath.split('/').pop();
  if (imageMap[lastSegment]) return imageMap[lastSegment];
  const parent = pagePath.split('/')[0];
  if (imageMap[parent]) return imageMap[parent];
  return defaultImage;
}

function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.agents', '.claude', 'scripts', 'prompts'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHtmlFiles(fullPath));
    else if (entry.name === 'index.html') results.push(fullPath);
  }
  return results;
}

const HOMEPAGE = path.join(ROOT, 'index.html');
const files = findHtmlFiles(ROOT).filter(f => f !== HOMEPAGE);

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  const pagePath = getPagePath(filePath);

  // Skip privacy policy
  if (pagePath === 'privacy-policy') continue;

  // Skip if already has article-hero-image
  if (html.includes('article-hero-image')) continue;

  // Must have article-header
  if (!html.includes('article-header')) continue;

  const imagePath = getImageForPage(pagePath);

  // Extract alt from title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const altText = titleMatch
    ? titleMatch[1].replace(/ \| Facade Lighting Dubai/g, '').replace(/&amp;/g, '&').trim()
    : 'Facade lighting in Dubai';

  // Find the closing </div> of article-header
  // The pattern is: <div class="article-header">...content...</div>
  const headerStart = html.indexOf('<div class="article-header">');
  if (headerStart === -1) continue;

  // Find the matching closing </div> — count nesting
  let depth = 0;
  let i = headerStart;
  let headerEnd = -1;

  while (i < html.length) {
    if (html.substring(i, i + 4) === '<div') {
      depth++;
      i += 4;
    } else if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) {
        headerEnd = i + 6;
        break;
      }
      i += 6;
    } else {
      i++;
    }
  }

  if (headerEnd === -1) continue;

  const heroBlock = `\n\n          <div class="article-hero-image">\n            <img src="${imagePath}" alt="${altText}" width="1600" height="900" loading="eager">\n          </div>`;

  html = html.substring(0, headerEnd) + heroBlock + html.substring(headerEnd);

  fs.writeFileSync(filePath, html, 'utf8');
  updatedCount++;
}

console.log(`Hero images inserted: ${updatedCount} pages.`);
