import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { fetchPlayerHistory } from '../services/playerHistoryService';
import type { PlayerHistoryResult } from '../types/playerHistory';
import type { Team } from '../types/fpl';

type HistoryViewState = PlayerHistoryResult | { status: 'loading' };

interface PlayerHistoryPanelProps {
  playerId: number;
  teamMap: Map<number, Team>;
}

export default function PlayerHistoryPanel({ playerId, teamMap }: PlayerHistoryPanelProps) {
  const [state, setState] = useState<HistoryViewState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    fetchPlayerHistory(playerId).then((result) => {
      if (active) setState(result);
    });

    return () => {
      active = false;
    };
  }, [playerId, retryCount]);

  const history = useMemo(
    () => state.status === 'ok' ? [...state.history].sort((a, b) => a.round - b.round) : [],
    [state],
  );

  const retry = () => {
    setState({ status: 'loading' });
    setRetryCount((count) => count + 1);
  };

  if (state.status === 'loading') {
    return (
      <section aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
          Loading gameweek history...
        </div>
      </section>
    );
  }

  if (state.status === 'not-found') {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <h4 className="font-semibold text-white">Recent gameweek performance</h4>
        <p className="mt-2 text-sm text-slate-400">No public match history was found for this player.</p>
      </section>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <section role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h4 className="font-semibold text-amber-200">Match history unavailable</h4>
        <p className="mt-1 text-sm text-slate-300">{state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </section>
    );
  }

  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <h4 className="font-semibold text-white">Recent gameweek performance</h4>
        <p className="mt-2 text-sm text-slate-400">No completed gameweek history is available yet.</p>
      </section>
    );
  }

  const chartWidth = 560;
  const chartHeight = 190;
  const left = 28;
  const right = 532;
  const top = 24;
  const bottom = 150;
  const maxPoints = Math.max(5, ...history.map((entry) => entry.total_points));
  const coordinates = history.map((entry, index) => ({
    round: entry.round,
    points: entry.total_points,
    x: left + (index / Math.max(history.length - 1, 1)) * (right - left),
    y: bottom - (entry.total_points / maxPoints) * (bottom - top),
  }));
  const linePoints = coordinates.map((point) => point.x + ',' + point.y).join(' ');
  const totalPoints = history.reduce((sum, entry) => sum + entry.total_points, 0);
  const averagePoints = totalPoints / history.length;
  const recent = [...history].slice(-5).reverse();

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <Activity className="h-4 w-4 text-emerald-400" />
            Gameweek performance
          </h4>
          <p className="mt-1 text-xs text-slate-500">Historical FPL points by gameweek</p>
        </div>
        <span className="text-xs text-slate-500">{history.length} gameweeks</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">History points</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-400">{totalPoints}</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Average / GW</p>
          <p className="mt-1 text-xl font-extrabold text-cyan-400">{averagePoints.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">Best gameweek</p>
          <p className="mt-1 text-xl font-extrabold text-white">
            {Math.max(...history.map((entry) => entry.total_points))} pts
          </p>
        </div>
      </div>

      <div className="overflow-hidden">
        <svg
          viewBox={'0 0 ' + chartWidth + ' ' + chartHeight}
          role="img"
          aria-label="Player points by gameweek line chart"
          className="h-auto w-full"
        >
          {[0, 1, 2, 3].map((step) => {
            const y = top + (step / 3) * (bottom - top);
            return <line key={step} x1={left} y1={y} x2={right} y2={y} stroke="#334155" strokeDasharray="4 5" />;
          })}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coordinates.map((point) => (
            <g key={point.round}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#34d399" stroke="#052e2b" strokeWidth="2" />
              <text x={point.x} y="174" fill="#94a3b8" fontSize="10" textAnchor="middle">
                {point.round}
              </text>
            </g>
          ))}
        </svg>
        <p className="text-center text-[10px] uppercase tracking-wider text-slate-600">Gameweek number</p>
      </div>

      <div>
        <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Recent gameweeks</h5>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {recent.map((entry) => (
            <div key={entry.round} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-slate-500">GW {entry.round}</span>
                <span className="text-sm font-extrabold text-emerald-400">{entry.total_points} pts</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-white">
                {teamMap.get(entry.opponent_team)?.short_name ?? 'OPP'} {entry.was_home ? '(H)' : '(A)'}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {entry.minutes} min · {entry.goals_scored} G · {entry.assists} A
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
