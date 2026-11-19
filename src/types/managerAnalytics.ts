export interface ManagerLeague {
  id: number;
  name: string;
  rank: number | null;
  league_type: string;
}

export interface ManagerProfile {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string;
  summary_overall_points: number | null;
  summary_overall_rank: number | null;
  summary_event_points: number | null;
  summary_event_rank: number | null;
  current_event: number | null;
  leagues: {
    classic: ManagerLeague[];
  };
}

export interface ManagerEventHistory {
  event: number;
  points: number;
  total_points: number;
  overall_rank: number | null;
}

export interface ManagerHistory {
  current: ManagerEventHistory[];
}

export interface LeagueStanding {
  id: number;
  rank: number;
  last_rank: number;
  player_name: string;
  event_total: number;
  total: number;
  entry: number;
  entry_name: string;
}

export interface LeagueStandings {
  page: number;
  has_next: boolean;
  results: LeagueStanding[];
}

export type ManagerOverviewResult =
  | {
      status: 'ok';
      profile: ManagerProfile;
      history: ManagerEventHistory[];
      historyMessage: string | null;
    }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

export type LeagueStandingsResult =
  | { status: 'ok'; data: LeagueStandings }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };
