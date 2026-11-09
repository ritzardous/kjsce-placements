import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { ArchiveIndex } from "./ArchiveIndex";
import { LandingFooter, LandingHeader, SignInCTA } from "./LandingChrome";
import { PathwayField, useMotionPolicy, usePageMotion } from "./motion";
import { recordPreviews } from "./archive-data";
import { visibleYears } from "../routing";
import { PeopleHandoff } from "./PeopleHandoff";
import { ClosingSection } from "./ClosingSection";
import "./landing.css";
const rounds = [
  {
    label: "The assessment",
    title: "Know what you’re walking into.",
    copy: "Explore the rounds, formats and questions contributors remember.",
    tags: ["Assessment format", "Questions", "Round structure"],
  },
  {
    label: "The interview",
    title: "Get past the job description.",
    copy: "Read how company-specific interviews unfolded for other students.",
    tags: ["Technical rounds", "Interview questions", "Selection process"],
  },
  {
    label: "What helped",
    title: "Prepare with a little perspective.",
    copy: "Learn what contributors found useful, then build your own approach.",
    tags: ["Preparation tips", "Lessons learned", "Firsthand context"],
  },
];
export default function LandingPage() {
  const { error } = useAuth(),
    root = useRef<HTMLDivElement>(null),
    support = useRef<HTMLElement>(null),
    allowed = useMotionPolicy(),
    [paused, setPaused] = useState(false),
    [batch, setBatch] = useState(2026),
    [round, setRound] = useState(0),
    current = rounds[round];
  usePageMotion(root, allowed && !paused);
  const explore = () => {
    support.current?.scrollIntoView({
      behavior: allowed ? "smooth" : "instant",
    });
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
      <LandingHeader onExplore={explore} />
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
                      <img src={item.logo} alt="" width="26" height="26" />
                      {item.name}
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
        <section className="lp-experiences" aria-labelledby="experience-title">
          <div className="lp-experience-heading" data-reveal>
            <p className="lp-section-label">The experiences · beta</p>
            <h2 id="experience-title">
              They went first.
              <br />
              <em>You don’t go blind.</em>
            </h2>
            <p>
              Someone from your college has faced that process.
              <br />
              Learn from the experiences shared with the next batch.
            </p>
          </div>
          <div className="lp-experience-workbench" data-reveal>
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
                  onClick={() => setRound(index)}
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
              Read firsthand experiences <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <section
          className="lp-people lp-section"
          aria-labelledby="people-title"
        >
          <PeopleHandoff />
          <div className="lp-section-copy" data-reveal>
            <p className="lp-section-label">The people</p>
            <h2 id="people-title">
              Big company.
              <br />
              <em>Smaller world.</em>
            </h2>
            <p>
              Find seniors and alumni alongside company records. Follow
              available LinkedIn profiles to ask better questions, with the
              right context.
            </p>
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
