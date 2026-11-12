import { AppIcon } from "../ui/AppIcon";
import { useState } from "react";
import { archiveCompanies, companyRoute, companyYears } from "./archive-data";
const connectionCompanies = archiveCompanies.slice(0, 3);
const prompts = [
  {
    label: "The work",
    text: "What do you work on day to day?",
    path: "M0 50H135Q160 50 175 30L185 17Q197 0 215 0H400",
  },
  {
    label: "Their route",
    text: "How did you land this role?",
    path: "M0 50H400",
  },
  {
    label: "Reach out",
    text: "Could I ask about your team?",
    path: "M0 50H135Q160 50 175 70L185 83Q197 100 215 100H400",
  },
];
/** A placement handoff: target company → relevant seniors → a thoughtful first question.
 * No names, profile counts or actual conversations are fabricated for the public preview. */
export function PeopleHandoff({ prompt, onPrompt }: { prompt: number; onPrompt: (index: number) => void }) {
  const [selected, setSelected] = useState(1),
    company = connectionCompanies[selected],
    year = companyYears(company).at(-1)!;
  return (
    <div className="lp-handoff" data-reveal>
      <div className="lp-handoff-top">
        <span className="lp-handoff-school">
          KJSCE
        </span>
      </div>
      <div className="lp-handoff-target">
        <span>Your next target company</span>
        <div role="group" aria-label="Choose a company for senior connections">
          {connectionCompanies.map((item, index) => (
            <button
              type="button"
              key={item.id}
              data-company={item.id}
              aria-label={`Find alumni at ${item.name}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <img
                src={item.logo}
                width="28"
                height="28"
                alt=""
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.parentElement?.classList.add(
                    "logo-unavailable",
                  );
                }}
              />
              <span>{item.short}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="lp-handoff-route" aria-hidden="true">
        <span>You</span>
        <svg viewBox="0 0 400 100" preserveAspectRatio="none">
          {prompts.map((item, index) => (
            <g key={item.label} className={prompt === index ? "is-active" : ""}>
              <path className="handoff-rail" d={item.path} pathLength="100" vectorEffect="non-scaling-stroke" />
              <path className="handoff-glow" d={item.path} pathLength="100" vectorEffect="non-scaling-stroke" />
              <path className="handoff-signal" d={item.path} pathLength="100" vectorEffect="non-scaling-stroke" />
              <circle className="handoff-destination" cx="400" cy={index * 50} r="2.5" />
            </g>
          ))}
        </svg>
        <div>
          {prompts.map((item, index) => <span key={item.label} className={prompt === index ? "is-active" : ""}>{item.label}</span>)}
        </div>
      </div>
      <div className="lp-handoff-ticket">
        <div className="lp-handoff-ticket-heading">
          <span className="lp-handoff-monogram" aria-hidden="true">
            in
          </span>
          <div className="lp-contact-caption" aria-live="polite">
            <strong>{company.name}</strong>
            <span>Available alumni on LinkedIn</span>
          </div>
        </div>
        <div className="lp-handoff-question" data-story-focus>
          <span>A question to start with</span>
          <div aria-live="polite" aria-atomic="true">
            <p key={prompt}>{prompts[prompt].text}</p>
          </div>
          <div role="group" aria-label="Example questions for a senior">
            {prompts.map((item, index) => (
              <button
                type="button"
                key={item.label}
                aria-label={item.text}
                aria-pressed={prompt === index}
                onClick={() => onPrompt(index)}
              >
                <span aria-hidden="true">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <a className="lp-text-link" href={companyRoute(company, year)}>
          Find alumni at {company.short} <AppIcon name="user"/>
        </a>
      </div>
    </div>
  );
}
