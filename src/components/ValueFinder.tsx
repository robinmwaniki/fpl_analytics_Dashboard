import { useMemo, useState } from 'react';
import type { ElementType, Player, Team } from '../types/fpl';
import { MIN_MINUTES_FOR_VALUE, pointsPerMillion } from '../lib/analytics';
import { formatPrice } from '../lib/format';

const TOP_N = 25;

/** Price caps in FPL's tenths-of-a-million units. */
const PRICE_CAPS: { label: string; value: number | 'any' }[] = [
  { label: 'Any price', value: 'any' },
  { label: 'Up to £5.0m', value: 50 },
  { label: 'Up to £6.0m', value: 60 },
  { label: 'Up to £7.5m', value: 75 },
  { label: 'Up to £10.0m', value: 100 },
];

interface ValueFinderProps {
  players: Player[];
  teamMap: Map<number, Team>;
  posMap: Map<number, ElementType>;
  elementTypes: ElementType[];
  onSelect: (player: Player) => void;
}

export default function ValueFinder({ players, teamMap, posMap, elementTypes, onSelect }: ValueFinderProps) {
  const [position, setPosition] = useState<number | 'all'>('all');
  const [priceCap, setPriceCap] = useState<number | 'any'>('any');

  const ranked = useMemo(
    () =>
      players
        .filter(
          (p) =>
            p.minutes >= MIN_MINUTES_FOR_VALUE &&
            (position === 'all' || p.element_type === position) &&
            (priceCap === 'any' || p.now_cost <= priceCap)
        )
        .map((player) => ({ player, value: pointsPerMillion(player) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_N),
    [players, position, priceCap]
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          aria-label="Filter by position"
          value={position}
          onChange={(e) => setPosition(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Positions</option>
          {elementTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.singular_name_short}
            </option>
          ))}
        </select>

        <select
          aria-label="Maximum price"
          value={priceCap}
          onChange={(e) => setPriceCap(e.target.value === 'any' ? 'any' : Number(e.target.value))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          {PRICE_CAPS.map((cap) => (
            <option key={cap.label} value={cap.value}>
              {cap.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">Value Finder</h2>
        <p className="text-xs text-slate-400 mb-6">
          Total points per £1m of price. Players with under {MIN_MINUTES_FOR_VALUE} minutes are excluded
          because small samples distort the ratio.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Player</th>
              <th className="p-3">Team</th>
              <th className="p-3">Pos</th>
              <th className="p-3">Price</th>
              <th className="p-3">Points</th>
              <th className="p-3 text-right">Pts / £m</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
            {ranked.map(({ player, value }, index) => (
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
                <td className="p-3 font-semibold text-white">{player.web_name}</td>
                <td className="p-3 text-slate-400">{teamMap.get(player.team)?.short_name}</td>
                <td className="p-3 text-slate-400">{posMap.get(player.element_type)?.singular_name_short}</td>
                <td className="p-3">{formatPrice(player.now_cost)}</td>
                <td className="p-3">{player.total_points}</td>
                <td className="p-3 text-right font-bold text-emerald-400">{value.toFixed(2)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        {ranked.length === 0 && (
          <p className="text-sm text-slate-400 mt-4">No players match these filters.</p>
        )}
      </div>
    </div>
  );
}