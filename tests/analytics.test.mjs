import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captainScore,
  DIFFERENTIAL_OWNERSHIP_PCT,
  isAvailable,
  MIN_MINUTES_FOR_VALUE,
  pointsPerMillion,
  toNumber,
} from '../src/lib/analytics.ts';

const player = (overrides = {}) => ({
  id: 1,
  first_name: 'Test',
  second_name: 'Player',
  web_name: 'Player',
  team: 1,
  element_type: 3,
  now_cost: 80,
  total_points: 64,
  goals_scored: 0,
  assists: 0,
  clean_sheets: 0,
  form: '5.5',
  selected_by_percent: '12.0',
  bonus: 0,
  bps: 0,
  minutes: 900,
  ict_index: '30.0',
  ep_next: '6.5',
  news: '',
  status: 'a',
  ...overrides,
});

test('toNumber parses numeric strings and safely defaults invalid input to zero', () => {
  assert.equal(toNumber('7.25'), 7.25);
  assert.equal(toNumber(''), 0);
  assert.equal(toNumber('not-a-number'), 0);
});

test('captainScore weights expected points at 60% and form at 40%', () => {
  assert.equal(captainScore(player()), 6.1);
});

test('pointsPerMillion uses FPL tenths-of-a-million prices', () => {
  assert.equal(pointsPerMillion(player()), 8);
});

test('pointsPerMillion returns zero for a zero or negative price', () => {
  assert.equal(pointsPerMillion(player({ now_cost: 0 })), 0);
  assert.equal(pointsPerMillion(player({ now_cost: -1 })), 0);
});

test('isAvailable only treats the fully available status as available', () => {
  assert.equal(isAvailable(player({ status: 'a' })), true);
  assert.equal(isAvailable(player({ status: 'd' })), false);
  assert.equal(isAvailable(player({ status: 'i' })), false);
});

test('analytics thresholds remain explicit and stable', () => {
  assert.equal(MIN_MINUTES_FOR_VALUE, 180);
  assert.equal(DIFFERENTIAL_OWNERSHIP_PCT, 10);
});
