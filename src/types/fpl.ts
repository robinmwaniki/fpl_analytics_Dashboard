export interface ElementType {
  id: number;
  singular_name_short: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  strength: number;
}

export interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  form: string;
  selected_by_percent: string;
  bonus: number;
  bps: number;
  minutes: number;
  ict_index: string;
  ep_next: string;
  news: string;
  status: string;
}

export interface Event {
  id: number;
  name: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
}

export interface FPLData {
  events: Event[];
  teams: Team[];
  elements: Player[];
  element_types: ElementType[];
}

export interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string;
}