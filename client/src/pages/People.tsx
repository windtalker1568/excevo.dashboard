import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../api';
import type { Person } from '../types';

function formatNumber(n: number | null, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(digits);
}

function varianceClass(n: number | null) {
  if (n === null || n === undefined) return '';
  return n >= 0 ? 'text-green' : 'text-red';
}

function average(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!numericValues.length) return null;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

export default function People() {
  const [view, setView] = useState<'advisors' | 'teamLeaders'>('teamLeaders');
  const [advisors, setAdvisors] = useState<Person[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [qualityRecords, setQualityRecords] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [teamLeaderOptions, setTeamLeaderOptions] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchJson('/api/people/advisors'),
      fetchJson('/api/people/team-leaders'),
      fetchJson('/api/quality'),
      fetchJson('/api/filters/options')
    ])
      .then(([a, t, q, options]) => {
        const nextAdvisors = Array.isArray(a) ? a : [];
        const nextLeaders = Array.isArray(t) ? t : [];
        const nextQuality = Array.isArray(q) ? q : [];
        const nextWeeks = Array.isArray((options as any)?.weeks) ? (options as any).weeks : [];
        const nextTeamLeaders = Array.isArray((options as any)?.teamLeaders) ? (options as any).teamLeaders.filter((name: string) => name && String(name).trim()) : [];
        setAdvisors(nextAdvisors);
        setLeaders(nextLeaders);
        setQualityRecords(nextQuality);
        setWeeks(nextWeeks.slice().sort());
        setTeamLeaderOptions(nextTeamLeaders);
        const latestWeek = nextWeeks.length ? nextWeeks[nextWeeks.length - 1] : '';
        setSelectedWeek(latestWeek);
        setSelectedTeamLeader('');
        setSelectedAdvisor('');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const advisorOptions = useMemo(() => {
    const list = advisors
      .filter(advisor => !selectedTeamLeader || advisor.teamLeader === selectedTeamLeader)
      .map(advisor => advisor.advisor)
      .filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [advisors, selectedTeamLeader]);

  useEffect(() => {
    if (selectedTeamLeader && selectedAdvisor && !advisorOptions.includes(selectedAdvisor)) {
      setSelectedAdvisor('');
    }
  }, [advisorOptions, selectedAdvisor, selectedTeamLeader]);

  const currentWeek = selectedWeek || (weeks.length ? weeks[weeks.length - 1] : '');
  const priorWeek = useMemo(() => {
    if (!currentWeek || weeks.length === 0) return null;
    const weekIndex = weeks.indexOf(currentWeek);
    return weekIndex > 0 ? weeks[weekIndex - 1] : null;
  }, [currentWeek, weeks]);

  const filteredAdvisors = useMemo(() => {
    return advisors.filter(advisor => {
      if (selectedTeamLeader && advisor.teamLeader !== selectedTeamLeader) return false;
      if (selectedAdvisor && advisor.advisor !== selectedAdvisor) return false;
      return true;
    });
  }, [advisors, selectedAdvisor, selectedTeamLeader]);

  const filteredLeaders = useMemo(() => {
    const leaderList = selectedTeamLeader ? [selectedTeamLeader] : teamLeaderOptions;
    return leaderList.map(teamLeader => {
      const teamAdvisorRows = filteredAdvisors.filter(advisor => advisor.teamLeader === teamLeader);
      const currentWeekRecords = qualityRecords.filter(q => q.teamLeader === teamLeader && q.weekCommencing === currentWeek);
      const priorWeekRecords = priorWeek ? qualityRecords.filter(q => q.teamLeader === teamLeader && q.weekCommencing === priorWeek) : [];

      return {
        teamLeader,
        avgQualityCurrentWeek: average(currentWeekRecords.map(q => q.trueScore)),
        avgQualityPriorWeek: average(priorWeekRecords.map(q => q.trueScore)),
        qualityVariance: currentWeekRecords.length || priorWeekRecords.length
          ? (average(currentWeekRecords.map(q => q.trueScore)) ?? 0) - (average(priorWeekRecords.map(q => q.trueScore)) ?? 0)
          : null,
        avgEph: average(teamAdvisorRows.map(row => row.eph)),
        avgSph: average(teamAdvisorRows.map(row => row.sph))
      };
    });
  }, [filteredAdvisors, qualityRecords, currentWeek, priorWeek, selectedTeamLeader, teamLeaderOptions]);

  const advisorRows = useMemo(() => {
    return filteredAdvisors.map(advisor => {
      const currentRecord = qualityRecords.find(q => q.advisor === advisor.advisor && q.weekCommencing === currentWeek);
      const priorRecord = priorWeek ? qualityRecords.find(q => q.advisor === advisor.advisor && q.weekCommencing === priorWeek) : null;

      return {
        ...advisor,
        currentWeekTrueScore: currentRecord ? currentRecord.trueScore : null,
        currentWeekPotentialScore: currentRecord ? currentRecord.potentialScore : null,
        priorWeekTrueScore: priorRecord ? priorRecord.trueScore : null,
        priorWeekPotentialScore: priorRecord ? priorRecord.potentialScore : null,
        trueScoreVariance: currentRecord && priorRecord ? currentRecord.trueScore - priorRecord.trueScore : null,
        potentialScoreVariance: currentRecord && priorRecord ? currentRecord.potentialScore - priorRecord.potentialScore : null
      };
    });
  }, [filteredAdvisors, qualityRecords, currentWeek, priorWeek]);

  return (
    <div>
      <h1 className="page-title">People</h1>
      <div className="toggle">
        <button className={view === 'advisors' ? 'active' : ''} onClick={() => setView('advisors')}>Advisors</button>
        <button className={view === 'teamLeaders' ? 'active' : ''} onClick={() => setView('teamLeaders')}>Team Leaders</button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Date</label>
          <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
            <option value="">Select date</option>
            {weeks.map(week => (
              <option key={week} value={week}>{week}</option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group-wide">
          <label>Team Leader</label>
          <select value={selectedTeamLeader} onChange={e => {
            setSelectedTeamLeader(e.target.value);
            setSelectedAdvisor('');
          }}>
            <option value="">All Team Leaders</option>
            {teamLeaderOptions.map(teamLeader => (
              <option key={teamLeader} value={teamLeader}>{teamLeader}</option>
            ))}
          </select>
        </div>

        {selectedTeamLeader && (
          <div className="filter-group filter-group-wide">
            <label>Advisor</label>
            <select value={selectedAdvisor} onChange={e => setSelectedAdvisor(e.target.value)}>
              <option value="">All Advisors</option>
              {advisorOptions.map(advisor => (
                <option key={advisor} value={advisor}>{advisor}</option>
              ))}
            </select>
          </div>
        )}

        {(selectedWeek || selectedTeamLeader || selectedAdvisor) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelectedWeek(weeks[weeks.length - 1] || '');
              setSelectedTeamLeader('');
              setSelectedAdvisor('');
            }}
          >
            Clear selection
          </button>
        )}
      </div>

      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty text-red">{error}</div>}

      {!loading && view === 'advisors' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Team Leader</th>
                <th>EPH</th>
                <th>SPH</th>
                <th>Current Week True Score</th>
                <th>Current Week Potential Score</th>
                <th>Prior Week True Score</th>
                <th>Prior Week Potential Score</th>
                <th>True Score Variance</th>
                <th>Potential Score Variance</th>
              </tr>
            </thead>
            <tbody>
              {advisorRows.length === 0 && <tr><td colSpan={10} className="empty">No advisors match this filter</td></tr>}
              {advisorRows.map((p, i) => (
                <tr key={`${p.advisor}-${i}`}>
                  <td>{p.advisor}</td>
                  <td>{p.teamLeader}</td>
                  <td className="text-green">{formatNumber(p.eph)}</td>
                  <td className="text-purple">{formatNumber(p.sph)}</td>
                  <td className="text-cyan">{p.currentWeekTrueScore ?? '—'}</td>
                  <td className="text-orange">{p.currentWeekPotentialScore ?? '—'}</td>
                  <td>{p.priorWeekTrueScore ?? '—'}</td>
                  <td>{p.priorWeekPotentialScore ?? '—'}</td>
                  <td className={varianceClass(p.trueScoreVariance)}>{p.trueScoreVariance === null ? '—' : (p.trueScoreVariance > 0 ? '+' : '') + p.trueScoreVariance}</td>
                  <td className={varianceClass(p.potentialScoreVariance)}>{p.potentialScoreVariance === null ? '—' : (p.potentialScoreVariance > 0 ? '+' : '') + p.potentialScoreVariance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && view === 'teamLeaders' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team Leader</th>
                <th>Avg Quality Current Week</th>
                <th>Avg Quality Prior Week</th>
                <th>Quality Variance</th>
                <th>Avg EPH</th>
                <th>Avg SPH</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaders.length === 0 && <tr><td colSpan={6} className="empty">No team leaders match this filter</td></tr>}
              {filteredLeaders.map((l, i) => (
                <tr key={`${l.teamLeader}-${i}`}>
                  <td>{l.teamLeader}</td>
                  <td className="text-cyan">{formatNumber(l.avgQualityCurrentWeek)}</td>
                  <td>{formatNumber(l.avgQualityPriorWeek)}</td>
                  <td className={varianceClass(l.qualityVariance)}>{l.qualityVariance === null ? '—' : (l.qualityVariance > 0 ? '+' : '') + l.qualityVariance.toFixed(1)}</td>
                  <td className="text-green">{formatNumber(l.avgEph)}</td>
                  <td className="text-purple">{formatNumber(l.avgSph)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
