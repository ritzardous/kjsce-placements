import { AppIcon } from './AppIcon';



export function ProcedureNavigation({ view }: { view?: string }) {

  const personal = view === 'contributions' || view === 'contribute';
  const browsing = !personal && view !== 'saved' && view !== 'notifications' && view !== 'admin';
  return <div className="procedure-navigation">
    <nav className="procedure-tabs" aria-label="Company procedures views">
      <a href="#procedures" aria-label="Browse experiences" aria-current={browsing ? 'page' : undefined}><AppIcon name="search"/><span className="procedure-nav-label-wide">Browse experiences</span><span className="procedure-nav-label-phone" aria-hidden="true">Browse</span></a>
      <a href="#procedures/saved" aria-label="Saved for prep" aria-current={view === 'saved' ? 'page' : undefined}><AppIcon name="bookmark"/><span className="procedure-nav-label-wide">Saved for prep</span><span className="procedure-nav-label-phone" aria-hidden="true">Saved</span></a>
      <a href="#procedures/contributions" aria-label="My contributions" aria-current={personal ? 'page' : undefined}><AppIcon name="pen"/><span className="procedure-nav-label-wide">My contributions</span><span className="procedure-nav-label-phone" aria-hidden="true">Contributions</span></a>
    </nav>

  </div>;
}
