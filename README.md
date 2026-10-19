# Five Bars

A phone-plan and free-phone deal tracker that updates itself every morning, with no API billing.
It runs on GitHub Actions and GitHub Pages (both free) and uses your existing Claude subscription
through Claude Code. Needs Claude Pro or Max.

Every day at about 6:15 a.m. Eastern:

1. `scripts/deals.mjs prep` backs up the current list and downloads the deal pages (PrepaidCompare, Clark.com, BestPhonePlans).
2. Claude Code reads those pages, runs a few web searches to confirm carrier promos, and edits `site/data/deals.json`
   following `scripts/UPDATE_INSTRUCTIONS.md`. It checks its own work with `node scripts/deals.mjs check`.
3. `scripts/deals.mjs finish` validates the result. If anything looks wrong (bad prices, too many deals vanishing),
   it restores yesterday’s list and the run fails. GitHub emails you when that happens.
4. The site republishes. New deals get a “New” tag.

## One-time setup (about 20 minutes, on a computer)

1. **Get a Claude Code token.** Install Claude Code (search “Claude Code install” on claude.com and use the
   Windows installer). Open a terminal and run:
   ```
   claude setup-token
   ```
   Sign in with your Claude account when the browser opens. Copy the token it prints (starts with `sk-ant-oat01-`).
2. **Create a repo.** On github.com, click **New repository**, name it `five-bars`, choose **Public**, and create it.
   (Free GitHub Pages needs a public repo.)
3. **Upload the files.** On the new repo’s page, choose **uploading an existing file** and drag in everything from
   this folder, including the `.github` folder. Commit.
   If your file browser hides `.github`, turn on hidden items (Windows: View > Show > Hidden items).
4. **Add the token.** **Settings > Secrets and variables > Actions > New repository secret.**
   Name: `CLAUDE_CODE_OAUTH_TOKEN`. Value: the token from step 1.
5. **Turn on Pages.** **Settings > Pages > Build and deployment > Source: GitHub Actions.**
6. **Run it once.** **Actions** tab > **Daily deal update** > **Run workflow**.
   Your site is at `https://YOUR-USERNAME.github.io/five-bars/`.

From then on it runs by itself daily. Each run uses a bit of your Claude plan’s usage, like one
research chat. If you ever see an auth error, run `claude setup-token` again and replace the secret.

## Handy changes

- **Different time:** edit the `cron` line in `.github/workflows/daily.yml` (UTC; `17 10 * * *` = 10:17 UTC).
- **More sources:** add pages to `FEEDS` at the top of `scripts/deals.mjs`.
- **How Claude decides what to keep:** edit `scripts/UPDATE_INSTRUCTIONS.md`.
- **Update on demand:** Actions > Daily deal update > Run workflow.

## Going public later

- Add a custom domain under **Settings > Pages**.
- If you add affiliate links, put a short disclosure near the top of the page and in the footer.
- Keep the “confirm on the carrier’s site” note. Promos change weekly.

## Files

- `site/index.html`: the site (loads `data/deals.json` when it opens)
- `site/data/deals.json`: the deal list
- `site/data/changes.json`: what changed in the latest run
- `scripts/deals.mjs`: download pages, validate, stamp the date (no API calls)
- `scripts/UPDATE_INSTRUCTIONS.md`: what Claude does each morning
- `.github/workflows/daily.yml`: the schedule and deploy
