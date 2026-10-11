import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CompanyIdentity } from './CompanyIdentity';

export const money = (value: number | null) => value === null ? 'Not available' : `₹${value.toFixed(2)}L`;
export const date = (value: string | null, full = false) => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(full ? { year: 'numeric' as const } : {}) }) : 'Not available';
export const academicYear = (year: number) => `${year - 1}–${String(year).slice(-2)}`;
export const routeHref = (page: string, year = /^#(2025|2027)(?:\/|$)/.exec(location.hash)?.[1] ? Number(location.hash.slice(1, 5)) : 2026) => `${year === 2026 ? '#' : `#${year}/`}${page}`;
export const companyHref = (key: string) => routeHref('company/' + encodeURIComponent(key));
export function Tag({ children }: { children: ReactNode }) { return <span className="tag">{children}</span>; }
export function Empty({ title = 'No matches', children }: { title?: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="es-title">{title}</div>{children ?? 'Try a different search or clear the filters.'}</div>;
}
export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return <section className="section"><div className="section-head"><h2 className="section-title">{title}</h2><div className="section-note">{note}</div></div>{children}</section>;
}
export function Stat({ value, label, extra, headline = false }: { value: ReactNode; label: string; extra?: ReactNode; headline?: boolean }) {
  return <div className={'stat' + (headline ? ' headline' : '')}><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-extra">{extra}</div></div>;
}
export interface Column<T> { label: string; render: (row: T) => ReactNode; numeric?: boolean; sort?: string; primary?: boolean; }
export function Table<T>({ columns, rows, rowKey, onSort, sort, empty }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T, index: number) => string;
  onSort?: (key: string) => void; sort?: { key: string; direction: 'asc' | 'desc' }; empty?: ReactNode;
}) {
  return <div className="table-wrap"><table className="card-table"><thead><tr>{columns.map(c => <th key={c.label} className={c.numeric && c.sort ? 'num sortable' : c.numeric ? 'num' : c.sort ? 'sortable' : ''} scope="col" aria-sort={sort && c.sort === sort.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
    {c.sort && onSort ? <button className="sort-button" onClick={() => onSort(c.sort!)}>{c.label}{c.sort === sort?.key && <span className="arrow">{sort.direction === 'asc' ? '▲' : '▼'}</span>}</button> : c.label}
  </th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={rowKey(r, i)}>{columns.map((c, j) => <td key={c.label} className={(c.numeric ? 'num mono ' : '') + (c.primary || (!columns.some(column => column.primary) && j === 0) ? 'cell-strong card-title' : '')} data-label={c.label}>{c.render(r)}</td>)}</tr>) : <tr><td colSpan={columns.length}>{empty ?? <Empty />}</td></tr>}</tbody></table></div>;
}
export interface Rank { label: string; value: number; href?: string; companyKey?: string; }
export function RankedBars({ rows, unit = 'sel.', format }: { rows: Rank[]; unit?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return <>{rows.map((r, i) => <a className="rank-row" key={`${r.label}-${i}`} href={r.href}><span className="rank-idx">{i + 1}</span><span className="rank-main"><span className="rank-name">{r.companyKey ? <CompanyIdentity companyKey={r.companyKey} name={r.label} size="small" /> : r.label}</span><span className="rank-bar-track"><span className="rank-bar-fill" style={{ width: `${r.value / max * 100}%` }} /></span></span><span className="rank-val">{format ? format(r.value) : r.value}<span className="unit">{unit}</span></span></a>)}</>;
}
const colors = ['#1B4CFF', '#0F0F12', '#8FA6FF', '#68665F', '#C9D2FF', '#B0AEA6', '#4C6BFF', '#D8D6CE'];
export function Donut({ rows, label }: { rows: Rank[]; label: string }) {
  const [selected,setSelected]=useState<number|null>(null),[hovered,setHovered]=useState<number|null>(null);
  const active=hovered??selected;
  const total = rows.reduce((n, r) => n + r.value, 0);
  let offset = 0;
  if (!total) return <Empty title="No data available" />;
  return <><div className="react-donut"><svg viewBox="0 0 200 200" role="img" aria-label={label}><title>{label}</title>{rows.map((r, i) => {
    const length = r.value / total * 100;
    const start = offset; offset += length;
    return <circle className={`chart-segment ${active===i?'is-active':active!==null?'is-muted':''}`} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)} onClick={()=>setSelected(selected===i?null:i)} key={r.label} cx="100" cy="100" r="72" fill="none" stroke={colors[i % colors.length]} strokeWidth="26" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{r.label}: {r.value}</title></circle>;
  })}<text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="donut-total">{total}</text></svg><div className="react-legend">{rows.map((r, i) => <div key={r.label}><button type="button" className="chart-legend-button" aria-pressed={selected===i} onFocus={()=>setHovered(i)} onBlur={()=>setHovered(null)} onClick={()=>setSelected(selected===i?null:i)}><span className="legend-swatch" style={{ background: colors[i % colors.length] }} /><span>{r.label}</span><span className="mono">{r.value} · {(r.value / total * 100).toFixed(1)}%</span></button></div>)}</div></div><div className="chart-description chart-readout" role="status">{active!==null&&rows[active]?`${rows[active].label}: ${rows[active].value} (${(rows[active].value/total*100).toFixed(1)}%)`:'Choose a category to see its share.'}</div></>;
}
function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
export function ColumnChart({ rows, label }: { rows: Rank[]; label: string }) {
  const { ref, width } = useChartWidth();
  const [active,setActive]=useState<number|null>(null);
  const height = 215, baseline = 165, left = 25;
  const max = Math.max(1, ...rows.map(r => r.value));
  const step = (width - 2 * left) / Math.max(1, rows.length);
  return <div className="col-chart-wrap" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}><title>{label}</title>{rows.map((r, i) => {
    const barHeight = r.value / max * 135;
    const x = left + i * step;
    return <g className={`chart-column ${active===i?'is-active':''}`} key={r.label} tabIndex={0} role="button" aria-label={`${r.label}: ${r.value}`} aria-pressed={active===i} onFocus={()=>setActive(i)} onMouseEnter={()=>setActive(i)} onClick={()=>setActive(i)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActive(i);}if(event.key==='Escape')setActive(null);}}><rect className="chart-hit-target" x={x} y={15} width={step} height={175} fill="transparent"/><rect className="chart-bar" x={x + step * .15} y={baseline - barHeight} width={step * .7} height={barHeight} fill="var(--accent)"><title>{r.label}: {r.value}</title></rect><text x={x + step / 2} y={baseline - barHeight - 6} textAnchor="middle" className="chart-label">{r.value}</text>{(step > 43 || i % 2 === 0 || i === rows.length - 1) && <text x={x + step / 2} y="187" textAnchor="middle" className="chart-label">{r.label}</text>}</g>;
  })}</svg><div className="chart-description chart-readout" role="status">{active!==null&&rows[active]?`${rows[active].label}: ${rows[active].value}`:'Choose a bar to see its value.'}</div></div>;
}
export interface TimelinePoint { id: string; date: string; value: number; company: string; companyKey: string; hired: number; }
export function LineChart({ points, label }: { points: TimelinePoint[]; label: string }) {
  const { ref, width } = useChartWidth();
  const [active, setActive] = useState<TimelinePoint | null>(null);
  const height = 290, bottom = 250, left = 45, right = width - 25;
  const times = points.map(p => new Date(p.date + 'T00:00:00').getTime());
  const minTime = Math.min(...times), range = Math.max(1, Math.max(...times) - minTime);
  const max = Math.max(1, ...points.map(p => p.value));
  const x = (i: number) => left + (times[i] - minTime) / range * (right - left);
  const y = (value: number) => bottom - value / max * 225;
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ');
  const months = points.flatMap((p, i) => !i || p.date.slice(0, 7) !== points[i - 1].date.slice(0, 7) ? [{ i, label: date(p.date).slice(3) + ' ' + p.date.slice(2, 4) }] : []);
  let lastTick = -100;
  return <div className="timeline-chart-wrap" ref={ref}>
    {!points.length ? <Empty title="No timeline data" /> : <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}><title>{label}</title>{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={left} x2={right} y1={y(max * i / 4)} y2={y(max * i / 4)} stroke="var(--line-faint)" /><text x={left - 8} y={y(max * i / 4) + 3} textAnchor="end" className="chart-label">{Math.round(max * i / 4)}</text></g>)}<path d={`${path} L ${x(points.length - 1)} ${bottom} L ${x(0)} ${bottom} Z`} fill="var(--accent-dim)" /><path d={path} stroke="var(--accent)" strokeWidth="2" fill="none" />{points.map((p, i) => <a href={companyHref(p.companyKey)} key={p.id} onFocus={() => setActive(p)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(p)} onMouseLeave={() => setActive(null)} aria-label={`${p.company}, ${date(p.date, true)}, ${p.value}`}><circle className="chart-hit-target" cx={x(i)} cy={y(p.value)} r="12" fill="transparent"/><circle className="timeline-point" cx={x(i)} cy={y(p.value)} r="4" fill="var(--accent)" stroke="white"><title>{p.company} · {date(p.date, true)} · {p.value}</title></circle></a>)}{months.map(t => {
      const tickX = x(t.i); if (tickX - lastTick < (width < 480 ? 65 : 72)) return null; lastTick = tickX;
      return <text key={t.i} x={tickX} y="274" textAnchor="middle" className="chart-label">{t.label}</text>;
    })}</svg>}
    <div className="chart-description" aria-live="polite">{active ? `${active.company} · ${date(active.date, true)} · +${active.hired} selections · ${label}: ${active.value}` : label}</div>
  </div>;
}
