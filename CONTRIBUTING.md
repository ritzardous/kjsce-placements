# Contributing

> **Mandatory: read and follow [`AGENTS.md`](AGENTS.md) before contributing.**
>
> `AGENTS.md` is binding for every human and AI contributor. Every pull request must state whether it was followed. PRs that omit the **AGENTS.md compliance** section in the PR template are incomplete and may be returned without review.

Thanks for helping maintain Placement Stats KJSCE. Start with [setup](docs/getting-started.md), [architecture](docs/architecture.md) and the [development guide](docs/development.md).

## Before changing code or data

Read [`AGENTS.md`](AGENTS.md) in full first. It defines the hard stops, architectural constraints, data rules, security boundaries, required checks, and PR compliance statement. If you are running a coding agent, the agent must read it before editing and must not proceed if it cannot comply.

Check existing issues/PRs for related work. Use a focused bug report or proposal for substantial changes; security and privacy incidents belong in the [private reporting process](SECURITY.md).

Use a fork or a branch with a descriptive name. `codex/` is used for Codex-created branches in this workspace; the repository has no enforced universal branch prefix. Keep each PR focused and describe the observable problem, resulting behavior and validation. Do not claim a deployment or live data change unless one was authorized and verified.

## Local workflow

```sh
npm ci
npm ci --prefix functions
npm run dev:beta
```

The beta uses isolated demo Firebase services. `npm run dev` targets the original live project through a project-specific API script; it is not the default for outside contributors. Never run live rules, seeding, role assignment or `procedures:deploy` without authorization for the exact target.

## Code and data standards

- Follow existing strict TypeScript/ES modules, React function components and nearby formatting. No formatter/linter script is configured; avoid unrelated formatting churn.
- Put shared contracts/calculations in `shared/`; keep Admin SDK imports and private credentials out of browser code.
- Validate untrusted input server-side, enforce owner/current-role checks and preserve transactional version guards.
- Preserve nulls, source notes and batch-specific CTC weighting. A data correction needs evidence and a reviewed new publication, not an edit to an active chunk.
- Do not merge companies because their names/logos resemble one another. Add reviewed identity evidence and regression tests.
- Preserve keyboard/focus behavior, small-screen readability, reduced motion and failed-request recovery.
- Update the relevant guide and links when behavior or commands change.

Do not include credentials, private exports, student records copied into bug reports, live account details or ignored test artifacts. Use synthetic examples when describing a failure.

## Validation and PR review

Run `npm test` and `npm run build`. For changes to auth, rules, backend transactions or user journeys, install Java 21+ and Playwright Chromium and run `npm run test:firebase`; focused admin/landing scripts are described in [development](docs/development.md). Add tests for meaningful changed behavior and denial boundaries, rather than mirroring implementation details.

For documentation-only changes, verify scripts against source and check local links; do not perform live mutations to validate prose. Report checks that could not run and why. Inspect `git diff` after builds because source-generation hooks can update tracked mappings.

Use the PR template to summarize scope, tests, screenshots when relevant, configuration/rules/index implications and remaining risks. The template's **AGENTS.md compliance** section is required: state `Yes`, `No`, or `Not applicable`, and explain any deviation or check that could not run. Do not mark a PR ready for review with an unanswered compliance section.

Maintainers review technical correctness, provenance, privacy, `AGENTS.md` compliance and maintainability. Do not assume merge rights or a release schedule.

## Licensing and conduct

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Submit original code and documentation under the project's [MIT License](LICENSE). Identify third-party material and preserve its required notices; do not represent company logos, source data or personal records as owned or freely reusable by the project. No separate contributor agreement is configured. Remaining data-rights and policy decisions are tracked in [maintainer decisions](docs/maintainer-decisions.md).
