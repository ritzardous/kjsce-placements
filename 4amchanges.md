# Make the hosted site work on Vercel

## Company Procedures enhancement release

**For the existing working site:** keep your current Firebase/Vercel variables and admin account. You do not need a new private key or billing upgrade for these enhancements. Steps 1–6 below are the original setup reference for a fresh deployment.

**Completed for this release:** the new rules and indexes are deployed, all indexes are READY, and the enhancement read queries passed against the real database. Your next action is to refresh the production site after its new Vercel deployment and follow the reader/contributor/admin checks in items 3–5. Item 1 is a reference if setup needs to be repeated later.

1. Deploy the new rules and indexes from this repository, in its VS Code terminal:

   ```powershell
   node node_modules/tsx/dist/cli.mjs scripts/deploy-rules.ts --project placement-stats-kjsce --allow-production --cli-auth
   npx firebase deploy --project placement-stats-kjsce --only firestore:indexes --non-interactive
   npm run procedures:verify -- --project placement-stats-kjsce --allow-production --cli-auth
   ```

   If these have already been deployed for this release, only run the verification command. Wait until it reports all indexes **READY**. If login expired, run `npx firebase login --reauth` using the project owner account, then repeat the failed command.
2. Push this release to the connected production Git branch. Vercel must build with **`npm run build`**, which compiles the server code included by `api/procedures.mjs`. Wait for the production deployment to become **Ready**, then refresh the live site.
3. Test as a reader: search by title/role, select a round, open a company hub, save a post, compare two posts, submit a question and report a post. A submitted question stays pending until approved.
4. Test as a contributor: create a draft with title/summary/rounds, open Markdown preview, save it, reopen it, then submit. Check **My Contributions → Submission timeline** and **Notifications**. “Share another company experience” starts a fresh body with editable remembered preferences.
5. Test as **`runasjha1@gmail.com`**: open **Admin review**, filter the queue, open a revision and approve/request changes. For later revisions, open **Compare with the approved version**. Open **Reports and discussions**, approve the question/reply or resolve a report with a reason. Use **Refresh review queue/inbox** to load new items. Confirm the contributor receives the in-app notification.

**Notifications are in-app only:** admins see new submissions in the Admin review badge and pending inbox, and questions/replies/reports in Reports and discussions. Contributors and readers receive updates under Company Procedures → Notifications. Use the refresh controls to check for updates. No email provider, sender domain or notification API key is needed.

If you previously added `PROCEDURE_RESEND_API_KEY`, `PROCEDURE_ADMIN_EMAILS`, `PROCEDURE_EMAIL_FROM` or `PROCEDURE_APP_URL` in Vercel, you may delete them; this release ignores them and sends no emails even if they remain. Keep `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`. The admin Google account remains **runasjha1@gmail.com**; removing notification email settings does not remove admin access.

---

Follow **Steps 1–6 in order**. Use your existing Vercel project and Firebase project **`placement-stats-kjsce`**. Keep Firebase on Spark; no billing upgrade is needed.

**Already completed:** live Firestore rules, ready indexes, 175 campus companies, and admin access for **`runasjha1@gmail.com`**. You do not need to repeat Firebase imports or role assignment.

## 1. Download a fresh Firebase server key

1. Open [Firebase → Service accounts](https://console.firebase.google.com/project/placement-stats-kjsce/settings/serviceaccounts/adminsdk).
2. Confirm the selected project is **placement-stats-kjsce**.
3. Click **Generate new private key**, then confirm **Generate key**.
4. Save the downloaded `.json` file outside this GitHub repository, for example in Downloads.
5. Open that file in VS Code or Notepad. You will copy its complete contents in Step 2.

Use a fresh key instead of the old key that Firebase rejected. Keep the downloaded file private; do not commit it to GitHub or paste it into chat. [Firebase key setup instructions](https://firebase.google.com/docs/admin/setup).

## 2. Add two server variables in Vercel

Open **Vercel Dashboard → your existing project → Settings → Environment Variables**.

Add each row below. Select **Production** as the environment. These instructions deploy the production site; you can configure Preview separately later.

| Variable name | Exact value to enter |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `placement-stats-kjsce` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The **entire contents** of the JSON file downloaded in Step 1 |

For `FIREBASE_SERVICE_ACCOUNT_JSON`:

1. In the downloaded file, press **Ctrl+A**, then **Ctrl+C**.
2. Paste into Vercel's **Value** field. Include the opening `{` and closing `}`.
3. Do not paste the filename or path. Do not add quotation marks around the whole JSON. Preserve the existing `\n` sequences inside its `private_key` value.
4. Mark this variable **Sensitive** if the option is shown, then save.

The names must be exactly as listed. Neither server variable should start with `VITE_`. The hosted server reads them; visitors must not receive the private key. [Vercel environment variable instructions](https://vercel.com/docs/environment-variables/managing-environment-variables).

**Checkpoint:** both names appear in Vercel's Production environment variables.

## 3. Check the frontend variables and build settings

Stay in **Vercel → Settings → Environment Variables**. Keep or add these **Production** variables:

| Variable name | Value |
| --- | --- |
| `VITE_FIREBASE_PROJECT_ID` | `placement-stats-kjsce` |
| `VITE_FIREBASE_API_KEY` | Copy the same value from this repository's local `.env` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Copy the same value from the local `.env` |
| `VITE_FIREBASE_APP_ID` | Copy the same value from the local `.env` |
| `VITE_USE_FIREBASE_EMULATORS` | `false` |

If `VITE_FIREBASE_STORAGE_BUCKET` and `VITE_FIREBASE_MESSAGING_SENDER_ID` are already configured, keep their matching local `.env` values. Remove `VITE_LOCAL_BETA` if it exists. Do not copy the local `GOOGLE_APPLICATION_CREDENTIALS` path into Vercel.

Then open the project's **Build and Deployment** settings and confirm:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root, not `src` or `functions` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` (or the default npm install setting) |

The repository's `vercel.json` already keeps `/api/procedures` as a server endpoint. Do not replace its routing configuration with a rule that sends every request to `index.html`.

## 4. Allow your hosted domain to use Google sign-in

1. In Vercel, find the **production site's domain**. Example: `your-site.vercel.app`.
2. Open [Firebase Authentication settings](https://console.firebase.google.com/project/placement-stats-kjsce/authentication/settings).
3. Find **Authorized domains** and click **Add domain**.
4. Enter only the hostname, such as `your-site.vercel.app`. Do not include `https://`, a path, or a trailing slash.
5. If you use a custom domain too, add that hostname as well. Keep existing domains.

**Checkpoint:** every production hostname you will use appears in Authorized domains.

## 5. Push the updated code and deploy it

Environment variables alone are not enough: Vercel must receive the updated code, including **`api/procedures.mjs`**, **`vercel.json`**, **`package.json`**, **`package-lock.json`**, **all of `functions/src`** (including `http.ts`, `community.ts`, `service.ts`), **`shared`**, and the frontend changes.

Using **VS Code**:

1. Open this repository and click **Source Control** in the left sidebar.
2. Review the changed files and stage the app changes with **+**. Confirm that no private key or `.env` file is included.
3. Enter **Enable hosted Company Procedures API** as the message and click **Commit**.
4. Click **Sync Changes** or use **… → Push** to send the commit to GitHub. This checkout is currently on `main`; confirm that Vercel's production branch points to the branch receiving these changes.
5. Open **Vercel → your project → Deployments**. Wait for the deployment for that new commit to finish and show **Ready** in **Production**.

If the updated code was already pushed but you added variables afterward, select that latest production deployment → **… → Redeploy**. Redeploying an older commit will keep the older app code. Environment changes require a new deployment to take effect. [Vercel redeployment instructions](https://vercel.com/docs/project-configuration/project-settings).

**Checkpoint:** the latest app commit is deployed to Production after the variables were saved.

## 6. Test the hosted site

Use your actual hosted URL, not localhost.

1. Open `https://YOUR_SITE_HOST/api/procedures` in a browser. You should see JSON with **`POST required.`** and HTTP **405**. This is expected for opening it directly: it confirms the API route exists. It does not yet prove the private key works.
2. Open the site's home page and sign in with a real Google account.
3. Company Procedures → Contribute: choose a company, write an experience and click **Save now**. Confirm **Saved**, then reload and confirm the draft is still present. This checks the server credential and live Firestore writes.
4. Click **Submit for review**. Confirm **Pending approval**.
5. Sign out. Sign in with **`runasjha1@gmail.com`**. If that account was already signed in, sign out and back in first to refresh its admin role.
6. Open **Review queue**, select the submission and click **Approve**.
7. Sign in with a different reader account, find the approved experience and upvote/downvote it. The author cannot vote on their own post.

**Done:** Google login, draft save/reload, submission, admin approval and reader voting all work on the hosted URL.

## If a step fails

| What you see | What to check |
| --- | --- |
| `/api/procedures` shows the website's HTML or returns 404 | Step 5 deployed old/missing code, the wrong root directory was selected, or routing replaced the API with `index.html`. |
| Google reports an unauthorized domain | Add the exact hostname you are visiting in Step 4. |
| Company list is empty or statistics fail only on the hosted site | Step 3 must use the same Firebase web values as local `.env`, with emulator mode `false`. |
| Draft save reports service unavailable / HTTP 503 | Check the two server variables in Step 2. Re-paste the complete JSON if needed, then redeploy. In Vercel, inspect this deployment's Function/Runtime Logs for `/api/procedures`. |
| Logs report insufficient Firestore or Authentication permissions | In Google Cloud IAM for `placement-stats-kjsce`, find the principal matching the key's `client_email`. Grant **Cloud Datastore User** (`roles/datastore.user`) and **Firebase Authentication Viewer** (`roles/firebaseauth.viewer`) if those permissions are missing. Do not change the client Firestore rules to allow writes. |
| Review queue does not appear | Sign out and back in with exactly `runasjha1@gmail.com`; a different Google account is not the chosen admin. |
| Vercel build fails | Open that deployment's Build Logs, check the first error and confirm the latest code and lockfile were pushed. |
