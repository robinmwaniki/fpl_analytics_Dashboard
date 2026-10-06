import type { Player } from '../types/fpl';

/** Players with fewer minutes than this are excluded from value rankings (tiny samples mislead). */
export const MIN_MINUTES_FOR_VALUE = 180;

/** Below this ownership percentage a captain option is flagged as a differential. */
export const DIFFERENTIAL_OWNERSHIP_PCT = 10;

/** FPL sends many numeric fields as strings. */
export const toNumber = (value: string): number => Number.parseFloat(value) || 0;

/** Blend of expected points (FPL's own projection) and recent form. Higher is better. */
export const captainScore = (player: Player): number =>
  0.6 * toNumber(player.ep_next) + 0.4 * toNumber(player.form);

export const pointsPerMillion = (player: Player): number =>
  player.now_cost > 0 ? player.total_points / (player.now_cost / 10) : 0;

/** FPL status 'a' means fully available. */
export const isAvailable = (player: Player): boolean => player.status === 'a';