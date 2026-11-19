/**
 * Proxy for paginated public FPL classic-league standings.
 * GET /api/league-standings?id=<leagueId>&page=<page>
 */
const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const ID_PATTERN = /^[1-9]\d{0,9}$/;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const leagueId = params.get('id') ?? '';
  const page = Number(params.get('page') ?? '1');

  if (!ID_PATTERN.test(leagueId) || !Number.isInteger(page) || page < 1 || page > 100) {
    return Response.json({ error: 'Invalid league ID or page' }, { status: 400, headers: NO_STORE });
  }

  try {
    const upstream = await fetch(
      FPL_BASE_URL + '/leagues-classic/' + leagueId + '/standings/?page_standings=' + page,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)' },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (upstream.status === 404) {
      return Response.json({ error: 'League not found' }, { status: 404, headers: NO_STORE });
    }
    if (!upstream.ok) {
      return Response.json({ error: 'FPL API returned an error' }, { status: 502, headers: NO_STORE });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return Response.json({ error: 'FPL API is unreachable' }, { status: 502, headers: NO_STORE });
  }
}
