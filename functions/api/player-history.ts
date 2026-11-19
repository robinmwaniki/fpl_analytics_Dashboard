import { invalidParameters, proxyFpl } from '../_shared/fplProxy.js';

interface PagesContext {
  request: Request;
}

const PLAYER_ID_PATTERN = /^[1-9]\d{0,8}$/;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const playerId = new URL(context.request.url).searchParams.get('id') ?? '';

  if (!PLAYER_ID_PATTERN.test(playerId)) {
    return invalidParameters('Invalid player ID');
  }

  return proxyFpl(`/element-summary/${playerId}/`, {
    notFoundMessage: 'Player history not found',
  });
}
