# Admin workspace improvement plan

**Status:** implemented locally. See [implementation and operation notes](admin-workspace-implementation.md). **Date:** 9 November 2026.

**Goal:** give admins practical control over users, content and application data through a calm, maintainable workspace.

## Current baseline

`#admin/procedures` already supports submission reviews, reports, revision comparisons, feedback templates and moderation history. Its overview mainly measures moderation. Role changes, company repairs and placement-data publication use scripts; there is no integrated user directory or operations dashboard. Extend these existing services rather than build a second management system.

## Eight focused enhancements

| # | Enhancement | Scope and useful outcome |
|---|---|---|
| 1 | **A proper admin home and navigation** | Make `#admin` the landing page with six destinations: Overview, Moderation, Users, Data, Analytics and Operations. Show urgent work, queue age, data freshness and actionable failures, each linking to its source. Keep existing moderation links working. Use consistent page headers, active navigation and mobile layouts; avoid a wall of dashboard cards. |
| 2 | **A faster moderation workflow** | Improve the existing queues with shareable filters, urgency sorting and direct links to individual cases. Keep content, relevant history and feedback together; provide a clear next-case action after saving. Preserve feedback during navigation and reject stale decisions when another admin has acted. Keep destructive decisions behind contextual confirmation rather than add more visible buttons. |
| 3 | **User and access management** | Add paginated search by name, email or UID, with account status, role, sign-in dates and contribution/report counts. Allow reasoned suspension, restoration and session revocation. Protect self-demotion and the last active admin. Start with the existing admin permission model; restrict role assignment to an explicitly authorised owner and enforce suspensions on the server, including existing sessions. |
| 4 | **A data-quality review centre** | Surface duplicate company identities, unknown references and invalid records. Preview canonical-name/alias merges and affected references before applying; preserve historical source records and uncertain matches for review. Reuse the existing company repair logic through validated server jobs, with backups and a recorded recovery path. Do not expose an unrestricted database editor. |
| 5 | **Controlled placement-data publishing** | Add a batch/year workspace showing source, validation results, published version and last update. Introduce a staged import flow: upload → validate → preview differences → publish. Wrap existing publication logic in resumable server jobs, preserving the last working version and supporting rollback. Keep unpublished imports private and require explicit confirmation before changing live statistics. |
| 6 | **Small, trustworthy analytics** | Offer 7/30/90-day trends for submissions, approvals, review turnaround, reports and company/year coverage. Clearly distinguish recruitment statistics from application usage. Reuse stored records first; only add active-user, readership or search metrics after defining and instrumenting their events. Show metric definitions, time ranges and freshness; use aggregates rather than expose private user activity. |
| 7 | **An actionable operations panel** | Show import/publication jobs, validation failures and instrumented API/notification errors with last success, affected scope and next action. Provide safe, idempotent retries for supported jobs and clear progress/error states. Treat unavailable telemetry as unknown, not healthy. Keep infrastructure secrets and raw production logs outside the UI. |
| 8 | **One searchable administrative audit trail** | Extend existing moderation events to cover access changes, repairs, publication and retries. Record actor, target, reason, time, outcome and a minimal before/after summary. Support filters and bounded exports. Make records append-only for application users; redact credentials and unnecessary personal content. Link every consequential action to its audit entry. |

## Delivery order and guardrails

1. **Foundation:** navigation, moderation improvements, server permissions, user controls and shared audit recording (#1–3, #8).
2. **Operations:** reviewed data repairs, staged publishing and job monitoring (#4, #5, #7).
3. **Insights:** aggregated analytics once the underlying measurements are reliable (#6).

All admin actions go through authenticated, validated server endpoints with pagination, bounded queries and concurrency checks. Use one primary action per screen, compact secondary menus, contextual help and consistent loading/empty/error states. Keep ordinary users' navigation separate from administration.

**Acceptance:** verify desktop/mobile and keyboard flows; deny direct non-admin requests; prove suspension enforcement and last-admin protection; test concurrent decisions, failed/retried jobs, publication rollback and audit completeness in emulators before enabling live writes.

**Scope:** these eight enhancements only. The approved scope covers local implementation and emulator validation. Production imports, account changes and deployment require a separate release action.
