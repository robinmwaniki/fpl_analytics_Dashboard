import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Search, Trophy } from 'lucide-react';
import { fetchLeagueStandings, fetchManagerOverview } from '../services/managerAnalyticsService';
import { readStoredManagerId, storeManagerId } from '../services/managerService';
import type { LeagueStandingsResult, ManagerOverviewResult } from '../types/managerAnalytics';

type OverviewState = ManagerOverviewResult | { status: 'idle' | 'loading' };
type StandingsState = LeagueStandingsResult | { status: 'idle' | 'loading' };

export default function ManagerAnalyticsPanel() {
  const [managerId, setManagerId] = useState(readStoredManagerId());
  const [overview, setOverview] = useState<OverviewState>({ status: 'idle' });
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingsState>({ status: 'idle' });
  const [page, setPage] = useState(1);

  const loadLeaguePage = async (leagueId: number, nextPage: number) => {
    setStandings({ status: 'loading' });
    setPage(nextPage);
    setStandings(await fetchLeagueStandings(leagueId, nextPage));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedId = Number(managerId.trim());

    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      setOverview({ status: 'unavailable', message: 'Enter a valid numeric FPL manager ID.' });
      setStandings({ status: 'idle' });
      return;
    }

    storeManagerId(parsedId);
    setOverview({ status: 'loading' });
    setStandings({ status: 'idle' });
    setSelectedLeagueId(null);

    const result = await fetchManagerOverview(parsedId);
    setOverview(result);

    if (result.status === 'ok' && result.profile.leagues.classic.length > 0) {
      const firstLeague = result.profile.leagues.classic[0];
      setSelectedLeagueId(firstLeague.id);
      await loadLeaguePage(firstLeague.id, 1);
    }
  };

  const handleLeagueChange = async (value: string) => {
    const leagueId = Number(value);
    if (!Number.isSafeInteger(leagueId) || leagueId <= 0) return;
    setSelectedLeagueId(leagueId);
    await loadLeaguePage(leagueId, 1);
  };

  const profile = overview.status === 'ok' ? overview.profile : null;
  const history = overview.status === 'ok'
    ? [...overview.history].sort((a, b) => a.event - b.event)
    : [];
  const historyPoints = history.reduce((sum, item) => sum + item.points, 0);
  const averagePoints = history.length > 0 ? historyPoints / history.length : 0;
  const chartWidth = 560;
  const chartHeight = 180;
  const left = 28;
  const right = 532;
  const top = 20;
  const bottom = 140;
  const maxPoints = Math.max(5, ...history.map((item) => item.points));
  const points = history.map((item, index) => ({
    event: item.event,
    points: item.points,
    x: left + (index / Math.max(history.length - 1, 1)) * (right - left),
    y: bottom - (item.points / maxPoints) * (bottom - top),
  }));
  const linePoints = points.map((point) => point.x + ',' + point.y).join(' ');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Manager analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review a public FPL manager's season performance and classic mini-league standings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              FPL manager ID
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              placeholder="Enter your manager ID"
              aria-label="FPL manager ID"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={overview.status === 'loading'}
            className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {overview.status === 'loading' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {overview.status === 'loading' ? 'Loading...' : 'Load manager'}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Only public FPL profile, season history and classic league data are requested. No FPL password or private session is needed.
        </p>
      </section>

      {overview.status === 'idle' && (
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
          <Trophy className="mx-auto h-9 w-9 text-slate-600" />
          <h3 className="mt-3 font-semibold text-white">Start with your manager ID</h3>
          <p className="mt-1 text-sm text-slate-400">Your points, overall rank and mini-league performance will appear here.</p>
        </section>
      )}

      {overview.status === 'loading' && (
        <section aria-live="polite" className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-slate-300">Loading manager profile and season history...</p>
        </section>
      )}

      {overview.status === 'not-found' && (
        <section role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="font-semibold text-amber-200">Manager not found</h3>
          <p className="mt-1 text-sm text-slate-300">Check the ID and make sure the FPL team profile is public.</p>
        </section>
      )}

      {overview.status === 'unavailable' && (
        <section role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="font-semibold text-amber-200">Manager data unavailable</h3>
          <p className="mt-1 text-sm text-slate-300">{overview.message}</p>
        </section>
      )}

      {profile && (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Manager profile</p>
                <h3 className="mt-1 text-xl font-extrabold text-white">{profile.name}</h3>
                <p className="text-sm text-slate-400">
                  {profile.player_first_name} {profile.player_last_name} · ID {profile.id}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {profile.current_event ? 'Gameweek ' + profile.current_event : 'Season overview'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Overall points" value={profile.summary_overall_points?.toLocaleString() ?? '—'} />
              <MetricCard label="Overall rank" value={profile.summary_overall_rank?.toLocaleString() ?? '—'} />
              <MetricCard label="Latest GW points" value={profile.summary_event_points?.toLocaleString() ?? '—'} />
              <MetricCard label="Latest GW rank" value={profile.summary_event_rank?.toLocaleString() ?? '—'} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-white">Season performance</h3>
                <p className="mt-1 text-xs text-slate-500">Points scored in each gameweek</p>
              </div>
              {history.length > 0 && (
                <span className="text-xs text-slate-400">{history.length} gameweeks recorded</span>
              )}
            </div>

            {history.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <MetricCard label="Points in history" value={historyPoints.toLocaleString()} compact />
                  <MetricCard label="Average per GW" value={averagePoints.toFixed(1)} compact />
                </div>
                <svg
                  viewBox={'0 0 ' + chartWidth + ' ' + chartHeight}
                  role="img"
                  aria-label="Manager points by gameweek"
                  className="h-auto w-full"
                >
                  {[0, 1, 2, 3].map((step) => {
                    const y = top + (step / 3) * (bottom - top);
                    return <line key={step} x1={left} y1={y} x2={right} y2={y} stroke="#334155" strokeDasharray="4 5" />;
                  })}
                  <polyline points={linePoints} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((point) => (
                    <g key={point.event}>
                      <circle cx={point.x} cy={point.y} r="4" fill="#22d3ee" />
                      <text x={point.x} y="164" fill="#94a3b8" fontSize="10" textAnchor="middle">{point.event}</text>
                    </g>
                  ))}
                </svg>
                <p className="text-center text-[10px] uppercase tracking-wider text-slate-600">Gameweek number</p>
              </>
            ) : (
              <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-400">
                No gameweek history is available yet for this season.
              </p>
            )}

            {overview.status === 'ok' && overview.historyMessage && (
              <p className="mt-3 text-xs text-amber-300">{overview.historyMessage}</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-bold text-white">Classic mini-league standings</h3>
                <p className="mt-1 text-xs text-slate-500">Browse public league rankings page by page.</p>
              </div>
              {profile.leagues.classic.length > 0 && (
                <label className="w-full sm:max-w-sm">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Select league</span>
                  <select
                    value={selectedLeagueId ?? ''}
                    onChange={(event) => void handleLeagueChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    {profile.leagues.classic.map((league) => (
                      <option key={league.id} value={league.id}>{league.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {profile.leagues.classic.length === 0 && (
              <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-400">This manager has no public classic leagues available.</p>
            )}

            {standings.status === 'loading' && (
              <div aria-live="polite" className="flex items-center gap-2 py-6 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" /> Loading league standings...
              </div>
            )}

            {standings.status === 'not-found' && (
              <p role="alert" className="rounded-xl bg-amber-500/5 p-4 text-sm text-amber-200">This league could not be found.</p>
            )}

            {standings.status === 'unavailable' && (
              <p role="alert" className="rounded-xl bg-amber-500/5 p-4 text-sm text-amber-200">{standings.message}</p>
            )}

            {standings.status === 'ok' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Manager</th>
                        <th className="p-3 text-right">GW points</th>
                        <th className="p-3 text-right">Total points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {standings.data.results.map((entry) => (
                        <tr key={entry.entry} className={entry.entry === profile.id ? 'bg-emerald-500/5' : ''}>
                          <td className="p-3 font-semibold text-slate-300">{entry.rank}</td>
                          <td className="p-3">
                            <p className="font-semibold text-white">{entry.player_name}</p>
                            <p className="text-xs text-slate-500">{entry.entry_name}</p>
                          </td>
                          <td className="p-3 text-right text-slate-300">{entry.event_total}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">{entry.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {standings.data.results.length === 0 && (
                  <p className="py-5 text-center text-sm text-slate-400">No managers were returned for this page.</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => selectedLeagueId && void loadLeaguePage(selectedLeagueId, Math.max(1, page - 1))}
                    disabled={page <= 1 || standings.status === 'loading'}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-xs text-slate-500">Page {standings.data.page}</span>
                  <button
                    type="button"
                    onClick={() => selectedLeagueId && void loadLeaguePage(selectedLeagueId, page + 1)}
                    disabled={!standings.data.has_next || standings.status === 'loading'}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={compact ? 'mt-1 text-lg font-extrabold text-white' : 'mt-1 text-xl font-extrabold text-white'}>
        {value}
      </p>
    </div>
  );
}
