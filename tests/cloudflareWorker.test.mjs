import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function env() {
  return {
    ASSETS: {
      fetch: async (request) => new Response('asset:' + new URL(request.url).pathname),
    },
  };
}

test('Worker sends non-API requests to static assets', async () => {
  const response = await worker.fetch(new Request('https://dashboard.test/'), env());
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset:/');
});

test('Worker routes bootstrap requests through the FPL Pages-compatible handler', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ events: [], elements: [] });
  };

  const response = await worker.fetch(
    new Request('https://dashboard.test/api/fpl/bootstrap-static'),
    env(),
  );

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, 'https://fantasy.premierleague.com/api/bootstrap-static/');
});

test('Worker dispatches manager and player API routes', async () => {
  const requested = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json({ ok: true });
  };

  const paths = [
    '/api/player-history?id=10',
    '/api/manager-profile?id=20',
    '/api/manager-history?id=20',
    '/api/league-standings?id=30&page=2',
    '/api/team-picks?id=20&gw=4',
  ];

  for (const path of paths) {
    const response = await worker.fetch(new Request('https://dashboard.test' + path), env());
    assert.equal(response.status, 200, path);
  }

  assert.deepEqual(requested, [
    'https://fantasy.premierleague.com/api/element-summary/10/',
    'https://fantasy.premierleague.com/api/entry/20/',
    'https://fantasy.premierleague.com/api/entry/20/history/',
    'https://fantasy.premierleague.com/api/leagues-classic/30/standings/?page_standings=2',
    'https://fantasy.premierleague.com/api/entry/20/event/4/picks/',
  ]);
});

test('Worker rejects unknown API paths and non-GET methods', async () => {
  const unknown = await worker.fetch(new Request('https://dashboard.test/api/not-real'), env());
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { error: 'Not found' });

  const method = await worker.fetch(new Request('https://dashboard.test/api/fpl/fixtures', {
    method: 'POST',
  }), env());
  assert.equal(method.status, 405);
});
