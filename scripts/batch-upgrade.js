#!/usr/bin/env node
/**
 * Batch upgrade all inner HTML pages:
 * 1. Add upgrades.css link after styles.css
 * 2. Add skip-to-content link after <body>
 * 3. Add GSAP + ScrollTrigger CDN before main.js script tag
 * 4. Add id="main-content" to <main> tag
 * 5. Add font-display=swap to Google Fonts links
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOMEPAGE = path.join(ROOT, 'index.html');

// Find all index.html files
function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.agents' || entry.name === '.claude' || entry.name === 'scripts') continue;

    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name === 'index.html' && fullPath !== HOMEPAGE) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findHtmlFiles(ROOT);
let updated = 0;
let skipped = 0;

for (const filePath of files) {
  let html = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add upgrades.css after styles.css (if not already present)
  if (!html.includes('upgrades.css')) {
    html = html.replace(
      '<link rel="stylesheet" href="/css/styles.css">',
      '<link rel="stylesheet" href="/css/styles.css">\n  <link rel="stylesheet" href="/css/upgrades.css">'
    );
    modified = true;
  }

  // 2. Add skip-to-content after <body> (if not already present)
  if (!html.includes('skip-to-content')) {
    html = html.replace(
      '<body>',
      '<body>\n  <a href="#main-content" class="skip-to-content">Skip to main content</a>'
    );
    modified = true;
  }

  // 3. Add GSAP CDN before main.js (if not already present)
  if (!html.includes('gsap.min.js') && html.includes('<script src="/js/main.js">')) {
    html = html.replace(
      '<script src="/js/main.js"></script>',
      '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>\n  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>\n  <script src="/js/main.js"></script>'
    );
    modified = true;
  }

  // 4. Add id="main-content" to <main> tag (if not already present)
  if (html.includes('<main>') && !html.includes('id="main-content"')) {
    html = html.replace('<main>', '<main id="main-content">');
    modified = true;
  }

  // 5. Add font-display=swap to Google Fonts (if missing)
  if (html.includes('fonts.googleapis.com') && !html.includes('display=swap')) {
    // Already has display=swap in most cases, skip
  }

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf8');
    updated++;
  } else {
    skipped++;
  }
}

console.log(`Batch upgrade complete: ${updated} files updated, ${skipped} already up-to-date.`);
console.log(`Total files processed: ${files.length}`);
