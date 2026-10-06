import { useMemo } from 'react';
import type { Event, ElementType, Fixture, Player, Team } from '../types/fpl';
import { captainScore, DIFFERENTIAL_OWNERSHIP_PCT, isAvailable, toNumber } from '../lib/analytics';
import { DIFFICULTY_STYLES, getStartGameweek, getTeamFixtures } from '../lib/fixtures';

const TOP_N = 10;

interface CaptainPickerProps {
  players: Player[];
  events: Event[];
  fixtures: Fixture[];
  teamMap: Map<number, Team>;
  posMap: Map<number, ElementType>;
  onSelect: (player: Player) => void;
}

export default function CaptainPicker({
                                        players,
                                        events,
                                        fixtures,
                                        teamMap,
                                        posMap,
                                        onSelect,
                                      }: CaptainPickerProps) {
  const gameweek = getStartGameweek(events);

  const candidates = useMemo(
    () =>
      players
        .filter((p) => isAvailable(p) && p.minutes > 0)
        .map((player) => ({ player, score: captainScore(player) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_N)
        .map(({ player, score }) => ({
          player,
          score,
          upcoming: getTeamFixtures(fixtures, player.team, gameweek, gameweek, teamMap),
        })),
    [players, fixtures, gameweek, teamMap]
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-1">Captain Picker — GW {gameweek}</h2>
      <p className="text-xs text-slate-400 mb-6">
        Ranked by a blend of expected points (60%) and recent form (40%). Only fully fit players who have
        played this season are included. Differentials are owned by under {DIFFERENTIAL_OWNERSHIP_PCT}% of
        managers.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Player</th>
            <th className="p-3">Pos</th>
            <th className="p-3">Fixture</th>
            <th className="p-3">xPts</th>
            <th className="p-3">Form</th>
            <th className="p-3">Owned</th>
            <th className="p-3 text-right">Score</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
          {candidates.map(({ player, score, upcoming }, index) => (
            <tr
              key={player.id}
              tabIndex={0}
              onClick={() => onSelect(player)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(player);
                }
              }}
              className="hover:bg-slate-800/40 focus:bg-slate-800/40 focus:outline-none cursor-pointer transition"
            >
              <td className="p-3 text-slate-500 font-semibold">{index + 1}</td>
              <td className="p-3">
                <span className="font-semibold text-white">{player.web_name}</span>
                <span className="text-slate-500 ml-2 text-xs">{teamMap.get(player.team)?.short_name}</span>
                {toNumber(player.selected_by_percent) < DIFFERENTIAL_OWNERSHIP_PCT && (
                  <span className="ml-2 text-[10px] uppercase font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5">
                      Differential
                    </span>
                )}
              </td>
              <td className="p-3 text-slate-400">{posMap.get(player.element_type)?.singular_name_short}</td>
              <td className="p-3">
                <div className="flex gap-1.5 flex-wrap">
                  {upcoming.length === 0 ? (
                    <span className="text-xs text-slate-500">No fixture</span>
                  ) : (
                    upcoming.map((cell) => (
                      <span
                        key={cell.fixtureId}
                        title={`Difficulty ${cell.difficulty}`}
                        className={`px-2 h-6 rounded-md flex items-center text-xs ${
                          DIFFICULTY_STYLES[cell.difficulty] ?? DIFFICULTY_STYLES[3]
                        }`}
                      >
                          {cell.isHome ? cell.opponent.toUpperCase() : cell.opponent.toLowerCase()}
                        </span>
                    ))
                  )}
                </div>
              </td>
              <td className="p-3 text-cyan-400 font-medium">{player.ep_next}</td>
              <td className="p-3 text-cyan-400 font-medium">{player.form}</td>
              <td className="p-3">{player.selected_by_percent}%</td>
              <td className="p-3 text-right font-bold text-emerald-400">{score.toFixed(2)}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {candidates.length === 0 && (
        <p className="text-sm text-slate-400 mt-4">No eligible players found yet.</p>
      )}
    </div>
  );
}