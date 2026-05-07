export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '') {
      // Map the first subdomain label to <label>.html
      // e.g. jsongrid.example.com → /jsongrid.html
      const subdomain = url.hostname.split('.')[0];
      const target = new URL(`/${subdomain}.html`, url);
      const res = await env.ASSETS.fetch(new Request(target.toString(), request));
      if (res.ok) return res;
    }

    return env.ASSETS.fetch(request);
  },
};
