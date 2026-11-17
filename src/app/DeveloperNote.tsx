import { AppIcon } from '../ui/AppIcon';
import { useEffect } from 'react';
import { ProjectLegalNotice } from './ProjectLegalNotice';
import { ThemeControl } from '../ui/ThemeControl';
import { ProductFooter } from '../ui/ProductFooter';
import '../styles/developer-note.css';

export default function DeveloperNote({section, signedIn}: {section?:string; signedIn:boolean}) {
  useEffect(()=>{
    document.title='A note from us · Placement Stats KJSCE';
    const frame=requestAnimationFrame(()=>{
      const target=section && document.getElementById('note-'+(section==='feedback'?'contact':section));
      if(target) target.scrollIntoView({block:'start'});
      else window.scrollTo(0,0);
    });
    return()=>cancelAnimationFrame(frame);
  },[section]);
  return <div className="developer-note-page">
    <header className="note-header"><a href={signedIn?'#home':'#landing'} aria-label="Placement Stats home">Placement Stats<span>× KJSCE</span></a><ThemeControl/></header>
    <main className="developer-note" id="note-main">
      <div className="note-intro"><h1>Good information<br/>should travel further.</h1><p className="note-lead">A small page became something people cared about. This is what we’re building next, and what we owe you along the way.</p></div>
      <nav className="note-nav" aria-label="About this project"><a href="#about/story">Our story</a><a href="#about/contact">Say hello</a><a href="#about/sources">Sources</a><a href="#about/privacy">Privacy</a><a href="#about/terms">Using the app</a></nav>
      <section id="note-story" className="note-story"><h2>It started with a gap.</h2><p>I built the first version because I needed it. Placement season came with plenty of questions, but useful information was scattered: an email here, a forwarded message there, something someone’s senior happened to know. Getting a clear picture took more luck than it should have.</p><p>So I made <a href="https://placementsatkjsce-26.vercel.app/" target="_blank" rel="noopener noreferrer">a simple HTML page</a> to bring the placement numbers together. Nothing elaborate. Just something I wished I’d had.</p><p>Then people around college started using it, sharing it, and telling me it helped. To everyone who opened that page, sent it to a friend, or took the time to say something kind: thank you. That response made us want to put much more care into this.</p><h2>Now, we’re building the next step.</h2><p>Placement Stats brings the numbers, interview experiences, and available alumni links into one place. We want you to spend less time chasing context and more time deciding what to do with it.</p><p>That means a clearer view of past hiring, honest accounts from people who went through the rounds, and a way to learn beyond your immediate circle. If you’re in the Class of 2027, your experience belongs here too, even if the company isn’t in the directory yet.</p><p>We’re still students building for students. We’ll make mistakes, and we want to hear when something is wrong. What matters to us is making this useful, keeping the limits visible, and treating the people behind the records with care.</p><p className="note-thanks">Thanks for giving a small idea a reason to grow.</p></section>
      <section id="note-contact" className="note-feedback">
        <h2>Hi, we’re Ritesh and Saksham.</h2>
        <p>We’re glad you’re here. Tell us what helped, what felt off, or what would make your next step easier. A bug, a feature you wish existed, something we should remove, or just the gist of how the app feels. You don’t need to have it all figured out.</p>
        <p className="note-feedback-line">A “what if…” is a perfectly good first message.</p>
        <p>We want Placement Stats to reach more students and keep getting more useful. If you’re building something for this audience, want to advertise here, sponsor the project, or explore a partnership, we’d love to talk. Tell us what you have in mind and why it would fit the people using the app.</p>
        <p>Or just say hello. A conversation doesn’t need an agenda.</p>
        <p>If you’d like to help keep this work going, there’s a <a href="#support">donation page</a>. Entirely optional, always appreciated.</p>
        <div className="note-contacts"><article><h3>Ritesh</h3><a href="mailto:riteshjha.exe@gmail.com">riteshjha.exe@gmail.com</a><a href="https://github.com/ritzardous" target="_blank" rel="noopener noreferrer">@ritzardous on GitHub</a><a href="https://www.linkedin.com/in/ritesh-j/" target="_blank" rel="noopener noreferrer">Ritesh on LinkedIn</a></article><article><h3>Saksham</h3><a href="mailto:sakshamvarshney0701@gmail.com">sakshamvarshney0701@gmail.com</a><a href="https://github.com/Saksham-Varshney07" target="_blank" rel="noopener noreferrer">@Saksham-Varshney07 on GitHub</a><a href="https://www.linkedin.com/in/sakshamvarshney07" target="_blank" rel="noopener noreferrer">Saksham on LinkedIn</a></article></div>
        <p>Email either of us, <a href="mailto:riteshjha.exe@gmail.com,sakshamvarshney0701@gmail.com?subject=Placement%20Stats%20%3A%20let%E2%80%99s%20talk">write to us both</a>, or leave a bug or idea on <a href="https://github.com/ritzardous/kjsce-placements/issues/new/choose" target="_blank" rel="noopener noreferrer">GitHub</a>. For business enquiries, corrections or anything private, email is the best place to start.</p>
        <p className="note-small">Please keep personal-data concerns out of public issues. You can reach either of us privately at the addresses above.</p>
        <a className="note-repository" href="https://github.com/ritzardous/kjsce-placements" target="_blank" rel="noopener noreferrer">Explore the code on GitHub <AppIcon name="arrow"/></a>
      </section>
      <ProjectLegalNotice/>
    </main><ProductFooter publicView={!signedIn} showCredits={false}/><a className="note-return" href={signedIn?'#home':'#landing'}><AppIcon name="back"/>Back to Placement Stats</a>
  </div>;
}
