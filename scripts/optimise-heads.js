/* Rewrites every page head for Core Web Vitals:
     - drops the three third-party font requests (self-hosted now)
     - inlines the critical CSS, loads the rest asynchronously
     - replaces the Firebase Analytics ES-module chain with a plain GA4 tag
       that is deferred until after load
   Idempotent: running it twice changes nothing. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const V = '20260829';
const critical = fs.readFileSync(path.join(ROOT, 'css', 'critical.css'), 'utf8').trim();

const HEAD_BLOCK = `  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/satoshi-400.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/playfair-var-latin.woff2" crossorigin>
  <style>${critical}</style>
  <link rel="preload" as="style" href="/css/site.min.css?v=${V}" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/site.min.css?v=${V}"></noscript>
`;

const GA_BLOCK = `  <!-- Analytics — GA4.
       gtag.js is 150 KB and none of it is needed to render the page, so it is
       held back until the page has loaded or the visitor interacts, whichever
       comes first. Events fired before then queue in dataLayer and replay when
       it arrives, so nothing is lost. -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-8VYG15GG5B');
    (function () {
      var requested = false;
      function loadGtag() {
        if (requested) return;
        requested = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=G-8VYG15GG5B';
        document.head.appendChild(s);
      }
      function afterLoad() { setTimeout(loadGtag, 1200); }
      if (document.readyState === 'complete') afterLoad();
      else window.addEventListener('load', afterLoad);
      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (evt) {
        window.addEventListener(evt, loadGtag, { once: true, passive: true });
      });
    })();
  </script>
`;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const stats = { fonts: 0, css: 0, ga: 0, files: 0, skipped: [] };

for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  let s = before;

  // --- 1. third-party font requests, all now served from our own origin ---
  const fontLinks = [
    /^[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>[ \t]*\r?\n/gm,
    /^[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">[ \t]*\r?\n/gm,
    /^[ \t]*<link href="https:\/\/api\.fontshare\.com\/[^"]*" rel="stylesheet">[ \t]*\r?\n/gm,
  ];
  for (const re of fontLinks) { if (re.test(s)) stats.fonts++; s = s.replace(re, ''); }

  // --- 2. two blocking stylesheets -> inline critical + one async sheet ---
  const upgrades = /^[ \t]*<link rel="stylesheet" href="\/css\/upgrades\.css[^"]*">[ \t]*\r?\n/m;
  const styles = /^[ \t]*<link rel="stylesheet" href="\/css\/styles\.css[^"]*">[ \t]*\r?\n/m;
  if (styles.test(s)) {
    s = s.replace(upgrades, '').replace(styles, HEAD_BLOCK);
    stats.css++;
  }

  // --- 3. Firebase Analytics module chain -> deferred GA4 ---
  const fbWithComment =
    /^[ \t]*<!--\s*Firebase Initialization\s*-->[ \t]*\r?\n[ \t]*<script type="module">[\s\S]*?<\/script>[ \t]*\r?\n/m;
  const fbBare = /^[ \t]*<script type="module">(?:(?!<\/script>)[\s\S])*?firebasejs[\s\S]*?<\/script>[ \t]*\r?\n/m;
  if (fbWithComment.test(s)) { s = s.replace(fbWithComment, GA_BLOCK); stats.ga++; }
  else if (fbBare.test(s)) { s = s.replace(fbBare, GA_BLOCK); stats.ga++; }
  else if (!s.includes('G-8VYG15GG5B')) {
    // page never had analytics (e.g. 404) — give it the same deferred tag
    const anchor = /^[ \t]*<script src="\/js\/cro\.js[^"]*"[^>]*><\/script>[ \t]*\r?\n/m;
    if (anchor.test(s)) { s = s.replace(anchor, (m) => GA_BLOCK + m); stats.ga++; }
  }

  if (s !== before) { fs.writeFileSync(file, s); stats.files++; }

  // flag anything that still reaches out for a font or Firebase
  if (/fonts\.googleapis\.com|api\.fontshare\.com|firebasejs|css\/styles\.css|css\/upgrades\.css/.test(s)) {
    stats.skipped.push(path.relative(ROOT, file));
  }
}

console.log(`files changed      : ${stats.files}`);
console.log(`font links removed : ${stats.fonts} groups`);
console.log(`css blocks swapped : ${stats.css}`);
console.log(`analytics swapped  : ${stats.ga}`);
if (stats.skipped.length) console.log(`STILL REFERENCING OLD ASSETS:\n  ${stats.skipped.join('\n  ')}`);
else console.log('no page still references the old assets');
