import { proxyFpl } from '../../_shared/fplProxy';

interface PagesContext {
  params: { endpoint?: string };
}

const ALLOWED_ENDPOINTS = new Set(['bootstrap-static', 'fixtures']);

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const endpoint = context.params.endpoint ?? '';

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return proxyFpl(`/${endpoint}/`, { cacheSeconds: 300, staleSeconds: 600 });
}
