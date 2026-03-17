#!/usr/bin/env node
/**
 * Integrate generated images into all HTML pages:
 * 1. Add hero background images to seed/section pages
 * 2. Add article-hero-image blocks to inner pages
 * 3. Add OG image meta tags where missing
 * 4. Update homepage hero to use new high-quality image
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let updatedCount = 0;

// ── Image mapping: page path → hero image ──
const heroImageMap = {
  // Core seed pages
  'design': '/assets/images/heroes/design-hero.webp',
  'led-technology': '/assets/images/heroes/led-technology-hero.webp',
  'regulations': '/assets/images/heroes/regulations-hero.webp',
  'installation': '/assets/images/heroes/installation-hero.webp',
  'building-types': '/assets/images/heroes/building-types-hero.webp',
  'cost': '/assets/images/heroes/cost-hero.webp',
  'case-studies': '/assets/images/heroes/case-studies-hero.webp',
  'services': '/assets/images/heroes/services-hero.webp',

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
};

// ── Inline article images: topic keyword → image path ──
const inlineImageMap = {
  'wall-washing': '/assets/images/technical/wall-washing.webp',
  'grazing': '/assets/images/technical/grazing.webp',
  'accent-spotlighting': '/assets/images/technical/accent-spot.webp',
  'color-temperature': '/assets/images/technical/color-temperature.webp',
  'ip-rating': '/assets/images/technical/ip-rating.webp',
  'dmx': '/assets/images/technical/dmx-controls.webp',
  'dali': '/assets/images/technical/dmx-controls.webp',
  'dmx-vs-dali': '/assets/images/technical/dmx-controls.webp',
  'thermal-management': '/assets/images/technical/thermal-management.webp',
  'sandstorm-protection': '/assets/images/technical/sandstorm-protection.webp',
  'photometric-reporting': '/assets/images/technical/photometric-report.webp',
  'retrofit-vs-new': '/assets/images/technical/retrofit-vs-new.webp',
  'al-safat': '/assets/images/technical/al-safat.webp',
  'roi-analysis': '/assets/images/technical/roi-analysis.webp',
  'smart-iot': '/assets/images/technical/dmx-controls.webp',
  'dubai-grade': '/assets/images/technical/thermal-management.webp',
  'specifications': '/assets/images/technical/ip-rating.webp',
  'led-vs-traditional': '/assets/images/technical/retrofit-vs-new.webp',
  'linear': '/assets/images/technical/wall-washing.webp',
  'rgb-rgbw': '/assets/images/technical/dmx-controls.webp',
  'commissioning': '/assets/images/inline/inline-focusing.jpg',
  'electrical-infrastructure': '/assets/images/inline/inline-wiring.jpg',
  'structural-assessment': '/assets/images/inline/inline-mounting.jpg',
  'high-rise': '/assets/images/heroes/installation-hero.webp',
  'annual-inspection': '/assets/images/inline/inline-led-quality.jpg',
  'cleaning-schedule': '/assets/images/inline/inline-led-quality.jpg',
  'dmx-troubleshooting': '/assets/images/technical/dmx-controls.webp',
  'led-driver-failure': '/assets/images/inline/inline-led-quality.jpg',
  'replace-vs-repair': '/assets/images/inline/inline-before-after.jpg',
  'compliance-checklist': '/assets/images/technical/al-safat.webp',
  'dcd-noc': '/assets/images/technical/al-safat.webp',
  'dewa': '/assets/images/technical/al-safat.webp',
  'esma': '/assets/images/technical/al-safat.webp',
  'permit-process': '/assets/images/technical/al-safat.webp',
  'installation-breakdown': '/assets/images/technical/roi-analysis.webp',
  'maintenance-budget': '/assets/images/technical/roi-analysis.webp',
  'project-budgeting': '/assets/images/technical/roi-analysis.webp',
  'digital-twin': '/assets/images/technical/photometric-report.webp',
  'tender-template': '/assets/images/technical/photometric-report.webp',
  'voltage-drop': '/assets/images/inline/inline-wiring.jpg',
  'wind-load': '/assets/images/inline/inline-mounting.jpg',
  'import-compliance': '/assets/images/inline/inline-led-quality.jpg',
  'product-evaluation': '/assets/images/inline/inline-led-quality.jpg',
  'brands': '/assets/images/inline/inline-led-quality.jpg',
};

// ── Fallback images by parent directory ──
const fallbackByParent = {
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
  'specialty': '/assets/images/specialty/media-facade.webp',
  'trends': '/assets/images/specialty/sustainable.webp',
  'areas': '/assets/images/areas/downtown-hero.webp',
  'faq': '/assets/images/heroes/services-hero.webp',
  'developer-compliance': '/assets/images/technical/al-safat.webp',
};

// ── Default for standalone pages ──
const defaultImage = '/assets/images/heroes/home-hero.webp';

function getPagePath(filePath) {
  return filePath
    .replace(ROOT + '/', '')
    .replace('/index.html', '')
    .replace('index.html', '');
}

function getImageForPage(pagePath) {
  // Direct match
  if (heroImageMap[pagePath]) return heroImageMap[pagePath];

  // Match by last segment (node pages)
  const lastSegment = pagePath.split('/').pop();
  if (inlineImageMap[lastSegment]) return inlineImageMap[lastSegment];

  // Fallback by parent directory
  const parent = pagePath.split('/')[0];
  if (fallbackByParent[parent]) return fallbackByParent[parent];

  return defaultImage;
}

function getAltText(pagePath, html) {
  // Extract from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    return titleMatch[1].replace(/ \| Facade Lighting Dubai/g, '').replace(/&amp;/g, '&').trim();
  }
  return 'Facade lighting in Dubai';
}

// ── Find all HTML files ──
function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.agents', '.claude', 'scripts', 'prompts'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name === 'index.html') {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findHtmlFiles(ROOT);

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  const pagePath = getPagePath(filePath);
  const imagePath = getImageForPage(pagePath);
  const altText = getAltText(pagePath, html);
  let modified = false;

  // === HOMEPAGE: update hero background ===
  if (pagePath === '' || pagePath === 'index.html') {
    if (html.includes("url('/assets/images/home-hero.webp')")) {
      html = html.replace(
        "url('/assets/images/home-hero.webp')",
        "url('/assets/images/heroes/home-hero.webp')"
      );
      modified = true;
    }
    // Add OG image if missing
    if (!html.includes('og:image')) {
      html = html.replace(
        '<meta property="og:locale" content="en_US">',
        '<meta property="og:locale" content="en_US">\n  <meta property="og:image" content="https://facadelightingdubai.com/assets/images/og/facade-lighting-dubai-og.jpg">'
      );
      modified = true;
    }
  }

  // === INNER PAGES: Add article-hero-image after article-header ===
  if (pagePath !== '' && pagePath !== 'index.html') {

    // Add hero image after the breadcrumb + article-header section if not already present
    if (!html.includes('article-hero-image') && !html.includes('privacy-policy')) {

      // Pattern 1: After closing </header> of article-header
      const articleHeaderEnd = html.indexOf('</div>', html.indexOf('article-header'));

      // Pattern 2: Inject after the article-header intro paragraph
      // Find the article-header closing or the first <h2 in article-content
      if (html.includes('article-header')) {
        // Insert after the article-header div closes
        const headerDivRegex = /(<div class="article-header">[\s\S]*?<\/div>\s*(?:<\/div>\s*)?)/;
        const match = html.match(headerDivRegex);

        if (match) {
          const insertAfter = match[0];
          const heroBlock = `\n        <div class="article-hero-image">\n          <img src="${imagePath}" alt="${altText}" width="1600" height="900" loading="eager">\n        </div>\n`;

          // Only insert if this exact image block doesn't exist
          if (!html.includes(imagePath)) {
            html = html.replace(insertAfter, insertAfter + heroBlock);
            modified = true;
          }
        }
      }
    }

    // Add OG image meta if missing
    if (!html.includes('og:image') && imagePath) {
      const ogImageUrl = 'https://facadelightingdubai.com' + imagePath;
      if (html.includes('og:locale')) {
        html = html.replace(
          '<meta property="og:locale" content="en_US">',
          '<meta property="og:locale" content="en_US">\n  <meta property="og:image" content="' + ogImageUrl + '">'
        );
        modified = true;
      } else if (html.includes('og:site_name')) {
        html = html.replace(
          /<meta property="og:site_name" content="Facade Lighting Dubai">/,
          '<meta property="og:site_name" content="Facade Lighting Dubai">\n  <meta property="og:image" content="' + ogImageUrl + '">'
        );
        modified = true;
      }
    }

    // Add twitter:image if missing
    if (!html.includes('twitter:image') && imagePath) {
      const twitterImageUrl = 'https://facadelightingdubai.com' + imagePath;
      if (html.includes('twitter:description')) {
        html = html.replace(
          /(<meta name="twitter:description"[^>]*>)/,
          '$1\n  <meta name="twitter:image" content="' + twitterImageUrl + '">'
        );
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf8');
    updatedCount++;
  }
}

console.log(`Image integration complete: ${updatedCount} pages updated.`);
console.log(`Total pages processed: ${files.length}`);
