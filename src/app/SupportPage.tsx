import { useEffect } from 'react';
import { ThemeControl } from '../ui/ThemeControl';
import { ProductFooter } from '../ui/ProductFooter';
import { AppIcon } from '../ui/AppIcon';
import '../styles/developer-note.css';
import '../styles/support.css';

const sponsorshipEmail = 'mailto:riteshjha.exe@gmail.com,sakshamvarshney0701@gmail.com?subject=Let%27s%20talk%20about%20sponsoring%20Placement%20Stats';

export default function SupportPage({ signedIn }: { signedIn: boolean }) {
  const home = signedIn ? '#home' : '#landing';
  useEffect(() => { document.title = 'Support Placement Stats · KJSCE'; window.scrollTo(0, 0); }, []);
  return <div className="developer-note-page support-page">
    <header className="note-header"><a href={home} aria-label="Placement Stats home">Placement Stats<span>× KJSCE</span></a><ThemeControl/></header>
    <main className="support-main" id="support-main">
      <a className="support-back" href={home}><AppIcon name="back"/>Back to Placement Stats</a>
      <div className="support-layout"><div className="support-story">
        <h1>Help good information<br/><em>go a little further.</em></h1>
        <p>Behind a clear chart or a useful interview account are hours of reading, checking, reaching out to alumni, writing code and fixing the little things. We put that work in because we know what it feels like to prepare without the right information.</p>
        <p>If Placement Stats has made your next step a little clearer, a voluntary contribution can help us keep putting care into it.</p>
        <p className="support-promise"><strong>You don’t owe us anything.</strong> The app doesn’t require a payment. Using it, sharing an experience or telling a friend is support too.</p>
        <p className="support-signoff">Thank you for giving this work a place in your placement journey.</p>
      </div><aside className="support-contribution" aria-labelledby="support-qr-title">
        <h2 id="support-qr-title">A little support, if you’d like.</h2>
        <div className="support-qr"><img src="/support/upi-qr.jpg" width="512" height="512" alt="UPI QR code supplied by Ritesh for voluntary contributions to Placement Stats"/></div>
        <p>Scan with your UPI app. Check the recipient before confirming.</p>
        <a className="support-save" href="/support/upi-qr.jpg" download="placement-stats-upi.jpg">Save QR for your UPI app <AppIcon name="arrow"/></a>
      </aside></div>
      <div className="support-sponsorship"><div><h2><a href={sponsorshipEmail}>Something bigger in mind?</a></h2><p>For sponsorships or a partnership that makes sense for students, let’s start with a conversation.</p></div><a href={sponsorshipEmail}>Talk to us <AppIcon name="arrow"/></a></div>
    </main><ProductFooter publicView={!signedIn} showCredits={false}/>
  </div>;
}
