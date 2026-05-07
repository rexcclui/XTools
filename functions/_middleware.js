const SUBDOMAIN_MAP = {
  jsongrid:  '/jsongrid.html',
  apexflow:  '/apexflow.html',
  apexdebug: '/sf-debug-viewer.html',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/' || url.pathname === '') {
    const subdomain = url.hostname.split('.')[0];
    const file = SUBDOMAIN_MAP[subdomain];
    if (file) {
      return Response.redirect(new URL(file, url).toString(), 302);
    }
  }

  return context.next();
}
