import { invalidParameters, proxyFpl } from '../_shared/fplProxy';

interface PagesContext {
  request: Request;
}

const ID_PATTERN = /^[1-9]\d{0,9}$/;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const params = new URL(context.request.url).searchParams;
  const leagueId = params.get('id') ?? '';
  const pageValue = params.get('page') ?? '1';
  const page = Number(pageValue);

  if (
    !ID_PATTERN.test(leagueId)
    || !/^\d+$/.test(pageValue)
    || !Number.isInteger(page)
    || page < 1
    || page > 100
  ) {
    return invalidParameters('Invalid league ID or page');
  }

  return proxyFpl(
    `/leagues-classic/${leagueId}/standings/?page_standings=${page}`,
    { notFoundMessage: 'League not found' },
  );
}
