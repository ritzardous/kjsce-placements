import { AppIcon } from './AppIcon';
import { useAuth } from './auth';
import { NotificationLink } from './Contributions';

export function ProcedureNavigation({ view }: { view?: string }) {
  const { admin } = useAuth();
  const personal = view === 'contributions' || view === 'contribute';
  const browsing = !personal && view !== 'saved' && view !== 'notifications' && view !== 'admin';
  return <div className="procedure-navigation">
    <nav className="procedure-tabs" aria-label="Company procedures views">
      <a href="#procedures" aria-current={browsing ? 'page' : undefined}><AppIcon name="search"/><span>Browse experiences</span></a>
      <a href="#procedures/saved" aria-current={view === 'saved' ? 'page' : undefined}><AppIcon name="bookmark"/><span>Saved for prep</span></a>
      <a href="#procedures/contributions" aria-current={personal ? 'page' : undefined}><AppIcon name="pen"/><span>My contributions</span></a>
    </nav>
    <nav className="procedure-utilities" aria-label="Community actions">
      <NotificationLink />
      {admin && <a href="#admin/procedures" aria-current={view === 'admin' ? 'page' : undefined}><AppIcon name="shield"/><span>Admin review</span></a>}
      {view !== 'contribute' && <a className="action-button" href="#procedures/contribute"><AppIcon name="pen"/><span>Share an experience</span></a>}
    </nav>
  </div>;
}
