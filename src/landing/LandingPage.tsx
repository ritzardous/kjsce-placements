import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { ArchiveIndex } from "./ArchiveIndex";
import { LandingFooter, LandingHeader, SignInCTA } from "./LandingChrome";
import { PathwayField, useMotionPolicy, usePageMotion } from "./motion";
import { recordPreviews } from "./archive-data";
import { visibleYears } from "../routing";
import { PeopleHandoff } from "./PeopleHandoff";
import { ClosingSection } from "./ClosingSection";
import { useScrollStory } from "./useScrollStory";
import "./landing.css";
const rounds = [
  {
    label: "The assessment",
    title: "Know what you’re walking into.",
    copy: "Read written accounts of assessment formats, topics and questions.",
    tags: ["Assessment format", "Questions", "Round structure"],
  },
  {
    label: "The interview",
    title: "Get past the job description.",
    copy: "Follow contributors’ round-by-round interview accounts and the questions they faced.",
    tags: ["Technical rounds", "Interview questions", "Selection process"],
  },
  {
    label: "What helped",
    title: "Prepare with a little perspective.",
    copy: "Browse preparation tips and lessons saved in contributors’ experience write-ups.",
    tags: ["Preparation tips", "Lessons learned", "Firsthand context"],
  },
];
export default function LandingPage({ deepLink = false }: { deepLink?: boolean }) {
  const { error, user, logout, busy } = useAuth(),
    root = useRef<HTMLDivElement>(null),
    support = useRef<HTMLElement>(null),
    allowed = useMotionPolicy(),
    [paused, setPaused] = useState(false),
    [batch, setBatch] = useState(2026);
  // Background playback must not collapse the scroll chapters and shift the page.
  const experience = useScrollStory(3, allowed);
  const people = useScrollStory(3, allowed, true);
  const round = experience.index, current = rounds[round];
  usePageMotion(root, allowed && !paused);
  const explore = () => {
    support.current?.scrollIntoView({ behavior: allowed ? "smooth" : "instant" });
    support.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (
      new URLSearchParams(location.hash.split("?")[1]).get("section") ===
      "archive"
    )
      support.current?.scrollIntoView();
  }, []);
  return (
    <div
      ref={root}
      className="ps-landing"
      data-motion={allowed && !paused ? "on" : "off"}
    >
      <a
        className="lp-skip"
        href="#landing"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("landing-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="landing-content" className="lp-main" tabIndex={-1}>
        <section className="lp-hero" aria-labelledby="landing-title">
          <PathwayField />
          <div className="lp-hero-copy">
            <p className="lp-kicker">
              <span className="lp-spark" aria-hidden="true">
                ✳
              </span>{" "}
              Built for the next batch. Built for KJSCE.
            </p>
            <h1 id="landing-title">
              <span>Know more.</span>
              <em>Go further.</em>
            </h1>
            <p className="lp-intro">
              Your placement prep.
              <br /> With the <span>whole picture.</span>
            </p>
            <SignInCTA />
            {deepLink && <p className="lp-return">Sign in to continue to the page you opened.</p>}
            {user && <button type="button" className="lp-text-button" disabled={busy} onClick={() => void logout()}>Sign out of the current account</button>}
            {error && (
              <p className="lp-auth-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <ArchiveIndex
            paused={paused}
            onToggleMotion={() => setPaused((value) => !value)}
          />
          <a
            className="lp-hero-scroll"
            href="#landing?section=archive"
            onClick={(event) => {
              event.preventDefault();
              explore();
            }}
          >
            <span>More than a placement report</span>
            <span aria-hidden="true">↓</span>
          </a>
        </section>
        <section
          ref={support}
          tabIndex={-1}
          id="archive-overview"
          className="lp-records lp-section"
          aria-labelledby="records-title"
        >
          <div className="lp-section-copy" data-reveal>
            <p className="lp-section-label">The records</p>
            <h2 id="records-title">
              The full picture.
              <br />
              <em>Not just the headline.</em>
            </h2>
            <p>
              Look past the highest package. Explore outcomes, roles and
              compensation by company and batch, with sources and gaps in view.
            </p>
            <a className="lp-text-link" href={`#${batch}/overview`}>
              Explore placement statistics <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="lp-record-desk" data-reveal>
            <div className="lp-desk-under" aria-hidden="true" />
            <div className="lp-record-sheet">
              <div className="lp-sheet-top">
                <span>KJSCE / Placement records</span>
                <span className="lp-sheet-stamp">Source-backed</span>
              </div>
              <div className="lp-record-year">
                <span className="lp-serif">Class of</span>
                <div role="group" aria-label="Preview placement batch">
                  {visibleYears
                    .filter((value) => recordPreviews[value])
                    .map((value) => (
                      <button
                        key={value}
                        aria-pressed={batch === value}
                        onClick={() => setBatch(value)}
                      >
                        {value}
                      </button>
                    ))}
                </div>
              </div>
              <div className="lp-record-columns">
                <span>Company</span>
                <span>Role</span>
                <span>Compensation</span>
              </div>
              <div className="lp-record-rows">
                {recordPreviews[batch].map((item) => (
                  <a
                    key={item.key}
                    href={`#${batch}/company/${item.key}`}
                    aria-label={`${item.name}: ${item.role}${item.roleInference ? " (inferred)" : ""}, ${item.ctc}. Open source record`}
                  >
                    <span className="lp-record-company">
                      <img
                        src={item.logo}
                        alt=""
                        width="26"
                        height="26"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                          event.currentTarget.parentElement?.classList.add(
                            "logo-unavailable",
                          );
                        }}
                      />
                      <span>{item.name}</span>
                    </span>
                    <span
                      className="lp-record-role"
                      title={item.roleInference?.note}
                    >
                      {item.role}
                      {item.roleInference && (
                        <sup
                          className="lp-inferred-mark"
                          aria-label="Inferred role; not confirmed in the placement source"
                        >
                          *
                        </sup>
                      )}
                    </span>
                    <span className="lp-record-compensation">
                      {item.ctc}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section ref={experience.ref} className="lp-experiences lp-scroll-story" aria-labelledby="experience-title">
          <div className="lp-story-pin">
            <div className="lp-story-meter" aria-hidden="true"><span /></div>
            <div className="lp-experience-spread" data-step={round}>
              <div className="lp-experience-heading" data-reveal>
                <p className="lp-section-label">The experience archive</p>
                <h2 id="experience-title">
                  The process.
                  <br />
                  <em>In their words.</em>
                </h2>
                <p>
                  Written assessment and interview experiences, shared by KJSCE
                  students. Read what happened, round by round.
                </p>
                <svg
                  className="lp-notebook-mark"
                  viewBox="0 0 160 76"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M18 17H72V65H18Z M32 7H86V55 M51 31H118M105 18L119 31L105 44"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M138 10V26M130 18H146"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
              </div>
              <div className="lp-experience-workbench" data-reveal data-story-focus>
                <div
                  className="lp-round-track"
                  role="group"
                  aria-label="Explore hiring experiences"
                >
                  {rounds.map((item, index) => (
                    <button
                      key={item.label}
                      aria-pressed={round === index}
                      aria-controls="experience-detail"
                      onClick={() => experience.select(index)}
                    >
                      <span className="lp-round-node" aria-hidden="true">
                        {round > index ? "✓" : index + 1}
                      </span>
                      <span>{item.label}</span>
                      <span className="lp-round-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  key={round}
                  id="experience-detail"
                  className="lp-round-detail"
                  aria-live="polite"
                >
                  <span className="lp-round-watermark" aria-hidden="true">
                    {String(round + 1).padStart(2, "0")}
                  </span>
                  <h3>{current.title}</h3>
                  <p>{current.copy}</p>
                  <div className="lp-round-tags">
                    {current.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <a className="lp-text-link" href="#procedures">
                  Read the experience archive <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>
        <section
          ref={people.ref}
          className="lp-people lp-section lp-scroll-story"
          aria-labelledby="people-title"
        >
          <div className="lp-story-pin lp-people-layout">
            <div className="lp-story-meter" aria-hidden="true"><span /></div>
            <PeopleHandoff prompt={people.index} onPrompt={people.select} />
            <div className="lp-section-copy" data-reveal>
              <p className="lp-section-label">The senior directory</p>
              <h2 id="people-title">
                Find a senior.
                <br />
                <em>Start a conversation.</em>
              </h2>
              <p>
                Find KJSCE seniors by company. Open their available LinkedIn
                profiles and reach out directly about their role and career path.
              </p>
            </div>
          </div>
        </section>
        <ClosingSection
          allowed={allowed}
          paused={paused}
          onToggleMotion={() => setPaused((value) => !value)}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
