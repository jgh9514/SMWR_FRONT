import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'smarteditor2', 'dist');
const publicDir = path.join(root, 'public');
const dest = path.join(publicDir, 'smarteditor2');

if (!fs.existsSync(src)) {
  console.warn('[copy-smarteditor] smarteditor2 dist not found, skip');
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('[copy-smarteditor] copied to public/smarteditor2');
