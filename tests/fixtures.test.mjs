import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStartGameweek,
  getTeamFixtures,
  toFixtureCell,
} from '../src/lib/fixtures.ts';

const teams = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS', strength: 5 }],
  [2, { id: 2, name: 'Chelsea', short_name: 'CHE', strength: 4 }],
]);

const fixture = (overrides = {}) => ({
  id: 101,
  event: 8,
  team_h: 1,
  team_a: 2,
  team_h_difficulty: 3,
  team_a_difficulty: 4,
  kickoff_time: null,
  finished: false,
  ...overrides,
});

test('toFixtureCell maps home fixtures and opponent difficulty correctly', () => {
  assert.deepEqual(toFixtureCell(fixture(), 1, teams), {
    fixtureId: 101,
    event: 8,
    opponent: 'CHE',
    isHome: true,
    difficulty: 3,
  });
});

test('toFixtureCell maps away fixtures and opponent difficulty correctly', () => {
  assert.deepEqual(toFixtureCell(fixture(), 2, teams), {
    fixtureId: 101,
    event: 8,
    opponent: 'ARS',
    isHome: false,
    difficulty: 4,
  });
});

test('toFixtureCell uses a safe opponent fallback for an unknown team', () => {
  assert.equal(toFixtureCell(fixture({ team_a: 99 }), 1, teams).opponent, '???');
});

test('getStartGameweek prefers the explicitly next event', () => {
  const events = [
    { id: 7, is_next: false, finished: true },
    { id: 8, is_next: true, finished: false },
    { id: 9, is_next: false, finished: false },
  ];
  assert.equal(getStartGameweek(events), 8);
});

test('getStartGameweek falls back to the first unfinished event and then gameweek one', () => {
  assert.equal(getStartGameweek([
    { id: 4, is_next: false, finished: true },
    { id: 5, is_next: false, finished: false },
  ]), 5);
  assert.equal(getStartGameweek([]), 1);
});

test('getTeamFixtures filters completed, out-of-range and unrelated fixtures', () => {
  const fixtures = [
    fixture({ id: 1, event: 8 }),
    fixture({ id: 2, event: 9, finished: true }),
    fixture({ id: 3, event: 10 }),
    fixture({ id: 4, event: null }),
    fixture({ id: 5, event: 9, team_h: 2, team_a: 99 }),
  ];

  assert.deepEqual(
    getTeamFixtures(fixtures, 1, 8, 9, teams).map((cell) => cell.fixtureId),
    [1],
  );
});

test('getTeamFixtures sorts matching fixtures by gameweek', () => {
  const fixtures = [
    fixture({ id: 2, event: 9 }),
    fixture({ id: 1, event: 8 }),
  ];
  assert.deepEqual(
    getTeamFixtures(fixtures, 1, 8, 9, teams).map((cell) => cell.event),
    [8, 9],
  );
});
