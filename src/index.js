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
