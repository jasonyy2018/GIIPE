/**
 * Replace `await fetch(` with `await backendProxyFetch(` in Next.js API route handlers
 * and ensure `import { backendProxyFetch } from '@/lib/proxy-fetch';` exists.
 *
 * Run from repo root: node scripts/apply-backend-proxy-fetch.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..', 'frontend', 'src', 'app', 'api');

const IMPORT_LINE = `import { backendProxyFetch } from '@/lib/proxy-fetch';`;

function collectRouteFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) collectRouteFiles(p, out);
    else if (ent.name === 'route.ts') out.push(p);
  }
  return out;
}

function ensureImport(src) {
  if (src.includes("from '@/lib/proxy-fetch'") || src.includes('from "@/lib/proxy-fetch"')) {
    return src;
  }
  const lines = src.split(/\r?\n/);
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('import ')) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
    return lines.join('\n');
  }
  return `${IMPORT_LINE}\n\n${src}`;
}

function main() {
  const files = collectRouteFiles(apiRoot);
  let changed = 0;
  for (const file of files) {
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes('await fetch(')) continue;

    const next = src.replaceAll('await fetch(', 'await backendProxyFetch(');
    if (next === src) continue;

    let withImport = ensureImport(next);
    fs.writeFileSync(file, withImport, 'utf8');
    changed++;
    console.log('updated:', path.relative(path.join(__dirname, '..'), file));
  }
  console.log(`Done. Updated ${changed} file(s).`);
}

main();
