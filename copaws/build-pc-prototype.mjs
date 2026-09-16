import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const files = readdirSync(root + 'pc-design').filter(name => name.endsWith('.json'));
if(files.length!==90)throw new Error('Expected all 90 approved PC states');
const screens = Object.fromEntries(files.map(name => [name.slice(0, -5), JSON.parse(readFileSync(root + 'pc-design/' + name, 'utf8'))]));
const data = JSON.stringify(screens).replace(/</g, '\\u003c');
// Approved PC geometry is the source; mobile markup is intentionally not imported.
writeFileSync(root + 'pc.html', `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copaws PC Prototype</title><link rel="icon" href="assets/copaws-a-plan-icon.png">
<link rel="stylesheet" href="assets/copaws-pc-renderer.css"><link rel="stylesheet" href="assets/copaws-pc.css">
</head><body><main id="app" aria-label="Copaws"></main><div id="announcement" role="status" aria-live="polite"></div>
<script id="pc-design-data" type="application/json">${data}</script>
<script src="assets/copaws-pc-renderer.js"></script><script src="assets/copaws-pc-flows.js"></script><script src="assets/copaws-pc-lists.js"></script><script src="assets/copaws-pc.js"></script></body></html>`);
console.log(`Built dedicated PC prototype with ${files.length} Figma states.`);
