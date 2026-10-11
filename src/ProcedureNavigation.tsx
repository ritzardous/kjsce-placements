import { AppIcon } from './AppIcon';
import { useAuth } from './auth';
import { NotificationLink } from './Contributions';

export function ProcedureNavigation({ view }: { view?: string }) {
  const { admin } = useAuth();
  const personal = view === 'contributions' || view === 'contribute';
  const browsing = !personal && view !== 'saved' && view !== 'notifications' && view !== 'admin';
  return <div className="procedure-navigation">
    <nav className="procedure-tabs" aria-label="Company procedures views">
      <a href="#procedures" aria-label="Browse experiences" aria-current={browsing ? 'page' : undefined}><AppIcon name="search"/><span className="procedure-nav-label-wide">Browse experiences</span><span className="procedure-nav-label-phone" aria-hidden="true">Browse</span></a>
      <a href="#procedures/saved" aria-label="Saved for prep" aria-current={view === 'saved' ? 'page' : undefined}><AppIcon name="bookmark"/><span className="procedure-nav-label-wide">Saved for prep</span><span className="procedure-nav-label-phone" aria-hidden="true">Saved</span></a>
      <a href="#procedures/contributions" aria-label="My contributions" aria-current={personal ? 'page' : undefined}><AppIcon name="pen"/><span className="procedure-nav-label-wide">My contributions</span><span className="procedure-nav-label-phone" aria-hidden="true">Contributions</span></a>
    </nav>
    <nav className="procedure-utilities" aria-label="Community actions">
      <NotificationLink />
      {admin && <a href="#admin/procedures" aria-current={view === 'admin' ? 'page' : undefined}><AppIcon name="shield"/><span>Admin review</span></a>}
      {view !== 'contribute' && <a className="action-button" href="#procedures/contribute"><AppIcon name="pen"/><span>Share an experience</span></a>}
    </nav>
  </div>;
}
