# Landing, Google login and navigation

Implemented flow: **public landing → Google login → Home → placement year or community section**.

- `#landing`: public product introduction; Google sign-in is the only offered login method.
- `#login`: Google login. Opening a protected deep link while signed out displays this screen without changing that link; after authentication the original destination opens.
- `#home`: year choices and a separate Company Procedures entry.
- `#statistics`: dedicated year chooser. Existing `#overview`, `#2025/...` and `#2027/...` routes remain supported after login.
- `#procedures`: approved experiences, indexed filters and voting; empty until content is approved.
- `#procedures/contribute`: company search and Markdown editor, private draft autosave, attribution choice and submission for review. The catalog is seeded from source-backed campus recruiters across all batches; shared logos do not merge subsidiaries.
- `#procedures/<postId>`: approved experience detail and votes. `#procedures/contribute?draft=<id>` resumes an owner's draft.
- `#account`: account details, contributions, status and review feedback. `#contributions` redirects here; `#alumni` redirects to statistics while contacts remain upcoming.
- `#admin/procedures`: admin-only review queue, immutable revision preview, approval/change request/rejection and unpublishing. See [beta activation](company-procedures-setup.md) for role assignment and in-app notification setup.

## Access policy

The shared Auth provider checks the Firebase session before protected pages mount. Only verified Google sessions qualify. Firebase browser session persistence handles reloads; logout unmounts protected pages and clears their React state. The repository also checks the session before its first Firestore read. No persistent offline dataset cache is introduced.

The updated `firestore.rules` requires a verified Google sign-in token for active batch manifests, versions, chunks and community reads. Owners/admins can read private submissions; readers can query only published experiences. The trusted app API performs all community mutations; clients cannot directly publish, adjust votes or grant roles. Inactive placement versions and imports remain private. A client route guard alone is insufficient: publish the rules and deploy the app API using the current setup guide.

Read-only Firebase account audit on 8 October 2026 found **2 accounts, both with Google, 0 password-only accounts**. No users, roles, or provider settings were changed. Password UI has been removed. If a future account conflict occurs, link the Google credential to the existing account through an authenticated migration flow; do not delete the user or replace their UID. See [Firebase account linking](https://firebase.google.com/docs/auth/web/account-linking). Keep Email/Password provider changes separate from this release unless a fresh audit confirms no affected users.

## Activate on the deployed app

1. Push the tested frontend and let Vercel redeploy. The existing Firebase web environment variables stay the same.
2. Firebase Console → Authentication → Sign-in method: confirm **Google** is enabled. Under Settings → Authorized domains, confirm your actual Vercel hostname and development hostnames are listed.
3. Sign in with Google on the new deployment and confirm the three year choices work.
4. Publish the new access rules: Firebase Console → Firestore Database → Rules → replace the editor with this repository's `firestore.rules` → **Publish**. Alternatively run GitHub Actions → **Firebase cloud data and rules** → action **rules**. This updates rules without reimporting batches.
5. In a fresh incognito window, confirm the landing opens, `#2027/overview` asks for Google login, and after login it returns to that live year. Confirm sign-out prevents access again.

The frontend and rules have been changed in this checkout. This task does not publish the frontend or change the live project's rules. Until step 4, the live Firestore rules still permit the previous public data access policy.

## Test checklist

1. Visit `/` signed out: landing, available stats, upcoming community content and privacy note are visible; no batch documents are requested.
2. Continue with Google: choose your account; Home appears. Cancel the popup: useful feedback appears and retry stays available.
3. Open each year card: original search, filtering, detail pages, charts, candidates and timelines remain available. Class of 2027 retains LIVE and source freshness notices.
4. From a dashboard, use the App navigation to return to Home or Company Procedures. Browse contains no unapproved entries. Contribute lists campus recruiters and supports company search.
5. Reload a protected company page: the Google session persists. Test browser back/forward and year changes.
6. Account → Sign out: landing appears; protected links ask for login and protected content is removed.
7. Test phone and desktop widths with keyboard navigation.

Automated checks: `npm test`, `npm run build`, and `npm run test:firebase`. The last command uses isolated, seeded test emulators only; the actual application continues using cloud Firebase. Set `E2E_PORT=5174` if the normal development server already occupies 5173. `npm run auth:verify -- --project placement-stats-kjsce --allow-production` checks public routing and anonymous Firestore denial against the cloud project after the new rules are published; actual Google OAuth is checked with your own account manually.

Verified for this release: production build, **20 unit checks**, **9 Firestore access/import checks**, and **20 browser checks across desktop and mobile**. Reviewed landing, login, Home and Contribute screenshots. Public-page checks also ran against the real cloud configuration and confirmed zero placement reads before login.
