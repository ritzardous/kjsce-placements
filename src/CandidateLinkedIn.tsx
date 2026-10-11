import profiles from './candidate-linkedin-2026.json';
const links:Record<string,string>=profiles;
export function CandidateLinkedIn({roll,name,year}:{roll:string;name:string;year:number}) {
  const url=year===2026?links[roll]:undefined;
  const logo=<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.75 1.36-1.55 2.8-1.55 2.99 0 3.57 1.97 3.57 4.53v5.27Z"/></svg>;
  return url?<a className="candidate-linkedin" href={url} target="_blank" rel="noopener noreferrer" aria-label={`View ${name}'s LinkedIn profile (opens in a new tab)`}>{logo}<span>LinkedIn</span><span aria-hidden="true">↗</span></a>:<span className="candidate-linkedin candidate-linkedin-pending" aria-label={`LinkedIn profile for ${name} coming soon`} title="Profile not available yet">{logo}<span>Coming soon</span></span>;
}
