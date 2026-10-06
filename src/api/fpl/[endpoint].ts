/**
 * Vercel Function: server-side proxy for the public Fantasy Premier League API.
 *
 * The FPL API does not send CORS headers, so the browser cannot call it directly.
 * Routing the request through this function removes the need for third-party CORS
 * proxies and lets Vercel's CDN cache the (large) response.
 *
 *   GET /api/fpl/bootstrap-static  ->  https://fantasy.premierleague.com/api/bootstrap-static/
 *   GET /api/fpl/fixtures          ->  https://fantasy.premierleague.com/api/fixtures/
 */

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const ALLOWED_ENDPOINTS = new Set(['bootstrap-static', 'fixtures']);
const UPSTREAM_TIMEOUT_MS = 10_000;

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export async function GET(request: Request): Promise<Response> {
  const endpoint = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? '';

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const upstream = await fetch(`${FPL_BASE_URL}/${endpoint}/`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: 'FPL API returned an error', status: upstream.status },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return Response.json(
      { error: 'FPL API is unreachable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}