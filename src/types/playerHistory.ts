/** One player's completed or current gameweek performance record from FPL. */
export interface PlayerGameweekHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string | null;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  bps: number;
  ict_index: string;
}

export interface PlayerHistoryPayload {
  history: PlayerGameweekHistory[];
}

export type PlayerHistoryResult =
  | { status: 'ok'; history: PlayerGameweekHistory[] }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };
