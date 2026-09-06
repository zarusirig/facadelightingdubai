/* Re-inlines css/critical.css into every page's <head>.
   optimise-heads.js only inlines critical CSS when it first swaps the old
   stylesheet link; after that the inline block goes stale whenever the SCSS
   changes. Run this after `npm run build:css`. Idempotent. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const critical = fs.readFileSync(path.join(ROOT, 'css', 'critical.css'), 'utf8').trim();
const BLOCK = /<style>@font-face\{font-family:"Satoshi"[\s\S]*?<\/style>/;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

let changed = 0, missing = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  if (!BLOCK.test(before)) { missing++; continue; }
  const after = before.replace(BLOCK, () => `<style>${critical}</style>`);
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
}
console.log(`critical css refreshed : ${changed} files`);
if (missing) console.log(`no inline block found  : ${missing} files`);
