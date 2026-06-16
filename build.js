#!/usr/bin/env node
// Builds deployable copies of the tools in public/ into dist/.
// Inline <script> blocks are obfuscated unless --no-obfuscate is passed
// (use that when reproducing production issues against readable code).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const OBFUSCATE = !process.argv.includes('--no-obfuscate');
const SRC_DIR = path.join(__dirname, 'public');
const OUT_DIR = path.join(__dirname, 'dist');

// renameGlobals must stay false: the HTML calls global functions from inline
// onclick/onchange attributes. controlFlowFlattening/deadCodeInjection stay
// off because the tools chew through multi-MB logs and large JSON in hot loops.
const OBFUSCATOR_OPTIONS = {
  compact: true,
  simplify: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  splitStrings: false,
  unicodeEscapeSequence: false,
};

// sf-debug-viewer serializes parseLine/evType/evMeta with .toString() to build
// its Web Worker source (buildWorkerSrc); string-array indirection would make
// the serialized bodies call a decoder that doesn't exist inside the worker.
const PER_FILE_OPTIONS = {
  'sf-debug-viewer.html': { stringArray: false },
};

const INLINE_SCRIPT_RE = /(<script(?![^>]*\bsrc\s*=)[^>]*>)([\s\S]*?)(<\/script>)/gi;

function checkSyntax(code, label) {
  const tmp = path.join(os.tmpdir(), `build-check-${process.pid}.js`);
  fs.writeFileSync(tmp, code);
  const res = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (res.status !== 0) {
    throw new Error(`Generated code in ${label} failed syntax check:\n${res.stderr}`);
  }
}

function transformHtml(html, name) {
  if (!OBFUSCATE) return html;
  const JavaScriptObfuscator = require('javascript-obfuscator');
  let block = 0;
  return html.replace(INLINE_SCRIPT_RE, (match, open, code, close) => {
    if (!code.trim()) return match;
    // Only obfuscate executable JS; leave data blocks (application/ld+json
    // structured data, text templates) untouched.
    if (/\btype\s*=\s*["'](?!(?:text\/javascript|module)\b)/i.test(open)) return match;
    block++;
    const label = `${name} (script block ${block})`;
    const options = { ...OBFUSCATOR_OPTIONS, ...PER_FILE_OPTIONS[name] };
    const out = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();
    if (out.includes('</script')) {
      throw new Error(`${label}: obfuscated output contains "</script>", would corrupt the HTML`);
    }
    checkSyntax(out, label);
    console.log(`  ${label}: ${code.length} -> ${out.length} bytes`);
    return `${open}\n${out}\n${close}`;
  });
}

// Walks public/ recursively, mirroring its tree into dist/. Subdirectories
// (e.g. guides/) are preserved so content pages keep their /guides/... URLs.
function build(srcDir, outDir, relPrefix) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(outDir, entry);
    const rel = relPrefix ? `${relPrefix}/${entry}` : entry;
    if (fs.statSync(srcPath).isDirectory()) {
      build(srcPath, destPath, rel);
    } else if (entry.endsWith('.html')) {
      console.log(rel + (OBFUSCATE ? '' : ' (no obfuscation)'));
      fs.writeFileSync(destPath, transformHtml(fs.readFileSync(srcPath, 'utf8'), entry));
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
build(SRC_DIR, OUT_DIR, '');

console.log(`Build complete -> ${path.relative(__dirname, OUT_DIR)}/`);
