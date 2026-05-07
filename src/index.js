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

    if (url.pathname === '/' || url.pathname === '') {
      const subdomain = url.hostname.split('.')[0];
      const filename = SUBDOMAIN_MAP[subdomain];
      if (filename) {
        const target = new URL(`/${filename}`, url);
        const res = await env.ASSETS.fetch(new Request(target.toString(), request));
        if (res.ok) return res;
      }
    }

    return env.ASSETS.fetch(request);
  },
};
