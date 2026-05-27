// Maps the subdomain of each live domain to the HTML file it should serve.
// Full domains: https://jsongrid.trendx.uk → jsongrid.html
//               https://apexflow.trendx.uk  → apexflow.html
//               https://apexdebug.trendx.uk → sf-debug-viewer.html
const SUBDOMAIN_MAP = {
  jsongrid:  'jsongrid.html',
  apexflow:  'apexflow.html',
  apexdebug: 'sf-debug-viewer.html',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subdomain = url.hostname.split('.')[0];

    if (url.pathname === '/api/visits') {
      return handleVisits(request, env, subdomain);
    }

    if (url.pathname === '/' || url.pathname === '') {
      const filename = SUBDOMAIN_MAP[subdomain];
      if (filename) {
        return Response.redirect(new URL(`/${filename}`, url).toString(), 302);
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
