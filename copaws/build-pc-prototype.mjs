import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const source = readFileSync(root + (existsSync(root + 'copaws-owner-demo.html') ? 'copaws-owner-demo.html' : 'index.html'), 'utf8');
// Share the approved interaction engine; never edit the generated PC HTML manually.
const html = source.replace('<title>Copaws Interactive Prototype</title>', '<title>Copaws PC Prototype</title>')
  .replace('</head>', '<link rel="stylesheet" href="assets/copaws-pc.css"></head>')
  .replace('</body>', '<script src="assets/copaws-pc.js"></script></body>');
writeFileSync(root + 'pc.html', html);
