import { invalidParameters, proxyFpl } from '../_shared/fplProxy';

interface PagesContext {
  request: Request;
}

const MANAGER_ID_PATTERN = /^\d{1,9}$/;
const MAX_GAMEWEEK = 38;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const params = new URL(context.request.url).searchParams;
  const id = params.get('id') ?? '';
  const gameweekValue = params.get('gw') ?? '';
  const gameweek = Number(gameweekValue);

  if (
    !MANAGER_ID_PATTERN.test(id)
    || !/^\d+$/.test(gameweekValue)
    || !Number.isInteger(gameweek)
    || gameweek < 1
    || gameweek > MAX_GAMEWEEK
  ) {
    return invalidParameters();
  }

  return proxyFpl(
    `/entry/${id}/event/${gameweek}/picks/`,
    { notFoundMessage: 'Team not found' },
  );
}
