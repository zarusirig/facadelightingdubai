/* Builds css/critical.css — the subset of the site stylesheet needed to paint
   the first screen (header + hero + typography). It is inlined into every page
   so the browser never waits on a network stylesheet to render. The full sheet
   still loads, asynchronously, right behind it. */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'css', 'site.min.css');
const OUT = path.join(__dirname, '..', 'css', 'critical.css');

/* Selectors that can appear in the first viewport on any template. */
const KEEP = [
  /^:root$/, /^html$/, /^body$/, /^\*$/, /^\*,/, /^::selection$/, /^::-\w/,
  /^h[1-6]$/, /^p$/, /^a$/, /^a:/, /^img$/, /^ul$/, /^ol$/, /^li$/,
  /^strong$/, /^b$/, /^em$/, /^i$/, /^small$/, /^svg$/, /^button$/,
  /^\.container/, /^\.wrap/, /^\.section/, /^\.skip/, /^\.sr-only/, /^\.visually-hidden/,
  /^\.site-header/, /^\.header/, /^\.nav/, /^\.logo/, /^\.menu/, /^\.hamburger/, /^\.mobile-nav/,
  /^\.hero/, /^\.btn/, /^\.button/, /^\.cta/, /^\.eyebrow/, /^\.breadcrumb/,
  /^\.text-/, /^\.highlight/, /^\.badge/, /^\.pill/, /^\.tag/,
  /^\.page-hero/, /^\.inner-hero/, /^\.trust/, /^\.reveal/, /^\.fade/,
  /^\.whatsapp-float/, /^\.mobile-cta-bar/, /^\.scroll-progress/,
];

const isCritical = (selectorList) =>
  selectorList.split(',').some((sel) => {
    const s = sel.trim();
    return KEEP.some((re) => re.test(s));
  });

/* Split a stylesheet into top-level chunks, respecting nested braces and strings. */
function chunks(css) {
  const out = [];
  let depth = 0, start = 0, inStr = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (inStr) { if (c === inStr && css[i - 1] !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { out.push(css.slice(start, i + 1)); start = i + 1; }
    } else if (c === ';' && depth === 0) {           // top-level at-rule, e.g. @charset
      out.push(css.slice(start, i + 1)); start = i + 1;
    }
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

function critical(css) {
  return chunks(css).map((chunk) => {
    const brace = chunk.indexOf('{');
    const prelude = chunk.slice(0, brace).trim();

    /* @font-face and @keyframes must be inline or the first paint uses the
       wrong font / skips the entry animation. @charset stays at the top. */
    if (/^@(font-face|keyframes|-\w+-keyframes|charset|import|namespace)/.test(prelude)) return chunk;

    /* Recurse into conditional groups so their inner rules get filtered too. */
    if (/^@(media|supports|layer|container)/.test(prelude)) {
      const inner = critical(chunk.slice(brace + 1, chunk.lastIndexOf('}')));
      return inner.trim() ? `${prelude}{${inner}}` : '';
    }

    return isCritical(prelude) ? chunk : '';
  }).join('');
}

const src = fs.readFileSync(SRC, 'utf8');
const out = critical(src);
fs.writeFileSync(OUT, out);
console.log(`critical.css  ${out.length} bytes  (${(out.length / src.length * 100).toFixed(1)}% of site.min.css)`);
