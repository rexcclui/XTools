// Cloudflare Pages worker — same routing logic as src/index.js (used by Workers).
// Pages picks this up automatically from the root of the deployed directory.
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
        return Response.redirect(new URL(`/${filename}`, url).toString(), 302);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
