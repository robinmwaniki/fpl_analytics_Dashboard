export interface ManagerPick {
  element: number;
  /** 1-11 are starters, 12-15 are the bench in substitution order. */
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface EntryHistory {
  event: number;
  points: number;
  overall_rank: number;
  /** Money in the bank, in tenths of a million. */
  bank: number;
  /** Squad value, in tenths of a million. */
  value: number;
}

export interface ManagerPicks {
  active_chip: string | null;
  entry_history: EntryHistory;
  picks: ManagerPick[];
}

export type ManagerPicksResult =
  | { status: 'ok'; data: ManagerPicks }
  | { status: 'not-found' }
  | { status: 'unavailable' };