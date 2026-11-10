# Firebase operations

Use the setup steps in the root readme and [access structure](access-structure.md).

- Keep Admin JSON outside Git, reference it through `GOOGLE_APPLICATION_CREDENTIALS`, and never place credentials in `VITE_*`.
- Live commands require explicit project and `--allow-production`. Demo-only emulator commands cannot target live projects.
- `db:rules` publishes reviewed rules, backs up previous rules in ignored artifacts, and verifies release activation.
- `db:seed` stages and reconciles immutable data; `db:verify` compares all records and metrics. Conflicting records or active versions fail without overwriting them.
- Rollback requires a trusted reviewed manifest change to a previously verified immutable snapshot; the seed command deliberately refuses conflicting manifests. Retain snapshots, original JSON, and rules backups.
- Data corrections require a reviewed new publication, not changes to browser calculations.
- Optional `auth:set-role` manages trusted claims; browser users cannot set their own roles. No community/admin UI is included yet.
- A protected manual GitHub workflow is prepared for later setup, with temporary runner credentials. It is not deployed/configured now.
- Monitor reads, errors, Auth failures, and costs after release. Initial loading uses manifest/version reads plus four chunks; navigation reuses loaded data.
- Configure static hosting and actual authorized login domains when deployment is requested. No cold-starting backend is needed for normal statistics reads.
