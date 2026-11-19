/**
 * Vercel Function: safely proxy one public player's FPL match history.
 *
 * GET /api/player-history?id=<playerId>
 *   -> https://fantasy.premierleague.com/api/element-summary/<playerId>/
 *
 * The numeric ID is validated before it is interpolated into the fixed upstream path.
 */
const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const PLAYER_ID_PATTERN = /^[1-9]\d{0,8}$/;
const UPSTREAM_TIMEOUT_MS = 10_000;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const playerId = new URL(request.url).searchParams.get('id') ?? '';

  if (!PLAYER_ID_PATTERN.test(playerId)) {
    return Response.json({ error: 'Invalid player ID' }, { status: 400, headers: NO_STORE });
  }

  try {
    const upstream = await fetch(FPL_BASE_URL + '/element-summary/' + playerId + '/', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (upstream.status === 404) {
      return Response.json({ error: 'Player history not found' }, { status: 404, headers: NO_STORE });
    }

    if (!upstream.ok) {
      return Response.json(
        { error: 'FPL API returned an error', status: upstream.status },
        { status: 502, headers: NO_STORE },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    return Response.json({ error: 'FPL API is unreachable' }, { status: 502, headers: NO_STORE });
  }
}
