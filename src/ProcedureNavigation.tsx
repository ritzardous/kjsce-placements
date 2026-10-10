import { useAuth } from './auth';
import { NotificationLink } from './Contributions';

export function ProcedureNavigation({ view }: { view?: string }) {
  const { admin } = useAuth();
  const personal = view === 'contributions' || view === 'contribute';
  const browsing = !personal && view !== 'saved' && view !== 'notifications' && view !== 'admin';
  return <div className="procedure-navigation">
    <nav className="procedure-tabs" aria-label="Company procedures views">
      <a href="#procedures" aria-current={browsing ? 'page' : undefined}>Browse experiences</a>
      <a href="#procedures/saved" aria-current={view === 'saved' ? 'page' : undefined}>Saved for prep</a>
      <a href="#procedures/contributions" aria-current={personal ? 'page' : undefined}>My contributions</a>
    </nav>
    <nav className="procedure-utilities" aria-label="Community actions">
      <NotificationLink />
      {admin && <a href="#admin/procedures" aria-current={view === 'admin' ? 'page' : undefined}>Admin review</a>}
      {view !== 'contribute' && <a className="action-button" href="#procedures/contribute">Share an experience</a>}
    </nav>
  </div>;
}
