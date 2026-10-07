import type { Event, Fixture, Player } from '../types/fpl';
import type { ManagerPick } from '../types/manager';
import { captainScore } from './analytics';

export interface ScoredPlayer {
  player: Player;
  score: number;
}

export interface SquadMember extends ScoredPlayer {
  pick: ManagerPick;
}

export interface LineupSwap {
  start: SquadMember;
  bench: SquadMember;
}

export interface SquadAnalysis {
  suggestedXI: SquadMember[];
  suggestedBench: SquadMember[];
  captain: SquadMember | null;
  viceCaptain: SquadMember | null;
  currentCaptain: SquadMember | null;
  swaps: LineupSwap[];
  /** Change in total outlook score of the starting XI versus the current one. */
  xiScoreGain: number;
}

export interface TransferIdea {
  out: SquadMember;
  options: ScoredPlayer[];
  gain: number;
}

const STARTERS = 11;
const MAX_PER_CLUB = 3;
const MIN_TRANSFER_GAIN = 1;
const MAX_TRANSFER_IDEAS = 3;
const OPTIONS_PER_IDEA = 3;
/** Tiny bonus so that, on equal score, the lineup you already have is kept. */
const STABILITY_EPSILON = 0.001;
/** Used when FPL flags a player as doubtful without giving a percentage. */
const DOUBTFUL_FALLBACK_CHANCE = 0.5;

const GOALKEEPER = 1;
const DEFENDER = 2;
const MIDFIELDER = 3;
const FORWARD = 4;

const byScoreDesc = (a: ScoredPlayer, b: ScoredPlayer): number => b.score - a.score;

/** 0 to 1: how likely the player is to be available for the next gameweek. */
export function availabilityFactor(player: Player): number {
  const chance = player.chance_of_playing_next_round;
  if (typeof chance === 'number') return chance / 100;
  if (player.status === 'a') return 1;
  return player.status === 'd' ? DOUBTFUL_FALLBACK_CHANCE : 0;
}

/**
 * Teams with a fixture in the gameweek, or null when fixture data is missing
 * (in which case nobody is treated as blanking).
 */
export function getPlayingTeams(fixtures: Fixture[], gameweek: number): Set<number> | null {
  const teams = new Set<number>();
  for (const fixture of fixtures) {
    if (!fixture.finished && fixture.event === gameweek) {
      teams.add(fixture.team_h);
      teams.add(fixture.team_a);
    }
  }
  return teams.size > 0 ? teams : null;
}

/** Expected-points-style score for the next gameweek: 0 if the player will not play. */
export function outlookScore(player: Player, playingTeams: Set<number> | null): number {
  if (playingTeams !== null && !playingTeams.has(player.team)) return 0;
  return captainScore(player) * availabilityFactor(player);
}

/** A short warning to show next to a player, or null if there is nothing to flag. */
export function getFlag(player: Player, playingTeams: Set<number> | null): string | null {
  if (playingTeams !== null && !playingTeams.has(player.team)) return 'No fixture this gameweek';
  if (availabilityFactor(player) < 1) return player.news || 'Fitness doubt';
  return null;
}

/** The gameweek whose squad FPL will return: the current one, else the latest finished one. */
export function getPicksGameweek(events: Event[]): number {
  const current = events.find((e) => e.is_current);
  if (current) return current.id;
  const finished = events.filter((e) => e.finished);
  return finished.length > 0 ? finished[finished.length - 1].id : 1;
}

export function buildSquad(
  picks: ManagerPick[],
  playerMap: Map<number, Player>,
  playingTeams: Set<number> | null
): SquadMember[] {
  return picks
    .flatMap((pick) => {
      const player = playerMap.get(pick.element);
      return player ? [{ player, pick, score: outlookScore(player, playingTeams) }] : [];
    })
    .sort((a, b) => a.pick.position - b.pick.position);
}

/** Best legal XI (1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD) from the 15-man squad. */
function pickBestStartingXI(squad: SquadMember[]): SquadMember[] {
  const ofType = (type: number) =>
    squad.filter((m) => m.player.element_type === type).sort(byScoreDesc);
  const goalkeepers = ofType(GOALKEEPER);
  const defenders = ofType(DEFENDER);
  const midfielders = ofType(MIDFIELDER);
  const forwards = ofType(FORWARD);

  if (goalkeepers.length === 0) return [];

  let best: SquadMember[] = [];
  let bestValue = -Infinity;

  for (let d = 3; d <= 5; d++) {
    for (let m = 2; m <= 5; m++) {
      const f = STARTERS - 1 - d - m;
      if (f < 1 || f > 3) continue;
      if (defenders.length < d || midfielders.length < m || forwards.length < f) continue;

      const xi = [
        goalkeepers[0],
        ...defenders.slice(0, d),
        ...midfielders.slice(0, m),
        ...forwards.slice(0, f),
      ];
      const total = xi.reduce((sum, member) => sum + member.score, 0);
      const stability = xi.filter((member) => member.pick.position <= STARTERS).length * STABILITY_EPSILON;

      if (total + stability > bestValue) {
        bestValue = total + stability;
        best = xi;
      }
    }
  }

  return best;
}

export function analyseSquad(squad: SquadMember[]): SquadAnalysis {
  const currentXI = squad.filter((m) => m.pick.position <= STARTERS);
  const suggestedXI = pickBestStartingXI(squad);
  const suggestedIds = new Set(suggestedXI.map((m) => m.player.id));

  // FPL bench order: the spare goalkeeper first, then outfielders.
  const benchPool = squad.filter((m) => !suggestedIds.has(m.player.id));
  const suggestedBench = [
    ...benchPool.filter((m) => m.player.element_type === GOALKEEPER),
    ...benchPool.filter((m) => m.player.element_type !== GOALKEEPER).sort(byScoreDesc),
  ];

  const captainOrder = [...suggestedXI].sort(
    (a, b) => b.score - a.score || Number(b.player.ep_next) - Number(a.player.ep_next)
  );

  const incoming = suggestedXI.filter((m) => m.pick.position > STARTERS).sort(byScoreDesc);
  const dropped = currentXI
    .filter((m) => !suggestedIds.has(m.player.id))
    .sort((a, b) => a.score - b.score);
  const swaps = incoming.flatMap((start, index) =>
    dropped[index] ? [{ start, bench: dropped[index] }] : []
  );

  const total = (members: SquadMember[]) => members.reduce((sum, m) => sum + m.score, 0);

  return {
    suggestedXI,
    suggestedBench,
    captain: captainOrder[0] ?? null,
    viceCaptain: captainOrder[1] ?? null,
    currentCaptain: squad.find((m) => m.pick.is_captain) ?? null,
    swaps,
    xiScoreGain: total(suggestedXI) - total(currentXI),
  };
}

/**
 * Like-for-like replacements for the players who would help most. Budget is the
 * player's current price plus your bank, which approximates (but is not exactly)
 * FPL's selling price.
 */
export function suggestTransfers(
  squad: SquadMember[],
  suggestedXI: SquadMember[],
  allPlayers: Player[],
  bank: number,
  playingTeams: Set<number> | null
): TransferIdea[] {
  const squadIds = new Set(squad.map((m) => m.player.id));
  const startingIds = new Set(suggestedXI.map((m) => m.player.id));

  const clubCounts = new Map<number, number>();
  for (const member of squad) {
    clubCounts.set(member.player.team, (clubCounts.get(member.player.team) ?? 0) + 1);
  }

  const pool: ScoredPlayer[] = allPlayers
    .filter((p) => !squadIds.has(p.id) && p.minutes > 0)
    .map((player) => ({ player, score: outlookScore(player, playingTeams) }))
    .filter((candidate) => candidate.score > 0);

  return squad
    // Only starters, or players who will not play, are worth spending a transfer on.
    .filter((m) => startingIds.has(m.player.id) || m.score === 0)
    .map((out) => {
      const budget = out.player.now_cost + bank;
      const options = pool
        .filter((c) => {
          const clubAfter =
            (clubCounts.get(c.player.team) ?? 0) - (c.player.team === out.player.team ? 1 : 0);
          return (
            c.player.element_type === out.player.element_type &&
            c.player.now_cost <= budget &&
            clubAfter < MAX_PER_CLUB &&
            c.score > out.score
          );
        })
        .sort((a, b) => b.score - a.score || a.player.now_cost - b.player.now_cost)
        .slice(0, OPTIONS_PER_IDEA);

      return { out, options, gain: options.length > 0 ? options[0].score - out.score : 0 };
    })
    .filter((idea) => idea.gain >= MIN_TRANSFER_GAIN)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, MAX_TRANSFER_IDEAS);
}