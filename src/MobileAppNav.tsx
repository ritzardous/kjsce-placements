export function MobileAppNav({ active, statisticsHref = '#statistics' }: { active: string; statisticsHref?: string }) {
  const items = [
    { key: 'statistics', label: 'Statistics', href: statisticsHref, path: 'M4 20h16M6 16V9m6 7V4m6 12v-5' },
    { key: 'procedures', label: 'Experiences', href: '#procedures', path: 'M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4V4Zm16 0h-4a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h4V4Z' },
    { key: 'account', label: 'Account', href: '#account', path: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2' },
  ];
  return <nav className="mobile-app-nav" aria-label="Quick navigation">{items.map(item => <a key={item.key} href={item.href} aria-current={active === item.key || active === 'home' && item.key === 'statistics' ? 'page' : undefined}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={item.path}/></svg><span>{item.label}</span></a>)}</nav>;
}
