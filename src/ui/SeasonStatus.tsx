import '../styles/season-status.css';

/** An ongoing reviewed season, never a real-time ingestion or availability signal. */
export function SeasonStatus({label='Live'}:{label?:string}) {
  return <span className="live-badge season-status" title="Ongoing placement season. Updates are reviewed before publication."><span className="season-status-mark" aria-hidden="true"/>{label}</span>;
}
