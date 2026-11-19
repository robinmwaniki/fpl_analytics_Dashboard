const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';
const USER_AGENT = 'Mozilla/5.0 (compatible; fpl-analytics-dashboard)';
const NO_STORE = { 'Cache-Control': 'no-store' };

interface ProxyOptions {
  cacheSeconds?: number;
  staleSeconds?: number;
  notFoundMessage?: string;
}

export async function proxyFpl(path: string, options: ProxyOptions = {}): Promise<Response> {
  const cacheSeconds = options.cacheSeconds ?? 60;
  const staleSeconds = options.staleSeconds ?? 120;

  try {
    const upstream = await fetch(FPL_BASE_URL + path, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (upstream.status === 404) {
      return Response.json(
        { error: options.notFoundMessage ?? 'FPL resource not found' },
        { status: 404, headers: NO_STORE },
      );
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
        'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${staleSeconds}`,
      },
    });
  } catch {
    return Response.json(
      { error: 'FPL API is unreachable' },
      { status: 502, headers: NO_STORE },
    );
  }
}

export function invalidParameters(message = 'Invalid parameters'): Response {
  return Response.json({ error: message }, { status: 400, headers: NO_STORE });
}
