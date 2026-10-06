import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Crown,
  Flame,
  Gem,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardData, ElementType, Player, Team } from './types/fpl';
import { loadDashboardData } from './services/fplService';
import CaptainPicker from './components/CaptainPicker';
import ValueFinder from './components/ValueFinder';
import { DIFFICULTY_STYLES, getStartGameweek, toFixtureCell } from './lib/fixtures';
import { formatPrice } from './lib/format';

type TabId = 'overview' | 'explorer' | 'compare' | 'fdr' | 'captain' | 'value';
type SortKey = 'total_points' | 'now_cost' | 'form' | 'goals_scored' | 'assists';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Dashboard Overview', icon: Activity },
  { id: 'explorer', label: 'Player Explorer', icon: Search },
  { id: 'compare', label: 'Compare Players', icon: ArrowUpDown },
  { id: 'fdr', label: 'FDR Planner', icon: Shield },
  { id: 'captain', label: 'Captain Picker', icon: Crown },
  { id: 'value', label: 'Value Finder', icon: Gem },
];

const FDR_WINDOW = 5;
const EXPLORER_ROW_LIMIT = 100;

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | 'all'>('all');
  const [selectedPos, setSelectedPos] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('total_points');

  // Player selection
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [comp1Id, setComp1Id] = useState<number | null>(null);
  const [comp2Id, setComp2Id] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((result) => {
      if (!cancelled) setDashboard(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlayer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPlayer(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPlayer]);

  const fplData = dashboard?.data ?? null;
  const fixtures = dashboard?.fixtures;

  const teamMap = useMemo(
    () => new Map<number, Team>((fplData?.teams ?? []).map((t) => [t.id, t])),
    [fplData]
  );

  const posMap = useMemo(
    () => new Map<number, ElementType>((fplData?.element_types ?? []).map((p) => [p.id, p])),
    [fplData]
  );

  const topScorers = useMemo(
    () => [...(fplData?.elements ?? [])].sort((a, b) => b.total_points - a.total_points),
    [fplData]
  );

  const highestForm = useMemo(
    () =>
      (fplData?.elements ?? []).reduce<Player | null>(
        (best, p) => (best === null || Number(p.form) > Number(best.form) ? p : best),
        null
      ),
    [fplData]
  );

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (fplData?.elements ?? [])
      .filter((p) => {
        const matchesName = `${p.first_name} ${p.second_name} ${p.web_name}`
          .toLowerCase()
          .includes(query);
        const matchesTeam = selectedTeam === 'all' || p.team === selectedTeam;
        const matchesPos = selectedPos === 'all' || p.element_type === selectedPos;
        return matchesName && matchesTeam && matchesPos;
      })
      .sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0));
  }, [fplData, searchQuery, selectedTeam, selectedPos, sortBy]);

  const fdrRows = useMemo(() => {
    if (!fplData || !fixtures) return [];

    const startGw = getStartGameweek(fplData.events);
    const endGw = startGw + FDR_WINDOW - 1;

    const upcoming = fixtures
      .filter((f) => !f.finished && f.event !== null && f.event >= startGw && f.event <= endGw)
      .sort((a, b) => (a.event ?? 0) - (b.event ?? 0));

    return fplData.teams
      .map((team) => {
        const cells = upcoming
          .filter((f) => f.team_h === team.id || f.team_a === team.id)
          .map((f) => toFixtureCell(f, team.id, teamMap));
        const average =
          cells.length > 0 ? cells.reduce((sum, c) => sum + c.difficulty, 0) / cells.length : null;
        return { team, cells, average };
      })
      .sort((a, b) => (a.average ?? Infinity) - (b.average ?? Infinity));
  }, [fplData, fixtures, teamMap]);

  if (!dashboard || !fplData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <h2 className="text-xl font-bold">Loading FPL Intelligence Data...</h2>
        <p className="text-slate-400 text-sm mt-1">Fetching live statistics and fixture difficulties</p>
      </div>
    );
  }

  const { isMock } = dashboard;
  const leader = topScorers[0];
  const leaderTeam = leader ? teamMap.get(leader.team) : undefined;
  const teamTopPerformers = leader ? topScorers.filter((p) => p.team === leader.team).slice(0, 3) : [];
  const activeGw =
    fplData.events.find((e) => e.is_current)?.id ?? fplData.events.find((e) => e.is_next)?.id ?? 1;

  const compPlayer1 = fplData.elements.find((p) => p.id === comp1Id) ?? topScorers[0];
  const compPlayer2 = fplData.elements.find((p) => p.id === comp2Id) ?? topScorers[1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
              FPL
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Premier League Analytics <Sparkles className="w-4 h-4 text-emerald-400" />
              </h1>
              <p className="text-xs text-slate-400">TypeScript & React Portfolio Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isMock ? (
              <span className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <CircleAlert className="w-3.5 h-3.5" /> Mock Data Mode
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CircleCheck className="w-3.5 h-3.5" /> Live FPL API Linked
              </span>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 flex space-x-2 border-t border-slate-800/60 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Players" value={fplData.elements.length} icon={Users} color="cyan" />
              <StatCard
                title="Top Scorer"
                value={leader?.web_name ?? 'N/A'}
                sub={leader ? `${leader.total_points} pts` : undefined}
                icon={Trophy}
                color="emerald"
              />
              <StatCard
                title="Highest Form"
                value={highestForm?.web_name ?? 'N/A'}
                sub={highestForm ? `Form ${highestForm.form}` : undefined}
                icon={Flame}
                color="pink"
              />
              <StatCard title="Active GW" value={`GW ${activeGw}`} icon={Activity} color="purple" />
            </div>

            {leader && leaderTeam && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
                      {leaderTeam.name} Top Performers
                    </h2>
                    <p className="text-xs text-slate-400">Squad of the current points leader</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam(leader.team);
                      setActiveTab('explorer');
                    }}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                  >
                    View full squad <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teamTopPerformers.map((player) => (
                    <div
                      key={player.id}
                      className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {player.first_name} {player.second_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatPrice(player.now_cost)} • Form: {player.form}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-emerald-400">{player.total_points}</span>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Overall Points Leaders</h2>
              <PlayerTable
                players={topScorers.slice(0, 5)}
                teamMap={teamMap}
                posMap={posMap}
                onSelect={setSelectedPlayer}
              />
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search player name..."
                  aria-label="Search player name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                aria-label="Filter by team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Teams</option>
                {fplData.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by position"
                value={selectedPos}
                onChange={(e) => setSelectedPos(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Positions</option>
                {fplData.element_types.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.singular_name_short}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort players"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="total_points">Sort by Total Points</option>
                <option value="now_cost">Sort by Cost</option>
                <option value="form">Sort by Form</option>
                <option value="goals_scored">Sort by Goals</option>
                <option value="assists">Sort by Assists</option>
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <PlayerTable
                players={filteredPlayers.slice(0, EXPLORER_ROW_LIMIT)}
                teamMap={teamMap}
                posMap={posMap}
                onSelect={setSelectedPlayer}
              />
              <p className="text-xs text-slate-500 mt-4">
                Showing {Math.min(filteredPlayers.length, EXPLORER_ROW_LIMIT)} of {filteredPlayers.length}{' '}
                players
              </p>
            </div>
          </div>
        )}

        {activeTab === 'compare' && compPlayer1 && compPlayer2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlayerSelectCard
                label="Player 1"
                player={compPlayer1}
                allPlayers={topScorers}
                onSelect={setComp1Id}
              />
              <PlayerSelectCard
                label="Player 2"
                player={compPlayer2}
                allPlayers={topScorers}
                onSelect={setComp2Id}
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-6 text-center">Head to Head Metric Comparison</h3>
              <StatComparisonRow
                label="Price"
                val1={formatPrice(compPlayer1.now_cost)}
                val2={formatPrice(compPlayer2.now_cost)}
                raw1={compPlayer1.now_cost}
                raw2={compPlayer2.now_cost}
                lowerIsBetter
              />
              <StatComparisonRow
                label="Total Points"
                val1={compPlayer1.total_points}
                val2={compPlayer2.total_points}
                raw1={compPlayer1.total_points}
                raw2={compPlayer2.total_points}
              />
              <StatComparisonRow
                label="Form"
                val1={compPlayer1.form}
                val2={compPlayer2.form}
                raw1={Number(compPlayer1.form)}
                raw2={Number(compPlayer2.form)}
              />
              <StatComparisonRow
                label="Goals"
                val1={compPlayer1.goals_scored}
                val2={compPlayer2.goals_scored}
                raw1={compPlayer1.goals_scored}
                raw2={compPlayer2.goals_scored}
              />
              <StatComparisonRow
                label="Assists"
                val1={compPlayer1.assists}
                val2={compPlayer2.assists}
                raw1={compPlayer1.assists}
                raw2={compPlayer2.assists}
              />
              <StatComparisonRow
                label="Ownership"
                val1={`${compPlayer1.selected_by_percent}%`}
                val2={`${compPlayer2.selected_by_percent}%`}
                raw1={Number(compPlayer1.selected_by_percent)}
                raw2={Number(compPlayer2.selected_by_percent)}
              />
            </div>
          </div>
        )}

        {activeTab === 'captain' && (
          <CaptainPicker
            players={fplData.elements}
            events={fplData.events}
            fixtures={dashboard.fixtures}
            teamMap={teamMap}
            posMap={posMap}
            onSelect={setSelectedPlayer}
          />
        )}

        {activeTab === 'value' && (
          <ValueFinder
            players={fplData.elements}
            elementTypes={fplData.element_types}
            teamMap={teamMap}
            posMap={posMap}
            onSelect={setSelectedPlayer}
          />
        )}

        {activeTab === 'fdr' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Fixture Difficulty Rating (FDR) Planner</h2>
            <p className="text-xs text-slate-400 mb-6">
              Next {FDR_WINDOW} gameweeks, easiest run first. Green indicates easier fixtures; red indicates
              tough opponents. Capitals are home games, lowercase are away.
            </p>

            {fdrRows.length === 0 || fdrRows.every((row) => row.cells.length === 0) ? (
              <p className="text-sm text-slate-400">Fixture data is currently unavailable.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Team</th>
                    <th className="p-3 text-center">Next {FDR_WINDOW} GWs</th>
                    <th className="p-3 text-right">Avg</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                  {fdrRows.map(({ team, cells, average }) => (
                    <tr key={team.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{team.name}</td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {cells.map((cell) => (
                            <span
                              key={cell.fixtureId}
                              title={`GW ${cell.event}: ${cell.opponent} (${cell.isHome ? 'H' : 'A'}), difficulty ${cell.difficulty}`}
                              className={`min-w-14 px-2 h-8 rounded-lg flex items-center justify-center text-xs ${
                                DIFFICULTY_STYLES[cell.difficulty] ?? DIFFICULTY_STYLES[3]
                              }`}
                            >
                                {cell.isHome ? cell.opponent.toUpperCase() : cell.opponent.toLowerCase()}
                              </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-200">
                        {average === null ? '–' : average.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedPlayer.first_name} ${selectedPlayer.second_name} details`}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold text-xl">
                {posMap.get(selectedPlayer.element_type)?.singular_name_short}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedPlayer.first_name} {selectedPlayer.second_name}
                </h3>
                <p className="text-sm text-slate-400">
                  {teamMap.get(selectedPlayer.team)?.name} • {formatPrice(selectedPlayer.now_cost)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-xs text-slate-500">Total Points</p>
                <p className="text-xl font-extrabold text-emerald-400">{selectedPlayer.total_points}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-xs text-slate-500">Form</p>
                <p className="text-xl font-extrabold text-cyan-400">{selectedPlayer.form}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-xs text-slate-500">Goals / Assists</p>
                <p className="text-xl font-extrabold text-white">
                  {selectedPlayer.goals_scored} / {selectedPlayer.assists}
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-xs text-slate-500">Ownership</p>
                <p className="text-xl font-extrabold text-purple-400">{selectedPlayer.selected_by_percent}%</p>
              </div>
            </div>

            {selectedPlayer.news && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6">
                {selectedPlayer.news}
              </p>
            )}

            <button
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: 'cyan' | 'emerald' | 'pink' | 'purple';
}

function StatCard({ title, value, sub, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-black text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

interface PlayerTableProps {
  players: Player[];
  teamMap: Map<number, Team>;
  posMap: Map<number, ElementType>;
  onSelect: (p: Player) => void;
}

function PlayerTable({ players, teamMap, posMap, onSelect }: PlayerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
        <tr>
          <th className="p-3">Player</th>
          <th className="p-3">Team</th>
          <th className="p-3">Pos</th>
          <th className="p-3">Price</th>
          <th className="p-3">Form</th>
          <th className="p-3 text-right">Points</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
        {players.map((p) => (
          <tr
            key={p.id}
            tabIndex={0}
            onClick={() => onSelect(p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(p);
              }
            }}
            className="hover:bg-slate-800/40 focus:bg-slate-800/40 focus:outline-none cursor-pointer transition"
          >
            <td className="p-3 font-semibold text-white">
              {p.first_name} {p.second_name}
            </td>
            <td className="p-3 text-slate-400">{teamMap.get(p.team)?.short_name}</td>
            <td className="p-3 text-slate-400">{posMap.get(p.element_type)?.singular_name_short}</td>
            <td className="p-3">{formatPrice(p.now_cost)}</td>
            <td className="p-3 text-cyan-400 font-medium">{p.form}</td>
            <td className="p-3 text-right font-bold text-emerald-400">{p.total_points}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

interface PlayerSelectCardProps {
  label: string;
  player: Player;
  allPlayers: Player[];
  onSelect: (id: number) => void;
}

function PlayerSelectCard({ label, player, allPlayers, onSelect }: PlayerSelectCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
      <label className="text-xs text-slate-400 uppercase tracking-wider font-bold block">
        {label}
        <select
          value={player.id}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm normal-case tracking-normal font-normal text-white focus:outline-none focus:border-emerald-500"
        >
          {allPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.second_name} ({p.total_points} pts)
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface StatComparisonRowProps {
  label: string;
  val1: string | number;
  val2: string | number;
  raw1: number;
  raw2: number;
  lowerIsBetter?: boolean;
}

function StatComparisonRow({ label, val1, val2, raw1, raw2, lowerIsBetter = false }: StatComparisonRowProps) {
  const is1Better = lowerIsBetter ? raw1 < raw2 : raw1 > raw2;
  const is2Better = lowerIsBetter ? raw2 < raw1 : raw2 > raw1;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
      <span className={`font-bold w-1/3 text-left ${is1Better ? 'text-emerald-400' : 'text-slate-300'}`}>
        {val1}
      </span>
      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center w-1/3">
        {label}
      </span>
      <span className={`font-bold w-1/3 text-right ${is2Better ? 'text-emerald-400' : 'text-slate-300'}`}>
        {val2}
      </span>
    </div>
  );
}