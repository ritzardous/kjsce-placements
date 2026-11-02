import { ActionMenu } from './ActionMenu';
import { NotificationBell } from './NotificationBell';
import { AdminReviewLink } from './AdminReviewLink';
import { useAuth } from './auth';
import { AppIcon } from './AppIcon';
import { ThemeControl } from './ThemeControl';
import { ProfileAvatar } from './ProfileAvatar';
const destinations = [
  ['My account', '#account'],
  ['My contributions', '#procedures/contributions'],
  ['Saved for prep', '#procedures/saved'],
  ['Notification preferences', '#procedures/notifications?preferences=1'],
];
export default function AuthControls() {
  const { user, logout, busy } = useAuth();
  return <div className="auth-controls"><NotificationBell/><ThemeControl/>
    <ActionMenu label="Account" className="account-menu" trigger={<ProfileAvatar user={user} compact/>}>
      <div className="account-panel-identity"><ProfileAvatar user={user}/><div><strong>{user?.displayName || 'Your account'}</strong><span>{user?.email || 'Signed in'}</span></div></div>
      <nav aria-label="Your account">{destinations.map(([label,href])=><a key={href} href={href} aria-current={location.hash.split('?')[0]===href.split('?')[0]?'page':undefined}>{label}</a>)}<AdminReviewLink/></nav>
      <button className="auth-button logout-button" data-keep-open aria-busy={busy} disabled={busy} onClick={()=>void logout()}><AppIcon name="logout"/><span>{busy?'Logging out…':'Log out'}</span></button>
    </ActionMenu>
  </div>;
}
