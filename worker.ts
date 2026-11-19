import { onRequestGet as getFpl } from './functions/api/fpl/[endpoint].js';
import { onRequestGet as getPlayerHistory } from './functions/api/player-history.js';
import { onRequestGet as getManagerProfile } from './functions/api/manager-profile.js';
import { onRequestGet as getManagerHistory } from './functions/api/manager-history.js';
import { onRequestGet as getLeagueStandings } from './functions/api/league-standings.js';
import { onRequestGet as getTeamPicks } from './functions/api/team-picks.js';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function notFound(): Response {
  return Response.json({ error: 'Not found' }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET', 'Cache-Control': 'no-store' },
      });
    }

    if (url.pathname === '/api/fpl/bootstrap-static' || url.pathname === '/api/fpl/fixtures') {
      const endpoint = url.pathname.split('/').at(-1) ?? '';
      return getFpl({ request, params: { endpoint } });
    }

    const routes: Record<string, (context: { request: Request }) => Promise<Response>> = {
      '/api/player-history': getPlayerHistory,
      '/api/manager-profile': getManagerProfile,
      '/api/manager-history': getManagerHistory,
      '/api/league-standings': getLeagueStandings,
      '/api/team-picks': getTeamPicks,
    };

    const handler = routes[url.pathname];
    return handler ? handler({ request }) : notFound();
  },
};
