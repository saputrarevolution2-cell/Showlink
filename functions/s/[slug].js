// Public Shortlink route: normalize the slug and preserve it through the access flow.
function cleanSlug(value) {
  if (typeof value !== 'string') return '';
  try { value = decodeURIComponent(value); } catch (_) {}
  return value.trim().replace(/^\/+|\/+$/g, '');
}
export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const fromPath = url.pathname.split('/').filter(Boolean).pop() || '';
  const slug = cleanSlug(params?.slug || url.searchParams.get('slug') || fromPath);
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(slug)) {
    const target = new URL('/go.html', url.origin);
    target.searchParams.set('error', 'invalid-code');
    return Response.redirect(target.toString(), 302);
  }
  const target = new URL('/go.html', url.origin);
  target.searchParams.set('slug', slug);
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'no-store' } });
}
