import {AdminReviewLink} from './AdminReviewLink';
import {useAuth} from './auth';
import {AppIcon} from './AppIcon';
import {ThemeControl} from './ThemeControl';
import {ProfileAvatar} from './ProfileAvatar';
export default function AuthControls() {
 const {user,logout,busy}=useAuth();
 return <div className="auth-controls"><AdminReviewLink/><ThemeControl/><a className="auth-button account-header-link icon-control" href="#account" aria-label="My Account" title="My Account" aria-current={location.hash==='#account'?'page':undefined}><ProfileAvatar user={user} compact/></a><button className="auth-button logout-button" aria-label={busy?'Logging out…':'Log out'} title="Log out" disabled={busy} onClick={()=>void logout()}><AppIcon name="logout"/><span>{busy?'Logging out…':'Log out'}</span></button></div>;
}
