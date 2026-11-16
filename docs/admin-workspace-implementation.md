# Admin workspace: operation and configuration

The application now exposes `#admin` with Overview, Moderation, Users, Data, Analytics and Operations. Existing `#admin/procedures` links remain valid. Only active, verified Google sessions with a current `admin` claim can use the admin API.

## Access and owner configuration

- Set server-only `ADMIN_OWNER_UIDS` to a comma-separated list of existing administrator Firebase UIDs. Configure it in the API hosting environment and Firebase Functions environment when using both. Never use a `VITE_` prefix.
- An owner still needs the existing `admin` claim. This setting does not grant access or bootstrap the first administrator. Continue using the trusted `scripts/set-role.ts` owner process for initial setup.
- Without an owner configured, administrators can review content and manage ordinary accounts; in-app role assignment and changes to other administrators remain unavailable.
- Suspending an account preserves its content. Server endpoints check current Auth state and `accountAccess`; database rules deny suspended and revoked sessions. Restoration does not restore old sessions: the user signs in again.
- Deploy the updated API/functions and Firestore rules together after review. No deployment or live account/data changes are part of this implementation task.

## Maintenance flows

| Task | Flow |
|---|---|
| Review content | Moderation → filter queue → open case → feedback/decision → next case or audit. Queue links share filters; case links open a specific submission. Feedback drafts are scoped to the admin in session storage. |
| Make private or delete a published experience | Moderation → Published tab → open case → enter a moderation reason → Publication actions → **Make private (unpublish)** or **Delete permanently**. Making private keeps the record for admin review and removes it from readers. Deleting removes the post, revisions, votes, questions and reports, records `deleted_by_admin` and notifies the author. Both require the exact published revision. |
| Manage users | Users → exact email/UID lookup or paginated name search → account → reason → confirmation. Self-access changes and removal of the final active admin are blocked. |
| Check company data | Data → quality scan → run/resume → findings. Only aliases in `shared/company-identity.ts` have automatic repair; other findings need manual review. |
| Repair an alias | Preview affected counts → supply reason → queue → run. Backups precede each mutation. Raw placement imports and submitted revision snapshots stay intact. |
| Recover a repair | Completed repair → reason → Repair recovery. Unchanged current reference fields can be restored. Later edits stop recovery; canonical directory entries and alias redirects are retained. |
| Publish statistics | Choose batch → upload dataset JSON → validate/preview → run staging job → supply publication reason → confirm. A transaction checks the expected active version before replacing it. |
| Roll back | Published import job → reason → confirm. The previous version is verified first. A newer active publication blocks rollback. |
| Investigate failures | Operations → open job → inspect status/error → resume/retry a supported job. A running step has a 60-second lease; reload after expiration if a response was lost. Pausing stops further client-requested steps, not a step already in flight. |
| Inspect history | Operations → audit category/page search → record details. Links open individual records. JSON export contains only the displayed page. |

## Deliberate bounds

Pending experience reviews show **Approve**, **Request changes** and **Reject** directly in the decision bar. Approval does not require feedback or checklist completion. Requesting changes or rejecting requires feedback; rejection also asks for confirmation. Decisions still apply to the exact pending revision, record an audit event and notify the contributor. Rejection does not unpublish an earlier approved revision; use the separate publication action for that.

- User directory: 50 accounts per page. Email/UID lookup is exact; name matching scans one page at a time. The last-admin safeguard inspects up to 10,000 Auth accounts and fails closed if it cannot verify the inventory.
- Imports: the existing `shared/dataset.ts` placement format, up to 4.5 MB from the UI and 5,000 announcements. Each upload chunk is immutable; resume with the original file. Corrected source data starts a new import. Metadata and individual announcement sizes are validated.
- Jobs process bounded batches and persist progress. Closing the page leaves checkpoints available in Operations. Uploads, staging, backups, telemetry and audit collections are private; clients cannot write them directly.
- A repair preview shows current reference counts; jobs re-check and update matching current references. Recovery is guarded, not a blind database restore.
- Analytics: 7/30/90 UTC calendar days, capped at 5,000 records per source with a visible sampling notice. Coverage describes all currently published experiences. Review time uses recorded turnaround measurements. No active-user, readership or search tracking is invented or added.
- Operations reports admin jobs and sampled community API failures. Notification delivery and infrastructure health remain explicitly unmonitored. No secrets or raw server logs are returned.

## Verification

Automated checks cover server permissions, old-session denial, owner-only role changes, final-admin protection, immutable uploads, staged publication, rollback conflicts, repair backups/recovery, audit outcomes, aggregate analytics and desktop/mobile admin journeys. See `tests/firebase/admin-workspace.test.ts`, the additional rules tests and `tests/e2e/admin-workspace.spec.ts`.

Run `npm run test:admin` for emulator seeding, backend/rules tests and the focused desktop/mobile suite. It requires Java 21+ and Playwright Chromium. Run `npm test` for unit checks and `npm run build` for the production bundle.

Mutating job steps record their executor and expose an audit link. Admin unpublishing and permanent deletion require the exact approved revision being reviewed, so a stale screen cannot take a newer version offline or delete a newer publication.

Validation completed on 9 November 2026: production build and typecheck passed; 52 unit checks, 42 Firebase/backend checks and 20 desktop/mobile browser checks passed. Browser coverage includes keyboard focus return, dark mode, 320–1280px reflow, readable selected-row contrast and fully visible publication comparison columns. Screenshots were inspected during verification. No production deployment, import or account change was performed.
