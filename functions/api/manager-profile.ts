import { invalidParameters, proxyFpl } from '../_shared/fplProxy.js';

interface PagesContext {
  request: Request;
}

const ID_PATTERN = /^[1-9]\d{0,8}$/;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const id = new URL(context.request.url).searchParams.get('id') ?? '';

  if (!ID_PATTERN.test(id)) {
    return invalidParameters('Invalid manager ID');
  }

  return proxyFpl(`/entry/${id}/`, { notFoundMessage: 'Manager not found' });
}
