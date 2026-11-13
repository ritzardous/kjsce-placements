# API reference

[Documentation index](README.md) · [Authentication](authentication.md) · [Database](database.md)

## Transports and authentication

The production application has one HTTP endpoint: **`POST /api/procedures`**, implemented by [the Vercel adapter](../api/procedures.mjs) and [HTTP dispatcher](../functions/src/http.ts). Statistics are read directly through the Firestore SDK; there are no REST statistics endpoints. This is an internal application API without a separately versioned compatibility guarantee.

Send a current Firebase ID token, not an OAuth access token or service-account credential:

```http
POST /api/procedures
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{"name":"procedureCommunity","data":{"action":"bookmarkState","payload":{"postId":"example-post"}}}
```

Example success: `{"data":{"saved":false}}`. Example failure: `{"error":{"code":"unauthenticated","message":"Sign in with Google."}}`. The example post ID is illustrative, not a seeded record. Responses use JSON and `Cache-Control: no-store`.

The envelope allows only `name` and `data`. Bodies over 100,000 bytes are rejected; malformed JSON and unknown names are invalid arguments. Authentication occurs before body dispatch. The server verifies revoked tokens, current Auth status and account policy. Verified Google identity is required for every dispatched operation. Administrative calls also validate current administrator access.

In emulator mode, `callProcedure` uses `httpsCallable` with the same operation names and data through Functions on port 5001 in `asia-south1`. Firebase callable transport supplies its own protocol/errors; do not send the HTTP multiplexing envelope directly to a callable. Both client paths have a 20-second service timeout.

## Core operations

IDs below are 1–100 ASCII letters, digits or hyphens. Versions/revisions are nonnegative integers. Objects use strict Zod validation.

| `name` | `data` | Result inside `data` | Access |
| --- | --- | --- | --- |
| `saveProcedureDraft` | `{id, expectedVersion, draft}` | `{version}` | Owner; new IDs start at version 0 |
| `submitProcedure` | `{id, expectedVersion}` | `{revision}` | Owner |
| `reviewProcedure` | `{id, revision, decision, feedback}` | `{status}` | Admin |
| `unpublishProcedure` | `{id, expectedRevision, reason}` | `{unpublished, auditId?}` | Admin |
| `setProcedureVote` | `{id, value}` where value is `-1`, `0`, `1` | `{value}` | Reader other than author |
| `procedureCommunity` | `{action, payload}` | Action-specific below | Google user; some admin-only |
| `adminWorkspace` | `{action, payload}` | Action-specific below | Admin |

Review decisions are `approved`, `changes_requested`, `rejected`; feedback is trimmed, at most 2,000 characters and required for non-approval. Unpublishing needs a 1–2,000-character reason and exact current revision. Repeating a submission already pending, the same completed review, or an unchanged vote has explicit retry handling; do not assume every operation is idempotent.

### Draft format

```json
{
  "title": "Technical interview experience",
  "summary": "The stages I personally attended.",
  "rounds": ["Coding", "Technical interview"],
  "companyKey": "existing-directory-key",
  "appearanceYear": 2026,
  "graduationYear": 2026,
  "coverage": "Partial",
  "campus": "On campus",
  "outcome": "Result pending",
  "role": "Graduate engineer",
  "attribution": "anonymous",
  "customName": "",
  "body": "## Experience\n\nDescribe the actual questions, format and preparation in your own words."
}
```

Replace the illustrative company key with a real `procedureCompanies` key. Title ≤120, summary ≤320, role ≤100, custom name ≤60 and body ≤20,000 characters. Up to seven distinct rounds: Aptitude, Coding, Technical interview, HR, Group discussion, Assignment, Other. Coverage is Full/Partial/Not specified; outcomes are Selected/Not selected/Result pending/Not specified; attribution is anonymous/name/custom. Appearance year is nullable; when supplied it is 2000 through the server's current year +1; graduation year is nullable, otherwise 2000–2100. Hidden control characters are rejected. Drafts may have no company; submission requires an existing company, ≥60 meaningful body characters excluding headings/comments, and a nonempty custom name when selected. Exact defaults and refinements live in [the shared schema](../shared/procedures.ts).

`campus` is optional and accepts `On campus` or `Off campus`; old drafts and published experiences without this field remain valid and display no inferred route. The field follows the saved draft into immutable submitted revisions and approved posts.

## Community actions

Pass these as `procedureCommunity` data. Unless noted, `payload` is a strict object. The [dispatcher](../functions/src/community.ts) is the authority for response fields and fine-grained validation.

| Action | Payload and behavior |
| --- | --- |
| `createCompany` | `{name}` (2–100 plain-text characters); verified Google user; returns `{key,name,years}`. Reuses a normalized existing identity, rate-limits new creations, and creates community entries with `years:[]`. It does not confirm campus recruiting or publish an experience. |
| `syncAccount` | `{}`; syncs Google identity/profile information using current account data |
| `companyBrowse` | Browse filters below; returns `{rows,cursor:null,more:false}`; each company group includes `count`, `publishedAt` and `score` |
| `browse` | Browse filters; published experience page with canonical identity and saved state |
| `bookmark` | `{postId, saved: boolean}` → `{saved}`; saving requires a published post |
| `bookmarkState` | `{postId}` → `{saved}` |
| `saved` | `{cursor?, status?}`; bookmark page with `available` and `updated` flags |
| `contributions` | `{cursor?, status?}`; owner's nondeleted submissions |
| `impact` | `{}` → total/drafts/pending/published/helpful/unanswered aggregates; unanswered is retained legacy data |
| `preferences` | `{}` → saved contribution metadata or `{}` |
| `timeline` | `{submissionId}` → up to 50 moderation events; owner/admin only |
| `manageSubmission` | `{id, expectedVersion, action: "withdraw" | "hide" | "delete"}` → `{deleted}` |
| `report` | `{postId, questionId?, target, reason, details}` → `{received:true}`; targets post/question/answer; reasons outdated/incorrect/privacy/abuse/duplicate; details ≤1,000 characters |
| `questions` | `{postId, cursor?}`; legacy paged discussion read with pending-answer redaction |
| `ask`, `answer` | Disabled: always `failed-precondition` before retained creation code |
| `queue` | Admin: `{tab, search?, company?, year?, status?, oldest?, cursor?}`; tab pending/reviewed/published |
| `reviewContext` | Admin: `{id, revision}`; exact revision context |
| `moderationInbox` | Admin: `{kind: "reports" | "questions", reason?, cursor?}` |
| `moderateQuestion` | Admin: `{id, target: "question" | "answer", decision: "visible" | "hidden", reason, updatedAt}` |
| `resolveReport` | Admin: `{id, action: "dismiss" | "request_correction" | "hide", reason, updatedAt}` |
| `overview` | Admin: moderation summary; see dispatcher for query behavior |

Browse filters are optional strings `company`, `year`, `coverage`, `outcome`, `search`, `round`, plus `sort: "newest" | "helpful"` and `cursor`. A community cursor is `{id, values: number[]}` with at most two ordering values; return it unchanged with the same filters. `status` in contribution/saved page input accepts empty, attention, published, draft, pending, approved, changes_requested or rejected. Experience browsing targets 12 matches; generic pages target 20. Filtering scans at most four batches of 50 documents, so an empty page can still have `more:true`. Continue by cursor rather than assuming exhaustive search results.

### Notification actions

These also use `procedureCommunity`; all operate on the caller's private inbox. See [notification implementation](../functions/src/notification-api.ts) and [settings schema](../shared/notifications.ts).

| Action | Payload → result/behavior |
| --- | --- |
| `notifications` | `{cursor?, unread?, view?}` → paged normalized rows; view all/unread/attention/contributions/discussions/reports/following/statistics/archived |
| `notificationSummary` | `{}` → `{unread, checkedAt, discoveryError}`; attempts optional follow discovery |
| `readNotification` | `{id}` → `{read:true}` |
| `readNotifications` | `{ids}` with 1–50 IDs → `{read:true}` |
| `updateNotifications` | `{ids, read?, archived?}`; at least one state change; archiving marks read |
| `readAllNotifications` | `{cutoff, cursor?}` → `{count, more, cursor, cutoff}`; cutoff cannot be future; steps of up to 50 |
| `notificationSettings` | `{}` → current settings |
| `saveNotificationSettings` | `{version, discovery, following}` → new settings; exact version required |
| `notificationOutcome` | `{id}` → private outcome; report ownership checked |
| `cleanupNotifications` | `{}` → `{removed, more}`; bounded retention cleanup |

Notification cursors use `{id, values:[createdAt]}`. Following accepts up to 20 unique `{kind,key,label,muted?,since?}` items; kind is company/experience/batch. Server validates new targets and owns follow start times; batch keys are only `2025` and `2026`. Restore archived items before marking unread. Preference version conflicts return `aborted` (409).

## Admin workspace actions

The [admin dispatcher](../functions/src/admin.ts) calls the sources linked below. IDs allow 1–128 letters/digits/underscore/hyphen; reasons require 8–500 trimmed characters. These administrative APIs are coupled to the workspace, not a general background-processing service.

| Action | Payload | Key result |
| --- | --- | --- |
| `overview` | `{}` | Dashboard counts, batches and jobs |
| `users` | `{search?, cursor?}` | `{rows,cursor,scanned}`; exact email/UID or per-page name match |
| `user` | `{uid}` | Safe account details and access version |
| `changeUser` | `{uid,operation,role?,reason,expectedVersion,requestId}` | `{auditId}`; operation suspend/restore/revoke/role; role user/admin |
| `repairPreview` | `{company}` | Alias-repair impact |
| `createJob` | `{type,requestId,reason,year?,sourceName?,chunkCount?,company?,repairId?}` | `{id,auditId?}`; type quality/import/repair/recover |
| `uploadChunk` | `{id,index,text}` | `{saved:true}`; index 0–99, ≤50,000 UTF-8 bytes |
| `validateImport` | `{id}` | Job ID, validated preview/audit when newly validated |
| `runJob` | `{id}` | Checkpoint/result with done/state/progress as applicable |
| `job` | `{id,cursor?}` | Job view, issues and next cursor |
| `publish`, `rollback` | `{id,reason}` | `{auditId}`; expected active version checked |
| `operations` | `{cursor?:{time,id}}` | Jobs page and sampled failures |
| `audit` | `{admin?,moderation?,record?,kind?}` | Merged audit records; kind all/users/data/moderation |
| `analytics` | `{days:7|30|90}` | Bounded UTC-period aggregates |

Import jobs require year, source name and chunk count (1–100). Repair requires a reviewed alias; recovery requires a completed repair ID. `runJob` must be called repeatedly until done; a 60-second lease rejects concurrent steps. Publication and rollback are separate, reasoned actions. Owner-only role management, self-change blocks and final-admin protection apply. Exact responses and auxiliary cursor contracts: [users](../functions/src/admin-users.ts), [jobs](../functions/src/admin-jobs.ts), [metrics](../functions/src/admin-metrics.ts), [quality](../functions/src/admin-quality.ts). Operational limits are in [admin workspace](admin-workspace-implementation.md).

## Errors and retry policy

| HTTP status | Code | Typical cause / response |
| --- | --- | --- |
| 400 | `invalid-argument` | Invalid JSON, strict schema or unknown action; correct the request |
| 401 | `unauthenticated` | Missing/expired/revoked token or non-Google identity; sign in again |
| 403 | `permission-denied` | Ownership, role or account-policy failure |
| 404 | `not-found` | Explicitly missing resource; some missing-resource guards instead use 409 |
| 405 | `invalid-argument` | Non-POST method; `Allow: POST` |
| 409 | `failed-precondition`, `aborted` | Stale draft/revision/preferences, job lease, unavailable content; reload state |
| 429 | `resource-exhausted` | Per-user/action throttle; wait before retry |
| 503 | `unavailable` | Configuration, module loading or unknown server failure |
| 500 | Other unmapped known code | Inspect private server diagnostics; avoid blind mutation retries |

Draft saves throttle at 300ms, submit at 30s and vote at 500ms per user/action. Community report/discussion throttling uses 3s where invoked. These are transaction-backed application limits, not edge-wide abuse prevention. On a lost response, reload state before retrying; preserve expected versions and request IDs for operations that support them.
