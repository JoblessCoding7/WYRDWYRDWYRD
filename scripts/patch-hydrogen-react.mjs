#!/usr/bin/env node
















import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pnpmStore = path.join(root, 'node_modules', '.pnpm');


const sourcePkg = path.join(root, 'node_modules', 'use-isomorphic-layout-effect');

if (!fs.existsSync(sourcePkg)) {
  console.log('[patch-hydrogen-react] use-isomorphic-layout-effect not found at top level — skipping patch.');
  process.exit(0);
}


let entries;
try {
  entries = fs.readdirSync(pnpmStore);
} catch {
  console.log('[patch-hydrogen-react] No .pnpm directory found — skipping patch.');
  process.exit(0);
}

const hydrogenReactDirs = entries.filter(e =>
  e.startsWith('@shopify+hydrogen-react@')
);

if (hydrogenReactDirs.length === 0) {
  console.log('[patch-hydrogen-react] No @shopify/hydrogen-react instances found — skipping patch.');
  process.exit(0);
}


function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {

    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}


let patched = 0;

for (const dir of hydrogenReactDirs) {
  const bundledNodeModules = path.join(
    pnpmStore,
    dir,
    'node_modules',
    '@shopify',
    'hydrogen-react',
    'dist',
    'node-prod',
    'node_modules',
  );

  if (!fs.existsSync(bundledNodeModules)) {
    continue;
  }

  const targetPkg = path.join(bundledNodeModules, 'use-isomorphic-layout-effect');


  copyDir(sourcePkg, targetPkg);



  const pkgJsonPath = path.join(targetPkg, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (!pkgJson.exports) {
      pkgJson.exports = {
        '.': {
          require: './dist/use-isomorphic-layout-effect.cjs.js',
          import: './dist/use-isomorphic-layout-effect.esm.js',
          default: './dist/use-isomorphic-layout-effect.cjs.js',
        },
      };
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    }
  }

  console.log(`[patch-hydrogen-react] Patched: ${dir}`);
  patched++;
}

if (patched === 0) {
  console.log('[patch-hydrogen-react] No instances needed patching.');
} else {
  console.log(`[patch-hydrogen-react] Done — patched ${patched} instance(s).`);
}
