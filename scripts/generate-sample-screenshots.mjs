// Regenerates the public/sample-*.jpg screenshots shown in each tool's
// Help modal. Requires a built dist/ and playwright with chromium:
//   npm run build
//   npm i -D playwright && npx playwright install chromium
//   node scripts/generate-sample-screenshots.mjs
// Mermaid/svg-pan-zoom are served from node_modules in place of the CDN so
// the apexflow diagram renders without network access.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

// Resolve the repo root from this script's location (scripts/ → repo root)
// so it works regardless of where the checkout lives.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((req, res) => {
  if (req.url === '/api/visits') { res.end(JSON.stringify({ count: 1280 })); return; }
  try { res.setHeader('content-type', 'text/html'); res.end(fs.readFileSync(path.join(root, 'dist', req.url.slice(1)))); }
  catch { res.statusCode = 404; res.end('nf'); }
});
await new Promise(r => server.listen(8795, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: 'light' });

// Route CDN libs to real local copies so apexflow renders genuine diagrams
const localLibs = async (page) => {
  await page.route('**cdn.jsdelivr.net/npm/mermaid/**', r =>
    r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf8') }));
  await page.route('**cdn.jsdelivr.net/npm/svg-pan-zoom**', r =>
    r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'node_modules/svg-pan-zoom/dist/svg-pan-zoom.min.js'), 'utf8') }));
  await page.route('**cdnjs.cloudflare.com/**', r => {
    if (r.request().url().endsWith('.css')) r.fulfill({ contentType: 'text/css', body: '' });
    else r.fulfill({ contentType: 'application/javascript', body: 'window.Prism={highlightElement(){}};' });
  });
};

// 1. jsongrid with sample loaded
{
  const p = await ctx.newPage();
  await p.goto('http://localhost:8795/jsongrid.html'); await p.waitForTimeout(700);
  await p.evaluate(() => loadSampleJson()); await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(root, 'public/sample-jsongrid.jpg'), type: 'jpeg', quality: 80 });
  await p.close();
}

// 2. sf-debug-viewer with sample parsed
{
  const p = await ctx.newPage();
  await p.goto('http://localhost:8795/sf-debug-viewer.html'); await p.waitForTimeout(700);
  await p.click('#btn-help'); await p.waitForTimeout(200);
  await p.click('#btn-helpSample'); await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(root, 'public/sample-sf-debug-viewer.jpg'), type: 'jpeg', quality: 80 });
  await p.close();
}

// 3. apexflow with sample classes + LWC rendered by real mermaid
{
  const p = await ctx.newPage();
  await localLibs(p);
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:8795/apexflow.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => loadApexSample()); await p.waitForTimeout(3500);
  await p.screenshot({ path: path.join(root, 'public/sample-apexflow.jpg'), type: 'jpeg', quality: 80 });
  console.log('apexflow errors:', errors);
  await p.close();
}

await browser.close(); server.close();
for (const f of ['sample-jsongrid.jpg', 'sample-sf-debug-viewer.jpg', 'sample-apexflow.jpg'])
  console.log(f, Math.round(fs.statSync(path.join(root, 'public', f)).size / 1024) + ' KB');
