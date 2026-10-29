import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const m = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'extension', 'manifest.json'), 'utf8')
);
const required = ['manifest_version', 'name', 'version', 'permissions', 'background', 'action'];
for (const k of required)
  if (!(k in m)) {
    console.error('Missing', k);
    process.exit(1);
  }
const assets = [
  'assets/icon16.png',
  'assets/icon32.png',
  'assets/icon48.png',
  'assets/icon128.png',
];
for (const a of assets) {
  if (!fs.existsSync(path.join(__dirname, '..', 'extension', a))) {
    console.error('Missing asset', a);
    process.exit(1);
  }
}
console.log('Manifest OK', m.name, m.version);
