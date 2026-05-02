// Build script for @andromanpro/cyberpunk-captcha — produces dist/ via esbuild.
// Usage: `node tools/build.mjs`  or  `npm run build`

import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');

if (!existsSync(DIST)) await mkdir(DIST, { recursive: true });

const baseOpts = {
  entryPoints: [resolve(SRC, 'index.js')],
  bundle: true,
  target: ['es2017'],
  logLevel: 'info'
};

console.log('▸ Building cyberpunk-captcha…');

await Promise.all([
  // IIFE / UMD bundle (global window.CyberpunkCaptcha)
  build({
    ...baseOpts,
    format: 'iife',
    globalName: 'CyberpunkCaptcha',
    outfile: resolve(DIST, 'cyberpunk-captcha.js'),
    minify: false
  }),
  build({
    ...baseOpts,
    format: 'iife',
    globalName: 'CyberpunkCaptcha',
    outfile: resolve(DIST, 'cyberpunk-captcha.min.js'),
    minify: true
  }),
  // ES module
  build({
    ...baseOpts,
    format: 'esm',
    outfile: resolve(DIST, 'cyberpunk-captcha.esm.js'),
    minify: false
  }),
  build({
    ...baseOpts,
    format: 'esm',
    outfile: resolve(DIST, 'cyberpunk-captcha.esm.min.js'),
    minify: true
  })
]);

// Copy CSS — esbuild не bundle'ит .css из import, проще copy
const css = await readFile(resolve(SRC, 'core/styles.css'), 'utf8');
await writeFile(resolve(DIST, 'cyberpunk-captcha.css'), css);

console.log('✓ Build complete:');
console.log('  dist/cyberpunk-captcha.js          (IIFE)');
console.log('  dist/cyberpunk-captcha.min.js      (IIFE minified)');
console.log('  dist/cyberpunk-captcha.esm.js      (ES module)');
console.log('  dist/cyberpunk-captcha.esm.min.js  (ES module minified)');
console.log('  dist/cyberpunk-captcha.css         (styles)');
