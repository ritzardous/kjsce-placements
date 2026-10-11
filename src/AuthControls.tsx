import {AdminReviewLink} from './AdminReviewLink';
import {useAuth} from './auth';
export default function AuthControls() {
 const {logout,busy}=useAuth();
 return <div className="auth-controls"><AdminReviewLink/><a className="auth-button account-header-link" href="#account" aria-current={location.hash==='#account'?'page':undefined}>My Account</a><button className="auth-button logout-button" disabled={busy} onClick={()=>void logout()}>{busy?'Logging out…':'Log out'}</button></div>;
}
