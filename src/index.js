// Maps the subdomain of each live domain to the HTML file it should serve.
// Full domains: https://jsongrid.trendx.uk → jsongrid.html
//               https://apexflow.trendx.uk  → apexflow.html
//               https://apexdebug.trendx.uk → sf-debug-viewer.html
const SUBDOMAIN_MAP = {
  jsongrid:  'jsongrid.html',
  apexflow:  'apexflow.html',
  apexdebug: 'sf-debug-viewer.html',
  xtools:    'xtools.html',
};
// Screenshot used in each tool's image sitemap entry. The xtools portal has
// no single screenshot, so it is intentionally absent (image tag is omitted).
const SCREENSHOT = {
  jsongrid:  'sample-jsongrid.jpg',
  apexflow:  'sample-apexflow.jpg',
  apexdebug: 'sample-sf-debug-viewer.jpg',
};
// Content guides, grouped by the tool they support. Each guide is canonical
// on its tool's subdomain; hits on the wrong subdomain 301 to the owner. Asset
// files live under /guides/<subdomain>/<slug>.html, but the public URL drops
// the subdomain segment (e.g. apexflow.trendx.uk/guides/apex-class-diagram).
const GUIDES = {
  jsongrid:  ['view-json-as-table', 'visualize-complex-json', 'large-json-file'],
  apexflow:  ['apex-class-diagram', 'apex-call-hierarchy', 'visualize-lwc-apex'],
  apexdebug: ['read-salesforce-debug-log', 'apex-debug-log-analyzer', 'debug-soql-limits'],
};
// slug -> owning subdomain, so a guide requested anywhere lands on its owner.
const GUIDE_OWNER = {};
for (const [sub, slugs] of Object.entries(GUIDES)) for (const s of slugs) GUIDE_OWNER[s] = sub;

// Covers both /jsongrid.html and the extensionless /jsongrid that the old
// asset html_handling used to redirect to (those URLs exist in the wild).
const FILE_TO_SUBDOMAIN = {};
for (const [sub, file] of Object.entries(SUBDOMAIN_MAP)) {
  FILE_TO_SUBDOMAIN[`/${file}`] = sub;
  FILE_TO_SUBDOMAIN[`/${file.replace(/\.html$/, '')}`] = sub;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];

    // Bare apex (and www) has no content of its own — send visitors to the
    // XTools portal hub, preserving the path/query. 301 so search engines
    // consolidate ranking signals onto xtools.trendx.uk.
    if (url.hostname === 'trendx.uk' || url.hostname === 'www.trendx.uk') {
      return Response.redirect(`https://xtools.trendx.uk${url.pathname}${url.search}`, 301);
    }

    if (url.pathname === '/api/visits') {
      return handleVisits(request, env, subdomain);
    }

    if (SUBDOMAIN_MAP[subdomain]) {
      const origin = `https://${url.hostname}`;

      // Serve the tool at the root URL (rewrite, not redirect) so search
      // engines index the clean canonical https://<sub>.trendx.uk/ directly.
      if (url.pathname === '/' || url.pathname === '') {
        return env.ASSETS.fetch(new Request(new URL(`/${SUBDOMAIN_MAP[subdomain]}`, url), request));
      }

      if (url.pathname === '/robots.txt') {
        return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, {
          headers: { 'content-type': 'text/plain' },
        });
      }

      if (url.pathname === '/sitemap.xml') {
        // The portal (xtools) has no per-tool screenshot, so omit the image tag.
        const shot = SCREENSHOT[subdomain];
        const img = shot ? `<image:image><image:loc>${origin}/${shot}</image:loc></image:image>` : '';
        let urls = `  <url><loc>${origin}/</loc>${img}</url>\n`;
        // Each tool lists its own guides (canonical on its own subdomain).
        if (GUIDES[subdomain]) {
          urls += `  <url><loc>${origin}/guides</loc></url>\n`;
          for (const slug of GUIDES[subdomain]) urls += `  <url><loc>${origin}/guides/${slug}</loc></url>\n`;
        }
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
          urls +
          '</urlset>\n',
          { headers: { 'content-type': 'application/xml' } },
        );
      }

      // Content guides under /guides. Serve clean (extensionless) URLs, 301 any
      // .html hit to its clean form, and keep each guide canonical on its owner.
      if (url.pathname === '/guides' || url.pathname.startsWith('/guides/')) {
        if (url.pathname.endsWith('.html')) {
          return Response.redirect(`${origin}${url.pathname.replace(/\.html$/, '')}${url.search}`, 301);
        }
        const clean = url.pathname.replace(/\/+$/, '') || '/guides';
        if (clean === '/guides') {
          // Each tool has its own hub; the portal (no guides) points to jsongrid.
          if (!GUIDES[subdomain]) {
            return Response.redirect('https://jsongrid.trendx.uk/guides', 301);
          }
          return env.ASSETS.fetch(new Request(new URL(`/guides/${subdomain}/index.html`, url), request));
        }
        const slug = clean.slice('/guides/'.length);
        const owner = GUIDE_OWNER[slug];
        if (owner && owner !== subdomain) {
          return Response.redirect(`https://${owner}.trendx.uk/guides/${slug}${url.search}`, 301);
        }
        if (owner) {
          return env.ASSETS.fetch(new Request(new URL(`/guides/${owner}/${slug}.html`, url), request));
        }
        // Unknown guide slug — fall through to assets (404).
      }

      // Every worker deploys all three HTML files, so each tool would be
      // reachable (and indexed as duplicate content) on every subdomain.
      // Redirect direct .html hits to the tool's canonical home instead.
      const home = FILE_TO_SUBDOMAIN[url.pathname];
      if (home) {
        return Response.redirect(`https://${url.hostname.replace(/^[^.]+/, home)}/`, 301);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

// Counts unique visitors per day, per site. The visitor IP is never stored:
// it is hashed (SHA-256) together with the day and a salt, so we can only tell
// whether a given hash has already been seen today, not who it belongs to.
async function handleVisits(request, env, site) {
  const kv = env.VISITS;
  if (!kv) return json({ count: 0 });

  const countKey = `count:${site}`;
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const salt = env.IP_SALT || 'jsongrid-visit-salt';
  const seenKey = `seen:${site}:${day}:${await hash(`${salt}:${day}:${ip}`)}`;

  let count = parseInt((await kv.get(countKey)) || '0', 10);

  if (!(await kv.get(seenKey))) {
    count += 1;
    await kv.put(countKey, String(count));
    // Marker expires after 48h so storage stays small and the IP recounts tomorrow.
    await kv.put(seenKey, '1', { expirationTtl: 172800 });
  }

  return json({ count });
}

async function hash(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
