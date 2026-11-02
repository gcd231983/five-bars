# Five Bars — automatic, Claude-free deal monitoring

Five Bars compares US phone plans and advertised phone offers. The website is a static GitHub Pages site. A scheduled GitHub Actions workflow checks public sources and publishes **conservative** updates without Claude, AI subscriptions, paid APIs, or external servers.

## What the automator can and cannot do

Every day, it:

1. Fetches the existing 11 public sources from `site/data/deals.json` and checks each listed offer link (without bypassing site protections).
2. Automatically removes **explicitly expired** promotional plan prices and ended phone deals.
3. Collects possible Boost Mobile price candidates for **manual review only**. Scraped text can mix products or omit conditions, so it never changes catalog prices or verifies promotions.
4. Reports price candidates and blocked, failed, or unverifiable links rather than guessing.
5. Saves `site/data/status.json` with source-check results, alerts, and last scan date. The website distinguishes the **last full manual review** from the automatic link scan.
6. Keeps existing catalog data if a source is unavailable; a reachable link **does not** mean an offer's eligibility, price, or availability is verified.

**Important limitations:** This is *not* an autonomous universal offer-discovery crawler. Carrier sites change HTML frequently, some disallow automation, and many offers have complex eligibility/financing terms. Automatic catalog changes are limited to explicit expirations; all price changes and new offers need human verification. The site clearly discloses that limitation.

## Cost

For a public repo, this design typically runs with GitHub-hosted Actions and GitHub Pages at no charge under GitHub's current public-repository policies. There are **no Claude calls** and no model API credentials. Review GitHub's policies if your repository visibility changes.

## Setup

1. Keep this repo **public** if using free GitHub Pages and Actions.
2. Go to **Settings → Pages → Build and deployment** and select **GitHub Actions** (same as before).
3. In **Actions → Five Bars - no-AI deal checks and website → Run workflow**, launch one run after the changes are merged.
4. Look for the successful **update** and **deploy** jobs. The site is typically at `https://gcd231983.github.io/five-bars/`.
5. Open the **Sources & refresh** tab to see link-check results, the last full review date, and alert counts.

No Claude subscription token or Anthropic secret is used. You may delete `CLAUDE_CODE_OAUTH_TOKEN` from Actions secrets after verifying the new workflow if nothing else needs it.

## Manual verification and safe edits

- `site/data/deals.json`: verified catalog entries; follow the original schema described in `scripts/UPDATE_INSTRUCTIONS.md`.
- `site/data/status.json`: machine-generated scan status; **not** a factual price feed.
- `site/data/changes.json`: latest automatic changes, including explicit expirations.
- `scripts/auto-core.mjs`: deterministic rules, offer expiry, and phone-cost math used in tests.
- `scripts/auto-update.mjs`: source fetcher, safety checks, and data publisher.
- `.github/workflows/daily.yml`: daily schedule, tests, save, GitHub Pages deployment.
- `.github/workflows/tests.yml`: PR regression checks.

Run locally from the repo root with Node 22 or newer:

```sh
node --test tests/*.test.mjs
node scripts/deals.mjs check
node scripts/auto-update.mjs --dry-run
```

`--dry-run` still checks the public Internet, but writes no files. A regular `node scripts/auto-update.mjs` writes the three JSON files after its safety checks.

## Pricing disclaimers

Phone listings show separate **estimated due today**, **estimated minimum commitment**, and **estimated first-year cost**. These figures can omit taxes, activation fees, financed device charges, rebate processing delays, and discount clawbacks. When months are not explicitly prepaid, the estimate assumes the first month's service is paid at signup. **Always confirm at checkout.**

## Troubleshooting

- **Automated check failed:** Open the Actions run and inspect the failed step. Publication requires successful tests, data validation, and scanning. No catalog changes are published if every main source fails.
- **Some sources unavailable:** This is normal for sites with anti-bot protection. The deal is retained but flagged; no fabricated current prices are published.
- **No new offers:** Intentional. The script does not invent plan requirements or lock policies from a marketing headline.
- **Outdated full-review date:** Intentional. Automated link scans are not a substitute for verifying the complete offer catalog.

The previous Claude-based workflow has been replaced. The old `scripts/deals.mjs` remains solely as a structural validator and backwards-compatible maintenance utility; it is not used to run Claude.
