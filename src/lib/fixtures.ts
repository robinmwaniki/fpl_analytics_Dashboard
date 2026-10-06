import type { Event, Fixture, Team } from '../types/fpl';

export const DIFFICULTY_STYLES: Record<number, string> = {
  1: 'bg-emerald-400 text-slate-950 font-extrabold',
  2: 'bg-emerald-500 text-slate-950 font-extrabold',
  3: 'bg-slate-700 text-white',
  4: 'bg-amber-500 text-slate-950 font-bold',
  5: 'bg-rose-600 text-white font-bold',
};

export interface FixtureCell {
  fixtureId: number;
  event: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

export function toFixtureCell(fixture: Fixture, teamId: number, teamMap: Map<number, Team>): FixtureCell {
  const isHome = fixture.team_h === teamId;
  const opponentId = isHome ? fixture.team_a : fixture.team_h;
  return {
    fixtureId: fixture.id,
    event: fixture.event ?? 0,
    opponent: teamMap.get(opponentId)?.short_name ?? '???',
    isHome,
    difficulty: isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty,
  };
}

/** The first gameweek that has not finished yet (the "next" gameweek). */
export function getStartGameweek(events: Event[]): number {
  return events.find((e) => e.is_next)?.id ?? events.find((e) => !e.finished)?.id ?? 1;
}

/** A team's unfinished fixtures between two gameweeks (inclusive), in date order. */
export function getTeamFixtures(
  fixtures: Fixture[],
  teamId: number,
  fromGw: number,
  toGw: number,
  teamMap: Map<number, Team>
): FixtureCell[] {
  return fixtures
    .filter(
      (f) =>
        !f.finished &&
        f.event !== null &&
        f.event >= fromGw &&
        f.event <= toGw &&
        (f.team_h === teamId || f.team_a === teamId)
    )
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
    .map((f) => toFixtureCell(f, teamId, teamMap));
}