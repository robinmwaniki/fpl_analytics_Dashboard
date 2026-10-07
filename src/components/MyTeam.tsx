import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ElementType, FPLData, Fixture, Player, Team } from '../types/fpl';
import type { ManagerPicksResult } from '../types/manager';
import { fetchManagerPicks, readStoredManagerId, storeManagerId } from '../services/managerService';
import { DIFFICULTY_STYLES, getStartGameweek, getTeamFixtures } from '../lib/fixtures';
import { formatPrice } from '../lib/format';
import {
  analyseSquad,
  buildSquad,
  getFlag,
  getPicksGameweek,
  getPlayingTeams,
  suggestTransfers,
} from '../lib/squad';
import type { SquadMember } from '../lib/squad';

interface MyTeamProps {
  data: FPLData;
  fixtures: Fixture[];
  isMock: boolean;
  teamMap: Map<number, Team>;
  posMap: Map<number, ElementType>;
  onSelect: (player: Player) => void;
}

export default function MyTeam({ data, fixtures, isMock, teamMap, posMap, onSelect }: MyTeamProps) {
  const [savedId] = useState(readStoredManagerId);
  const [input, setInput] = useState(savedId);
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(savedId !== '' && !isMock);
  const [result, setResult] = useState<ManagerPicksResult | null>(null);

  const picksGw = getPicksGameweek(data.events);
  const adviceGw = getStartGameweek(data.events);

  // Reload the remembered team automatically.
  useEffect(() => {
    if (!savedId || isMock) return;
    let cancelled = false;
    fetchManagerPicks(Number(savedId), picksGw).then((next) => {
      if (cancelled) return;
      setResult(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [savedId, picksGw, isMock]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = Number(input.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setInputError('Enter your numeric FPL team ID.');
      return;
    }
    setInputError(null);
    setLoading(true);
    const next = await fetchManagerPicks(id, picksGw);
    setResult(next);
    setLoading(false);
    if (next.status === 'ok') storeManagerId(id);
  };

  const playerMap = useMemo(() => new Map(data.elements.map((p) => [p.id, p])), [data.elements]);
  const playingTeams = useMemo(() => getPlayingTeams(fixtures, adviceGw), [fixtures, adviceGw]);

  const managerPicks = result?.status === 'ok' ? result.data : null;

  const advice = useMemo(() => {
    if (!managerPicks) return null;
    const squad = buildSquad(managerPicks.picks, playerMap, playingTeams);
    if (squad.length !== managerPicks.picks.length) return null;
    const analysis = analyseSquad(squad);
    const transfers = suggestTransfers(
      squad,
      analysis.suggestedXI,
      data.elements,
      managerPicks.entry_history.bank,
      playingTeams
    );
    return { analysis, transfers };
  }, [managerPicks, playerMap, playingTeams, data.elements]);

  const upcomingFor = (player: Player) =>
    getTeamFixtures(fixtures, player.team, adviceGw, adviceGw, teamMap);

  const renderRow = (member: SquadMember, role: 'C' | 'VC' | null, moved: 'in' | 'out' | null) => {
    const { player, score } = member;
    const flag = getFlag(player, playingTeams);
    const upcoming = upcomingFor(player);

    return (
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
        <td className="p-3 text-slate-400">{posMap.get(player.element_type)?.singular_name_short}</td>
        <td className="p-3">
          <span className="font-semibold text-white">{player.web_name}</span>
          <span className="text-slate-500 ml-2 text-xs">{teamMap.get(player.team)?.short_name}</span>
          {role && (
            <span className="ml-2 text-[10px] font-bold text-slate-950 bg-emerald-400 rounded-full px-2 py-0.5">
              {role}
            </span>
          )}
          {moved === 'in' && (
            <span className="ml-2 text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              Start
            </span>
          )}
          {moved === 'out' && (
            <span className="ml-2 text-[10px] uppercase font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              Bench
            </span>
          )}
          {flag && <p className="text-xs text-amber-400 mt-1">{flag}</p>}
        </td>
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
        <td className="p-3 text-slate-400">{formatPrice(player.now_cost)}</td>
        <td className="p-3 text-right font-bold text-emerald-400">{score.toFixed(2)}</td>
      </tr>
    );
  };

  const tableHead = (
    <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
    <tr>
      <th className="p-3">Pos</th>
      <th className="p-3">Player</th>
      <th className="p-3">GW {adviceGw}</th>
      <th className="p-3">Price</th>
      <th className="p-3 text-right">Outlook</th>
    </tr>
    </thead>
  );

  if (isMock) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-2">My Team</h2>
        <p className="text-sm text-slate-400">
          This tab needs live FPL data, but the dashboard is currently showing sample data. Try again once the
          live connection is back.
        </p>
      </div>
    );
  }

  const analysis = advice?.analysis;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="manager-id" className="text-xs text-slate-400 uppercase tracking-wider font-bold block">
            Your FPL team ID
          </label>
          <input
            id="manager-id"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1234567"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            Open the Points page on the FPL website. The number in the address, fantasy.premierleague.com/entry/
            <span className="text-slate-300">1234567</span>/event/…, is your ID.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition"
        >
          {loading ? 'Loading…' : 'Load my team'}
        </button>
      </form>

      {inputError && <p className="text-sm text-rose-400">{inputError}</p>}
      {result?.status === 'not-found' && (
        <p className="text-sm text-rose-400">
          No squad found for that ID in GW {picksGw}. Check the number and try again.
        </p>
      )}
      {result?.status === 'unavailable' && (
        <p className="text-sm text-amber-400">
          The FPL API is not responding right now. Please try again in a few minutes.
        </p>
      )}
      {managerPicks && !advice && (
        <p className="text-sm text-amber-400">
          Some players in this squad could not be matched to current FPL data.
        </p>
      )}

      {managerPicks && analysis && advice && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-medium">Recommended captain</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {analysis.captain?.player.web_name ?? 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {analysis.currentCaptain && analysis.captain?.player.id === analysis.currentCaptain.player.id
                  ? 'Matches your current captain'
                  : `You have ${analysis.currentCaptain?.player.web_name ?? 'no one'} as captain`}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-medium">Recommended vice-captain</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {analysis.viceCaptain?.player.web_name ?? 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Takes over if the captain does not play</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-medium">Lineup changes</p>
              <p className="text-2xl font-black text-white mt-1">{analysis.swaps.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {analysis.swaps.length === 0
                  ? 'Your XI is already the best fit'
                  : `Outlook +${analysis.xiScoreGain.toFixed(1)} for the XI`}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-medium">Bank / squad value</p>
              <p className="text-2xl font-black text-white mt-1">
                {formatPrice(managerPicks.entry_history.bank)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Value {formatPrice(managerPicks.entry_history.value)} • GW {managerPicks.entry_history.event}:{' '}
                {managerPicks.entry_history.points} pts
              </p>
            </div>
          </div>

          {analysis.swaps.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Suggested lineup changes</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {analysis.swaps.map((swap) => (
                  <li key={swap.start.player.id} className="bg-slate-950 rounded-xl p-3">
                    Start <span className="font-semibold text-emerald-400">{swap.start.player.web_name}</span> (
                    {swap.start.score.toFixed(2)}) instead of{' '}
                    <span className="font-semibold text-amber-400">{swap.bench.player.web_name}</span> (
                    {swap.bench.score.toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">Recommended starting XI</h2>
            <p className="text-xs text-slate-400 mb-4">
              Outlook blends FPL's expected points (60%) and form (40%), reduced for injury doubts and set to
              zero for players without a fixture. The XI is the best legal formation from your 15.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                {tableHead}
                <tbody className="divide-y divide-slate-800/60">
                {analysis.suggestedXI.map((member) =>
                  renderRow(
                    member,
                    member.player.id === analysis.captain?.player.id
                      ? 'C'
                      : member.player.id === analysis.viceCaptain?.player.id
                        ? 'VC'
                        : null,
                    member.pick.position > 11 ? 'in' : null
                  )
                )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recommended bench order</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                {tableHead}
                <tbody className="divide-y divide-slate-800/60">
                {analysis.suggestedBench.map((member) =>
                  renderRow(member, null, member.pick.position <= 11 ? 'out' : null)
                )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">Transfer ideas</h2>
            <p className="text-xs text-slate-400 mb-4">
              Same-position replacements within your budget (player price plus bank) that respect the 3-per-club
              limit. Prices are approximate because FPL's selling price can differ, and each extra transfer
              beyond your free ones costs 4 points.
            </p>

            {advice.transfers.length === 0 ? (
              <p className="text-sm text-slate-400">No clear upgrades found. Your squad looks solid for GW {adviceGw}.</p>
            ) : (
              <div className="space-y-4">
                {advice.transfers.map((idea) => (
                  <div key={idea.out.player.id} className="bg-slate-950 rounded-xl p-4">
                    <p className="text-sm text-slate-300">
                      Replace <span className="font-semibold text-amber-400">{idea.out.player.web_name}</span>{' '}
                      <span className="text-slate-500">
                        ({formatPrice(idea.out.player.now_cost)}, outlook {idea.out.score.toFixed(2)})
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {idea.options.map((option) => (
                        <li
                          key={option.player.id}
                          className="flex justify-between items-center text-sm cursor-pointer hover:text-white text-slate-300"
                          onClick={() => onSelect(option.player)}
                        >
                          <span>
                            <span className="font-semibold text-emerald-400">{option.player.web_name}</span>
                            <span className="text-slate-500 ml-2 text-xs">
                              {teamMap.get(option.player.team)?.short_name} •{' '}
                              {formatPrice(option.player.now_cost)}
                            </span>
                          </span>
                          <span className="font-bold text-emerald-400">{option.score.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Based on your squad as of GW {picksGw}. Transfers made since then are not reflected, and these
            suggestions are a guide, not a guarantee.
          </p>
        </>
      )}
    </div>
  );
}