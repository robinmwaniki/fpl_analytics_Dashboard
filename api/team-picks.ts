/**
 * Vercel Function: proxy for a manager's gameweek squad on the public FPL API.
 *
 *   GET /api/team-picks?id=<managerId>&gw=<gameweek>
 *     ->  https://fantasy.premierleague.com/api/entry/<id>/event/<gw>/picks/
 *
 * Parameters are validated before anything is forwarded, so the function can only
 * ever request this one upstream path shape.
 */

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const MANAGER_ID_PATTERN = /^\d{1,9}$/;
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_GAMEWEEK = 38;

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const gameweek = Number(params.get('gw'));

  if (!MANAGER_ID_PATTERN.test(id) || !Number.isInteger(gameweek) || gameweek < 1 || gameweek > MAX_GAMEWEEK) {
    return Response.json({ error: 'Invalid parameters' }, { status: 400, headers: NO_STORE });
  }

  try {
    const upstream = await fetch(`${FPL_BASE_URL}/entry/${id}/event/${gameweek}/picks/`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (upstream.status === 404) {
      return Response.json({ error: 'Team not found' }, { status: 404, headers: NO_STORE });
    }

    if (!upstream.ok) {
      return Response.json(
        { error: 'FPL API returned an error', status: upstream.status },
        { status: 502, headers: NO_STORE }
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