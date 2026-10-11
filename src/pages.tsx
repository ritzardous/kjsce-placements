import {matchesSearch} from '../shared/search';
import { CompanyIdentity, CompanyLogo } from './CompanyIdentity';
import { AppIcon } from './AppIcon';
import { useState } from 'react';
import { CandidateLinkedIn } from './CandidateLinkedIn';
import type { Announcement } from '../shared/dataset';
import type { Branch, Candidate, Company, Statistics } from '../shared/statistics';
import { ColumnChart, Donut, Empty, LineChart, RankedBars, Section, Stat, Table, Tag, academicYear, routeHref, companyHref, date, money, type Column } from './components';

const ctcLabel = (p: Announcement) => p.compensation.ctc_value_lpa !== null ? money(p.compensation.ctc_value_lpa) : p.compensation.ctc_text || 'Not available';
const candidateColumns: Column<Candidate>[] = [
  { label: 'Candidate', render: c => <a href={companyHref(c.companyKey)}>{c.name}</a> },
  { label: 'Roll No.', render: c => <span className="mono">{c.roll}</span> },
  { label: 'Branch', render: c => <Tag>{c.branch}</Tag> },
  { label: 'Company', render: c => <a href={companyHref(c.companyKey)}><CompanyIdentity companyKey={c.companyKey} name={c.company} /></a> },
  { label: 'Role', render: c => c.role || "Not provided" },
  { label: 'CTC', render: c => c.ctc === null ? c.ctcText || 'Not available' : money(c.ctc), numeric: true },
  { label: 'Date', render: c => date(c.date) },
];
const announcementColumns: Column<Announcement>[] = [
  { label: 'Date', render: p => date(p.result.declared_date) },
  { label: 'Company', primary: true, render: p => <a href={companyHref(p.company.normalized_name)}><CompanyIdentity companyKey={p.company.normalized_name} name={p.company.name} /></a> },
  { label: 'Type', render: p => <Tag>{p.company.type}</Tag> },
  { label: 'Role(s)', render: p => p.roles.join(' / ') || 'Not provided' },
  { label: 'CTC', render: ctcLabel, numeric: true },
  { label: 'Hired', render: p => p.hiring.students_hired, numeric: true },
];
const announcements = (s: Statistics) => s.companies.flatMap(c => c.announcements);
function SourceDetails({ announcement: p }: { announcement: Announcement }) {
  const email = p.source.email as { source_file?: string; pages?: number[] } | undefined;
  const rows = p.source.report_rows as { serial: number; employer: string }[] | undefined;
  return <>{email && <><br />Matched email: {email.source_file}, pages {email.pages?.join(', ')}</>}{rows && <><br />Report row(s): {rows.map(r => r.serial).join(', ')} · Original employer label(s): {[...new Set(rows.map(r => r.employer))].join('; ')}</>}</>;
}
export function Progress({ statistics: s }: { statistics: Statistics }) {
  const [series, setSeries] = useState<'reported' | 'selections' | 'unique'>(s.summary.reportedCounter === null ? 'selections' : 'reported');
  const label = { reported: 'Source-reported cumulative placements (missing counters excluded)', selections: 'Calculated cumulative selections', unique: 'Calculated unique students placed' }[series];
  const points = s.timeline.flatMap(p => {
    const value = series === 'reported' ? p.reportedCumulative : series === 'unique' ? p.uniqueStudents : p.selections;
    return value === null ? [] : [{ ...p, value }];
  });
  return <><div className="chart-controls" aria-label="Timeline metric">{(['reported', 'selections', 'unique'] as const).map(key => <button key={key} className={'chip ' + (series === key ? 'active' : '')} aria-pressed={series === key} onClick={() => setSeries(key)}>{key === 'reported' ? 'TPO counter' : key === 'unique' ? 'Unique students' : 'Selections'}</button>)}</div><LineChart points={points} label={label} /><p className="methodology">College running counters and candidate selections are different measures. Missing source counters remain unknown; calculated series use dated candidate records. {s.candidates.filter(c => c.date === null).length > 0 && `${s.candidates.filter(c => c.date === null).length} undated selections are included in dashboard totals but excluded from this chart.`}</p></>;
}
export function Overview({ statistics: s }: { statistics: Statistics }) {
  const m = s.summary;
  const topHiring = [...s.companies].sort((a, b) => b.totalHired - a.totalHired).slice(0, 8);
  const topCtc = announcements(s).filter(p => p.compensation.ctc_value_lpa !== null).sort((a, b) => b.compensation.ctc_value_lpa! - a.compensation.ctc_value_lpa!).slice(0, 8);
  const recent = announcements(s).filter(p => p.result.declared_date !== null).sort((a, b) => (b.result.declared_date ?? "").localeCompare(a.result.declared_date ?? "")).slice(0, 10);
  return <>
    <section className="hero"><div className="eyebrow">AY {academicYear(s.batch.year)} · {m.announcements} {s.batch.year === 2025 ? "placement record groups" : "TPO announcements"}</div><h1 className="hero-title">Placement Stats<br />@ KJSCE '{String(s.batch.year).slice(-2)}</h1><p className="hero-sub">{s.batch.year === 2025 ? "Final UG placement report enriched with campus email results. Missing dates, roles, compensation, and registration totals remain unavailable." : s.batch.year === 2027 ? "Placements are ongoing for the Class of 2027. Explore confirmed results so far; figures will change as reviewed email updates are added." : "A structured read of the KJSCE T&PO announcement history: every confirmed hire, CTC and role, organized for placement season decision-making."}</p></section>
    <div className="statgrid">
      <Stat value={s.batch.registeredStudents ?? 'Not available'} label={s.batch.degreeScope === "UG" ? "UG students registered" : "B.Tech students registered"} extra={s.batch.registeredStudents === null ? "Registration total not supplied" : "AY 2025–26 · T&PO director's mail"} headline />
      <Stat value={m.uniqueStudents} label={s.batch.degreeScope === "UG" ? "Unique UG students placed" : "Unique B.Tech students placed"} extra={m.notConfirmedPlaced === null ? s.batch.year === 2025 ? "By distinct roll number in the final report" : "By distinct roll number in supplied emails" : `${m.notConfirmedPlaced} not confirmed placed in these sources`} headline />
      <Stat value={m.placementRate === null ? 'Not available' : m.placementRate.toFixed(1) + '%'} label="Placement rate" extra={`of ${s.batch.registeredStudents ?? 'unknown'} registered ${s.batch.degreeScope} students`} headline />
      <Stat value={m.reportedCounter ?? 'Not available'} label="Confirmed cumulative placements" extra="TPO running counter · latest confirmed" />
      <Stat value={m.announcements} label={s.batch.year === 2025 ? "Placement record groups" : "Placement announcements"} extra={`${date(m.firstDate, true)} → ${date(m.latestDate, true)}`} />
      <Stat value={m.selections} label="Candidate selections recorded" extra={s.batch.year === 2025 ? "final report rows · includes off-campus" : "across announcements · not unique students"} />
      <Stat value={m.companies} label="Companies represented" extra={`${s.types.length} company types`} />
      <Stat value={money(m.highestCtc)} label="Highest CTC" extra={topCtc[0]?.company.name} />
      <Stat value={money(m.avgCtc)} label="Average CTC" extra={`across ${m.ctcCoverage} valued ${s.batch.ctcWeighting === "selection" ? "selection rows" : "announcements"}`} />
      <Stat value={topHiring[0]?.name ?? 'Not available'} label="Most hiring company" extra={`${topHiring[0]?.totalHired ?? 0} selections`} />
      <Stat value={date(m.latestDate)} label="Most recent result" extra={recent[0]?.company.name} />
    </div>
    <p className="methodology">{s.batch.registrationSource} Placement rate uses unique students, not selections, and requires a documented registration denominator. {s.batch.year === 2025 ? "On-campus and off-campus report selections are both included. Average CTC is selection-weighted;" : "Off-campus or unannounced placements are outside this dataset. Average CTC is announcement-weighted;"} missing or mixed compensation values are excluded.</p>
    <Section title="Placement Progress" note="Season timeline"><Progress statistics={s} /></Section>
    <Section title="Companies at a glance"><div className="grid2"><div><h3 className="section-title">Top Hiring Companies</h3><RankedBars unit={s.batch.year === 2025 ? 'sel.' : 'hired'} rows={topHiring.map(c => ({ label: c.name, companyKey: c.key, value: c.totalHired, href: companyHref(c.key) }))} /></div><div><h3 className="section-title">Highest CTCs · {s.batch.year === 2025 ? 'Report packages' : 'By announcement'}</h3><RankedBars unit="LPA" format={n => n.toFixed(2)} rows={topCtc.map(p => ({ label: p.company.name, companyKey: p.company.normalized_name, value: p.compensation.ctc_value_lpa!, href: companyHref(p.company.normalized_name) }))} /></div></div></Section>
    <Section title={s.batch.year === 2025 ? "Recent Dated Results" : "Recent Announcements"} note="Latest 10 results"><Table rows={recent} columns={announcementColumns} rowKey={p => p.placement_id} /></Section>
    <Section title="Roles & Company Mix"><div className="grid2"><div><h3 className="section-title">Popular roles</h3><RankedBars rows={s.roles.slice(0, 7).map(r => ({ ...r, href: routeHref("candidates") }))} /></div><div><h3 className="section-title">Company Mix · Unique companies</h3><Donut rows={s.types} label="Company types" /></div></div></Section>
  </>;
}

export interface CompanyFilters { search: string; type: string; ctc: string; sort: { key: string; direction: 'asc' | 'desc' }; }
export const initialCompanyFilters: CompanyFilters = { search: '', type: 'ALL', ctc: 'ALL', sort: { key: 'hired', direction: 'desc' } };
export function Companies({ statistics: s, filters, setFilters }: { statistics: Statistics; filters: CompanyFilters; setFilters: (next: CompanyFilters) => void }) {
  const set = (next: Partial<CompanyFilters>) => setFilters({ ...filters, ...next });
  const rows = s.companies.filter(c => {
    if (filters.type !== 'ALL' && c.type !== filters.type) return false;
    const value = c.highestCtc;
    if (filters.ctc !== 'ALL') {
      if (value === null) return false;
      if (filters.ctc === '<5L' && value >= 5 || filters.ctc === '5–10L' && (value < 5 || value >= 10) || filters.ctc === '10–15L' && (value < 10 || value >= 15) || filters.ctc === '15L+' && value < 15) return false;
    }
    return matchesSearch(`${c.name} ${c.type} ${c.roles.join(' ')}`,filters.search);
  });
  const sortValue = (c: Company) => ({ name: c.name, ctc: c.highestCtc ?? -1, hired: c.totalHired, date: c.lastDate ?? "" })[filters.sort.key as 'name' | 'ctc' | 'hired' | 'date'];
  rows.sort((a, b) => { const av = sortValue(a), bv = sortValue(b); return (av < bv ? -1 : av > bv ? 1 : a.name.localeCompare(b.name)) * (filters.sort.direction === 'asc' ? 1 : -1); });
  const columns: Column<Company>[] = [
    { label: 'Company', sort: 'name', render: c => <a href={companyHref(c.key)}><CompanyIdentity companyKey={c.key} name={c.name} /></a> },
    { label: 'Type', render: c => <Tag>{c.type}</Tag> },
    { label: 'Highest CTC', sort: 'ctc', numeric: true, render: c => money(c.highestCtc) },
    { label: s.batch.year === 2025 ? 'Selections' : 'Students Hired', sort: 'hired', numeric: true, render: c => c.totalHired },
    { label: 'Roles', render: c => <>{c.roles.slice(0, 2).join(', ') || 'Not provided'}{c.roles.length > 2 && <span className="cell-sub"> +{c.roles.length - 2} more</span>}</> },
    { label: 'Latest Result', sort: 'date', render: c => date(c.lastDate) },
    { label: s.batch.year === 2025 ? 'Record groups' : 'Announcements', numeric: true, render: c => c.announcements.length },
  ];
  return <Section title="Companies" note={`${s.companies.length} companies represented`}>
    <div className="controls"><div className="search-box"><AppIcon name="search"/><input aria-label="Search companies" placeholder="Search company or role…" value={filters.search} onChange={e => set({ search: e.target.value })} /></div><select className="filter" aria-label="Company type" value={filters.type} onChange={e => set({ type: e.target.value })}><option value="ALL">All company types</option>{s.types.map(t => <option key={t.label}>{t.label}</option>)}</select><div className="result-count">{rows.length} / {s.companies.length}</div></div>
    <div className="chip-row company-salary-filters" role="group" aria-label="Salary range">{['ALL', '<5L', '5–10L', '10–15L', '15L+'].map(ctc => <button key={ctc} aria-pressed={filters.ctc === ctc} className={'chip ' + (filters.ctc === ctc ? 'active' : '')} onClick={() => set({ ctc })}>{ctc}</button>)}</div>
    <Table rows={rows} columns={columns} rowHref={c => companyHref(c.key)} rowKey={c => c.key} sort={filters.sort} onSort={key => set({ sort: { key, direction: key === filters.sort.key ? (filters.sort.direction === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' } })} />
  </Section>;
}
export function CompanyDetail({ company: c, year }: { company: Company | undefined; year:number }) {
  if (!c) return <Empty title="Company not found"><a href={routeHref("companies")}>← Back to Companies</a></Empty>;
  return <Section title="Company Details" note="Chronological · earliest first"><a className="back-link" href={routeHref("companies")}>← All Companies</a>
    <div className="detail-head"><div className="company-detail-identity"><CompanyLogo companyKey={c.key} name={c.name} size="large" /><div className="company-detail-copy"><div className="eyebrow">{c.type}</div><h1 className="detail-name">{c.name}</h1><div className="detail-tags">{c.roles.map(r => <Tag key={r}>{r}</Tag>)}</div></div></div><div className="detail-stats">{[[money(c.highestCtc), 'Highest CTC'], [c.totalHired, c.announcements.some(p => p.campus) ? 'Selections' : 'Students hired'], [date(c.lastDate,true), 'Latest result'], [c.branches.join(', '), 'Branches hired']].map(([value, label]) => <div className="detail-stat" key={label}><div className="v">{value}</div><div className="l">{label}</div></div>)}</div></div>
    <div className="company-candidates-heading"><h2>Selected candidates</h2><p>Selections are grouped by placement announcement below.</p><aside className="company-contacts" aria-labelledby="company-contacts-title"><h3 id="company-contacts-title">Alumni contacts</h3><p>Connect on LinkedIn using the profiles beside each name.</p></aside></div>
    {c.announcements.map(p => <article className="announcement-block" key={p.placement_id}><div className="announcement-head"><div className="a-date">{date(p.result.declared_date, true)}</div><div className="a-role">{p.roles.join(' / ') || 'Role not provided'}{p.campus && <Tag>{p.campus}</Tag>}</div><div className="a-ctc">{ctcLabel(p)}</div></div><Table rows={p.candidates} rowKey={(candidate, index) => `${candidate.roll_number}-${index}`} columns={[
      { label: 'Candidate', render: row => row.name }, { label: 'LinkedIn', render: row => <CandidateLinkedIn roll={row.roll_number} name={row.name} year={year}/> }, { label: 'Roll No.', render: row => <span className="mono">{row.roll_number}</span> }, { label: 'Branch', render: row => <Tag>{row.branch}</Tag> }, { label: 'Role', render: row => row.role || "Not provided" },
    ]} /></article>)}
    <details className="company-source-details"><summary>Sources &amp; data notes</summary><p>Reported selections can include repeat selections. Unknown packages, dates and roles stay marked as unavailable.</p>{c.announcements.map(p=><article key={p.placement_id}><h3>{date(p.result.declared_date,true)} · {p.roles.join(' / ')||'Placement result'}</h3>{p.notes&&<p>{p.notes}</p>}<p className="methodology announcement-provenance">Reference: {p.placement_id}<br/>Source: {p.source.source_file}, pages {p.source.pages.join(', ')}<SourceDetails announcement={p}/><br/>Reported running total: {p.hiring.placement_count??'Unavailable'} · {p.hiring.students_hired} selections</p></article>)}</details>
  </Section>;
}

export function Branches({ statistics: s, selected, onCandidates }: { statistics: Statistics; selected?: string; onCandidates: (branch: string) => void }) {
  const branch = selected ? s.branches.find(b => b.branch === selected) : s.branches[0];
  if (!branch) return <Empty title="Branch not found"><a href={routeHref("branches")}>← All Branches</a></Empty>;
  const columns: Column<Branch>[] = [
    { label: 'Branch', render: b => <a href={routeHref('branches/' + encodeURIComponent(b.branch))}>{b.branch}</a> },
    { label: 'Selections', numeric: true, render: b => b.selections }, { label: 'Unique Students', numeric: true, render: b => b.uniqueStudents },
    { label: 'Share', numeric: true, render: b => b.pctOfTotal.toFixed(1) + '%' }, { label: 'Companies', numeric: true, render: b => b.companiesCount },
    { label: 'Highest CTC', numeric: true, render: b => money(b.highestCtc) }, { label: 'Average CTC', numeric: true, render: b => money(b.avgCtc) },
    { label: 'Median CTC', numeric: true, render: b => money(b.medianCtc) },
    { label: 'Top Hiring Company', render: b => `${b.companyRanking[0]?.label ?? 'Not available'} (${b.companyRanking[0]?.value ?? 0})` },
  ];
  return <><Section title="Branch statistics" note={`${s.summary.selections} selections · ${s.summary.uniqueStudents} unique students · ${s.summary.multiSelectedStudents} students selected more than once`}><Table rows={s.branches} columns={columns} rowKey={b => b.branch} /><p className="methodology">Branch shares count selections. Branch average/median CTC are selection-weighted and exclude unknown compensation.</p></Section>
    <Section title="Branch Breakdown" note="Select a branch for a full breakdown"><div className="branch-chip-row">{s.branches.map(b => <a className={'branch-chip ' + (b.branch === branch.branch ? 'active' : '')} href={routeHref('branches/' + encodeURIComponent(b.branch))} key={b.branch}><div className="bc-name">{b.branch}</div><div className="bc-count">{b.selections} selections · {b.uniqueStudents} students</div></a>)}</div><h1 className="detail-name">{branch.branch}</h1><div className="statgrid"><Stat value={branch.selections} label="Selections" /><Stat value={branch.uniqueStudents} label="Unique students" /><Stat value={branch.companiesCount} label="Companies hired" /><Stat value={money(branch.highestCtc)} label="Highest CTC" /></div></Section>
    <Section title="Companies & Roles"><div className="grid2"><div><h3 className="section-title">Top Hiring Companies</h3><RankedBars rows={branch.companyRanking.slice(0, 8).map(r => ({ ...r, companyKey: s.companies.find(c => c.name === r.label)?.key, href: companyHref(s.companies.find(c => c.name === r.label)?.key ?? '') }))} /></div><div><h3 className="section-title">Top Roles</h3><Donut rows={branch.roleRanking.slice(0, 6)} label="Top six branch roles" /></div></div></Section>
    <Section title={`CTC Distribution · ${branch.branch}`} note={`${branch.ctcCoverage} selections with confirmed CTC`}><ColumnChart rows={branch.histogram} label="Selection-weighted branch CTC distribution" /></Section>
    <Section title={`${branch.branch} Candidates`} note="All recorded selections"><div className="desktop-only-table"><Table rows={[...branch.candidates].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))} columns={candidateColumns} rowKey={(c, i) => `${c.placementId}-${c.roll}-${i}`} /></div><a className="branch-candidates-cta" href={routeHref("candidates")} onClick={() => onCandidates(branch.branch)}><span>View all {branch.selections} {branch.branch} candidates by name, company &amp; CTC</span><span className="bc-arrow">→</span></a></Section>
  </>;
}

export interface CandidateFilters { search: string; role: string | null; campus?: string; }
export function Candidates({ statistics: s, filters, setFilters }: { statistics: Statistics; filters: CandidateFilters; setFilters: (next: CandidateFilters) => void }) {
  const [page, setPage] = useState(1);
  const hasCampus = s.candidates.some(c => c.campus);
  const filtered = s.candidates.filter(c => (!filters.campus || filters.campus === 'ALL' || c.campus === filters.campus) && (!filters.role || c.role === filters.role) && matchesSearch(`${c.name} ${c.roll} ${c.branch} ${c.company} ${c.role}`,filters.search));
  const pages = Math.max(1, Math.ceil(filtered.length / 100));
  const currentPage = Math.min(page, pages);
  const update = (next: CandidateFilters) => { setPage(1); setFilters(next); };
  return <Section title="Candidates and roles" note={`${s.summary.selections} candidate selections recorded (not unique students)`}>
    <div className="role-summary">{s.roles.slice(0, 10).map(r => <button key={r.label} className={'role-chip ' + (filters.role === r.label ? 'active' : '')} aria-pressed={filters.role === r.label} onClick={() => update({ ...filters, role: filters.role === r.label ? null : r.label, search: '' })}><span>{r.label}</span><span className="rc-n">{r.value}</span></button>)}</div>
    <div className="controls"><div className="search-box"><AppIcon name="search"/><input aria-label="Search candidates" placeholder="Search name, roll no., branch, role or company…" value={filters.search} onChange={e => update({ ...filters, search: e.target.value, role: null })} /></div><div className="result-count">{filtered.length} / {s.candidates.length}</div></div>
    {hasCampus && <label className="campus-filter">Campus status <select className="filter" aria-label="Campus status" value={filters.campus ?? 'ALL'} onChange={e => update({ ...filters, campus: e.target.value })}><option value="ALL">All selections</option><option>On campus</option><option>Off campus</option></select></label>}
    <Table rows={filtered.slice((currentPage - 1) * 100, currentPage * 100)} columns={hasCampus ? [...candidateColumns, { label: 'Campus', render: c => c.campus ?? 'Not provided' }] : candidateColumns} rowKey={(c, i) => `${c.placementId}-${c.roll}-${i}`} />
    {pages > 1 && <div className="pagination"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div>}
  </Section>;
}
export function Timeline({ statistics: s }: { statistics: Statistics }) {
  return <><Section title="Placement Timeline" note={`${date(s.summary.firstDate, true)} → ${date(s.summary.latestDate, true)}`}><Progress statistics={s} /></Section><Section title={s.batch.year === 2025 ? "Dated Result History" : "Announcement History"} note="Chronological · earliest first"><div className="event-list">{s.timeline.map(p => <a className="event-row" href={companyHref(p.companyKey)} key={p.id}><span className="event-date">{date(p.date, true)}</span><span className="event-company"><CompanyIdentity companyKey={p.companyKey} name={p.company} size="small" /></span><span className="event-hired">+{p.hired} selections</span><span className="event-cum">TPO: {p.reportedCumulative ?? 'Not available'} · Σ selections: {p.selections}</span></a>)}</div></Section></>;
}
export function Insights({ statistics: s }: { statistics: Statistics }) {
  const m = s.summary;
  const top = [...s.companies].sort((a, b) => b.totalHired - a.totalHired)[0];
  const biggest = announcements(s).sort((a, b) => b.hiring.students_hired - a.hiring.students_hired)[0];
  const cards = [
    { label: 'Placement rate', value: m.placementRate === null ? 'Not available' : m.placementRate.toFixed(1) + '%', detail: `${m.uniqueStudents} of ${s.batch.registeredStudents ?? 'unknown'} registered ${s.batch.degreeScope} students` },
    { label: 'Not confirmed placed', value: m.notConfirmedPlaced ?? 'Not available', detail: 'Registration base minus students in published announcements' },
    { label: 'Highest CTC', value: money(m.highestCtc), detail: s.batch.year === 2025 ? 'Final report compensation · includes off-campus' : 'Confirmed announcement compensation' },
    { label: 'Average CTC', value: money(m.avgCtc), detail: `${s.batch.ctcWeighting === "selection" ? "Selection" : "Announcement"}-weighted · ${m.ctcCoverage} known values` },
    { label: 'Median CTC', value: money(m.medianCtc), detail: `${s.batch.ctcWeighting === "selection" ? "Selection" : "Announcement"}-weighted · unknown/mixed bands excluded` },
    { label: 'Most hiring company', value: top?.name ?? 'Not available', detail: `${top?.totalHired ?? 0} selections across ${top?.announcements.length ?? 0} announcements` },
    { label: 'Most common role', value: s.roles[0]?.label ?? 'Not available', detail: `${s.roles[0]?.value ?? 0} selections` },
    { label: 'Most common company type', value: s.types[0]?.label ?? 'Not available', detail: `${s.types[0]?.value ?? 0} unique companies` },
    { label: 'Largest branch by selections', value: s.branchRanking[0]?.label ?? 'Not available', detail: `${s.branchRanking[0]?.value ?? 0} selections` },
    { label: 'Companies hiring 2+ branches', value: m.multiBranchCompanies, detail: `of ${m.companies} companies` },
    { label: s.batch.year === 2025 ? 'Largest record group' : 'Largest single announcement', value: biggest?.hiring.students_hired ?? 'Not available', detail: biggest?.company.name ?? 'Not available' },
    { label: 'Companies with tech/software roles', value: m.techCompanies, detail: 'Keyword match on role titles, not an official company classification' },
    { label: 'Distinct roles offered', value: s.roles.length, detail: 'Exact role titles as announced' },
    { label: 'Season span', value: `${date(m.firstDate)}–${date(m.latestDate)}`, detail: 'First to latest declared result' },
  ];
  return <><Section title="Insights" note="Computed from the T&PO dataset"><div className="insight-grid">{cards.map(c => <article className="insight-card" key={c.label}><div className="ic-label">{c.label}</div><div className="ic-value">{c.value}</div><div className="ic-detail">{c.detail}</div></article>)}</div></Section>
    <Section title="Branch & Company Distribution"><div className="grid2"><div><h3 className="section-title">Branch Distribution · Selections</h3><Donut rows={s.branchRanking} label="Selections by branch" /><a className="back-link" href={routeHref("branches")}>Full branch breakdown →</a></div><div><h3 className="section-title">Company Type Breakdown</h3><Donut rows={s.types} label="Unique companies by type" /></div></div></Section>
    <Section title="CTC Distribution" note={s.batch.ctcWeighting === "selection" ? "Known report selections grouped by package band" : "Announcements grouped by package band"}><ColumnChart rows={s.histogram} label={s.batch.ctcWeighting === "selection" ? "Selection-weighted CTC distribution" : "Announcement-weighted CTC distribution"} /></Section>
    <Section title="Placement Activity by Month" note="Dated result records per month · undated records excluded"><ColumnChart rows={s.months.map(r => ({ ...r, label: new Date(r.label + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) }))} label="Announcements per month" /></Section>
  </>;
}

export function CareerExplorer({statistics,view,filters,setFilters}:{statistics:Statistics;view?:string;filters:CandidateFilters;setFilters:(next:CandidateFilters)=>void}) {
 const selected=['timeline','insights'].includes(view||'')?view:'candidates';
 return <><div className="career-explorer-heading"><h1>Career explorer</h1><p>Find people and roles, understand the hiring timeline, and compare placement outcomes for this batch.</p><nav className="career-explorer-tabs" aria-label="Career explorer views">{[['candidates','Candidates & roles'],['timeline','Hiring timeline'],['insights','Insights']].map(([key,label])=><a key={key} href={routeHref(`explore/${key}`,statistics.batch.year)} aria-current={selected===key?'page':undefined}>{label}</a>)}</nav></div>{selected==='timeline'?<Timeline statistics={statistics}/>:selected==='insights'?<Insights statistics={statistics}/>:<Candidates statistics={statistics} filters={filters} setFilters={setFilters}/>}</>;
}
