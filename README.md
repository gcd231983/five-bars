# Five Bars — automatic, Claude-free deal monitoring

Five Bars compares US phone plans and advertised phone offers. The website is a static GitHub Pages site. A scheduled GitHub Actions workflow checks public sources and publishes **conservative** updates without Claude, AI subscriptions, paid APIs, or external servers.

## Latest review controls (Five Bars 4.1)

As of November 2, 2026, the catalog contains **78 offers**; **65 have dated partial official source research** and **13 lack that first-level coverage**. No offer has a current human-recorded checkout scenario (**0 of 78**). Those figures are not real-time checkout verifications.

**New manual sign-off gate:** a carrier URL and typed attestation alone are insufficient. Authorized reviewers must record a specific anonymized quote, the observed initial payment and renewal billing amount including mandatory fees, customer eligibility, service commitments, inventory, and ten checked material terms. The stored record is tied to a GitHub reviewer and exact catalog signature. See [Checkout verification protocol](CHECKOUT_VERIFICATION.md). A reviewed scenario never guarantees another customer's checkout price.

## What the automator can and cannot do

Every day, it:

1. Checks the maintained public-source list in `site/data/deals.json` and each listed offer link (without bypassing site protections). New carrier source URLs are included automatically.
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

- `site/data/deals.json`: curated listings with date-scoped sources; a listing is **not** fully verified until it has its own human review record. Follow the original schema described in `scripts/UPDATE_INSTRUCTIONS.md`.
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

## Five Bars value upgrade — finder, comparison and trust

The site has six sections: **Find my plan**, Plans, Phone deals, Compare, Price watch, and Sources & refresh.
The new guided finder asks only about network, number of lines, service budget, number-transfer eligibility, data priority, and hotspot needs. It filters locally without a backend or AI calls, using published catalog figures with clearly identified estimates.

- The finder separates service plans from phone/device promotions. Phone offers are per-device quotes; a family bundle is **not** assumed.
- Up to three plans or three phone deals can be compared side by side (not mixed together); the comparison selection is stored only in the browser's local storage.
- The existing plan list now excludes promotional rates for multiple lines unless `promo.familyEligible=true` or an explicit `promo.family[LINES]` rate is recorded. Unknown household prices are shown as estimates and ranked after known household rates.
- The phone list distinguishes estimated upfront payment, minimum commitments, first-year cost and potential rebates. Phone deals are no longer mislabeled as exclusively free offers.
- A carrier link returning HTTP 200 **does not** validate the price. Each listing shows a conservative verification indicator; all records start unverified.
- The Finder links to the official FCC coverage map and reminds visitors to check indoor coverage and carrier IMEI/eSIM compatibility.

### How to record a human verification

**The daily scanner cannot create or refresh verification records.** When you have personally checked an offer's device price, plan cost, signup requirements, number porting, financed installment terms, rebate timing, potential clawbacks and official source:

1. Update the terms in `site/data/deals.json` first, using only the details you confirmed.
2. Complete a real carrier checkout/written quote and use the read-only reviewer workbench to generate anonymous structured evidence. Follow [CHECKOUT_VERIFICATION.md](CHECKOUT_VERIFICATION.md) to submit the manual GitHub Actions workflow.
3. Review and commit both `site/data/deals.json` and `site/data/verifications.json`.
4. The badge will say **Manually checked** for 14 days, provided the material offer fields and evidence still match. Changes to terms automatically invalidate the badge; older reviews become stale.
5. Run `node scripts/review-offer.mjs audit` to check evidence consistency. Use `node scripts/review-offer.mjs invalidate OFFER_ID` to revoke a mistaken review.

The records contain a signature of material offer terms and a public evidence URL; they do not collect the consumer's location, credentials or phone number. This is an evidence workflow, not a guarantee of final checkout pricing. Taxes, fees and carrier requirements still must be confirmed at purchase.

### Tests and browser acceptance

```sh
node --test tests/*.test.mjs
node scripts/deals.mjs check
node scripts/review-offer.mjs audit
node --check site/value-core.mjs
node --check site/value-ui.mjs
```

A separate pull-request workflow runs `tests/browser-smoke.mjs` on Chromium at phone and desktop viewports and uploads screenshots as a CI artifact. It installs Playwright only in CI, not for ordinary website visitors. The published site remains static, client-side and AI-independent.

**Remaining work:** independently verify and refresh the current offer catalog. The automatic scanner currently checks public page availability and expiration dates; it does not discover or certify every new price. Avoid marketing the listings as fully verified or exhaustive.

## Price Watch: official headline checks and observed history

The `Price watch` tab adds **strict, source-scoped, partial price checks** independent of Claude. Its Boost subsection tracks **three selected phone offers**: Moto G 2026, Galaxy A17 5G, and Moto G Play 2026. Separate MVNO subsections monitor some service-plan rates.

Every successful daily source scan:
1. Downloads Boost Mobile's public offers page using the existing safe HTTP fetcher.
2. Requires an exact product-model headline, device price, required monthly plan price, and number-transfer wording **within a short, anchored promotion block**, with a known action boundary. Cross-product text is never used to infer prices.
3. Rejects duplicate/conflicting prices for the same model and reports `ambiguous`, `not_found`, `source_unavailable`, or `headline_mismatch` rather than inventing a result.
4. Labels **only** unchanged catalog headline fields as `headline_matched`, explicitly marked **partial**. Full carrier offer terms (rebates, tax, financing, device locking, cancellation, eligibility, checkout charges) are *not* automatically verified.
5. Records a bounded **90-observation-day history** of strict official device-price and required-plan headlines (not inferred checkout prices). Dates with no trustworthy extraction are absent, not silently interpolated.
6. Never alters `site/data/deals.json` from parsed price candidates. **If the observed headline conflicts with the catalog, the phone-list price and cost estimates are suppressed and that offer is excluded from finder recommendations and comparisons pending review.**
7. Preserves the last human-reviewed date separately from the last automatic price scan. Evidence older than 48 hours is identified as stale.

**Files and responsibility:**
- `scripts/price-evidence.mjs`: strict price-and-plan headline extractor, bounded history and independent audit report.
- `site/data/price-evidence.json`: latest report (generated by the daily workflow).
- `site/data/price-history.json`: prior strict observations, maximum 90 observations per supported model.
- `site/data/verifications.json`: **manual full-terms** reviews only; the automated scanner never writes to this ledger.
- `scripts/auto-update.mjs`: coordinates public fetches and reports without any paid model service.
- `tests/price-evidence.test.mjs`: proves matching, mismatch flagging, conflicts, source outages, safe-history bounds, and no catalog mutations.

A carrier changing its page template may cause the strict parser to find zero headlines. That is deliberate: it should **fail closed and flag review**, not silently assume promotional prices remain valid. A successful HTTP response alone is still not price evidence.

### Resolving a mismatch

When a mismatch is reported, inspect the exact official carrier offer page and the terms of service, financing, eligibility and unlock rules. Correct `site/data/deals.json` **only after human review**; record a scenario-specific human checkout review only through the protected GitHub workflow with detailed evidence per CHECKOUT_VERIFICATION.md. The next daily scan will compare the corrected catalog against the newly advertised headline.

### Automated test commands

```sh
node --test tests/*.test.mjs
node --check scripts/price-evidence.mjs
node scripts/deals.mjs check
node scripts/review-offer.mjs audit
node scripts/auto-update.mjs --dry-run
```

The final command makes network requests but never writes to the repository. Google Chrome mobile/desktop UI tests run on the PR workflow. No AI token, credit card or paid API integration is required.

## MVNO expansion — 2 November 2026

Five Bars now lists **38 wireless plans from 18 providers** across the major underlying network choices, plus the existing 40 device promotions. The expansion includes new tiers from Tello, **H2O Wireless**, **Helium Mobile**, MobileX, Red Pocket, and Good2Go Mobile. We could not substantiate a US carrier named "Hydro Mobile"; H2O and Helium are distinct real providers.

- The main **Plans** tab now has a carrier/provider dropdown, separate from the AT&T/Verizon/T-Mobile network filter. The guided plan finder also supports a preferred provider. For multi-network MVNOs, selecting the provider does **not** guarantee all underlying networks or plans are available at the same price; confirm the network and compatible handset before purchase.
- New entries are sourced from official current carrier pricing pages and include `priceSourceDate` (date the quoted rate was referenced). They are **not** automatically marked `full_terms` verified; the manual-review ledger is unchanged.
- The five yearly prepaid entries include `billingMonths:12`, `billingUpfront`, and `maxLines:1`. Their `price` is the effective monthly equivalent. The site **must** show `billingUpfront` as the amount due before service begins. For example, Good2Go 1GB is $5/mo effective, but requires **$60 upfront** for 12 months. H2O 10GB annual is $16/mo effective, but requires **$192 upfront**.
- The 12-month service-cost model, guided recommendations and side-by-side comparisons use exact yearly upfront totals when supplied. Annual plans are unavailable in the results for unsupported multi-line group sizes.
- Other listed plans remain monthly billing unless otherwise explicitly described. Taxes, cost-recovery fees, eligibility, compatibility and auto-pay discounts are not guaranteed by the comparison.

New official carrier source links are part of `site/data/deals.json`. The no-AI daily scanner checks their availability. Separately, narrow partial-price extractors monitor three selected Boost devices and selected MVNO plans when their official pages are accessible. Neither source reachability nor matching headline prices constitutes an independent full-terms review.

Run `node --test tests/*.test.mjs` for pricing/provider/annual-billing checks, then review screenshots from the Chromium mobile and desktop PR workflow.

## Automatic MVNO rate evidence — rollout November 2, 2026

This upgrade extends the existing no-AI **Price watch** system beyond Boost device offers to **seven established service-plan checks**, plus **two H2O monthly checks that activate only when its public homepage can be fetched**:

| Provider | Scoped plans | Evidence scope |
|---|---|---|
| Helium Mobile | Air 10GB, Infinity Unlimited | Exact advertised monthly plan-rate heading |
| MobileX | Basic Unlimited 10GB, Basic Unlimited 30GB | Exact advertised allowance and monthly price in the plan FAQ |
| Good2Go Mobile | Annual 1GB, 3GB, 5GB | Exact **annual upfront payment**, matching data allowance, and 12-month equivalent |
| H2O Wireless | Featured monthly 10GB and unlimited (30GB high-speed) | Exact homepage monthly rate bound to corresponding data allowance; checkout/annual plans not validated |

**Important:** These are *partial headline checks*, not checkout or full plan verification. Tax, fees, auto-pay requirements, throttling, new-customer terms, renewals, financing, coverage and phone compatibility are **not** independently verified by the parser. These exact official source locations are allowlisted. Blocked or changed pages fail closed; they never trigger price guesses or automatic catalog edits.

- Every successful daily scan stores `site/data/mvno-evidence.json` and `site/data/mvno-history.json` (up to **90 observation days** per supported plan).
- Matching headlines display a clearly labeled **partial official-rate match** badge. Missing/unavailable official pages display review-needed messaging, not a success badge.
- If the official price or annual amount **differs**, the site keeps the plan visible but **hides its advertised costs**, disables its comparison button, and removes it from finder recommendations.
- A mismatch remains **unresolved** even if the next scan is blocked or the plan wording disappears. Only a fresh exact official headline match lifts the hold.
- Automatic scans will **not modify `site/data/deals.json`** based on observed pricing. A human must review a new rate and its full plan terms.
- **Tello and Red Pocket** remain in the catalog without automatic live rate validation because their pricing pages return HTTP 403. H2O's **monthly plan directory** also returns 403; the alternate official **homepage** has been accessible in a separate ordinary browser request, but may still block the scheduled scanner. H2O **annual plans** have no automated price proof. The monitor never bypasses access controls or equates access with price confirmation.
- Historical entries represent observed official **headline rates**, not guaranteed checkout prices or actual consumer transactions.

Technical implementation: `scripts/mvno-evidence.mjs` implements strict extraction, allowlisted source provenance, conflicting-variant detection, mismatch persistence, and history limits. The no-AI update coordinator writes the files; the static site reads them; Node regression tests and Chromium mobile/desktop smoke checks cover the critical behavior.

To inspect current evidence, open Five Bars → **Price watch**. To diagnose a run, open GitHub Actions → **Five Bars - no-AI deal checks and website**. Do not rely on ordinary HTTP 200 page availability as evidence of a specific price.

## 2.4 — Review queue and official-source resilience

The daily scanner also writes **`site/data/review-queue.json`**. Under **Price watch → Price & terms review queue**, visitors can inspect current maintenance priorities and filter them by urgency.

- **Critical:** A documented official price discrepancy, an unresolved conflict, or a catalog promotion past its explicit end date.
- **High:** A promotion approaching its recorded deadline (within seven days).
- **Medium:** A monitored rate not found, an inaccessible carrier offer page, or a price reference older than 21 days.
- **Routine:** A listed offer has no current *documented human full-terms review*. This is a transparency disclosure, **not an accusation** that the carrier's price is incorrect.

Queue entries include the original carrier, the reason, a public carrier link, and a prefilled GitHub correction link. Flags are derived from **existing evidence and dates**; no AI, tracking of visitors, login, or automatic claim of review is involved. Reviewing an offer's source URL or seeing a matching headline does **not** create a manual full-terms review record. Only an explicitly initiated, attributed human workflow with structured quote details and direct carrier inspection can record that step.

### Official pages with access restrictions

An access diagnostic checked the regular, public plan pages for Tello, H2O and Red Pocket. The plan pages returned HTTP 403 in GitHub Actions and are **not scraped or bypassed**. A Red Pocket official 2026 editorial plan guide is readable at `https://blog.redpocket.com/blog/2026-prepaid-cell-phone-plan-guide-costs-features-and-savings`, but it is **not a current checkout quote** and must not be used to certify live rates. Tello's blog homepage is similarly background-only.

The public H2O homepage `https://www.h2owireless.com/` advertises a standard 10GB monthly rate and a 30GB-high-speed unlimited monthly rate. The parser requires the *price, monthly billing wording and corresponding 10GB/30GB slowdown statement* in one short sequence. If its official homepage is blocked during a scheduled scan, the report says `source_unavailable`; **no match badge or invented observation is published**. The plan URLs remain available for users to open directly. AutoPay discounts and H2O annual packages are not inferred.

The new files and tests are `scripts/review-queue.mjs`, `tests/review-queue.test.mjs`, `tests/mvno-evidence.test.mjs`, and the updated mobile/desktop browser acceptance suite. The publication workflow commits the review queue only after running the regression tests and full source scan.

## 2.5 — Low-noise GitHub alerts for actionable price events

The daily no-AI monitor now records **`site/data/alerts.json`**, a durable event feed of only **three scoped alert categories**:

- **Catalog promotion deadlines** within seven days, including the published end date and an explicit warning that the carrier has not independently reconfirmed that deadline.
- **Disputed or conflicting official price headlines**, including conflicts that remain unresolved because a carrier page later becomes unavailable.
- **Newly changed official headline observations** when two distinct dated observations show a device price, required plan price, monthly rate, or annual upfront amount changed. The new observation must also be an exact match to current catalog headline fields; source outages, HTTP 200 alone, and vague marketing language never trigger these alerts.

**Source failures, ordinary inaccessible pages and the 78 routine unreviewed listings do not generate automatic notifications.** They remain visible in the separate maintenance queue. These alerts are *not* full checkout, tax, renewal, coverage or eligibility verification. Nothing updates catalog prices without human review.

### How notifications work

Each active event is turned into one GitHub Issue under <https://github.com/gcd231983/five-bars/issues>, assigned to the repository owner. Issue creation uses the existing GitHub Actions runner's **ephemeral `GITHUB_TOKEN`** with `issues: write`. No Claude credits, paid API, email credentials, phone number, third-party alert service or extra subscription is required. Actual email/push delivery depends on the user's own GitHub notification settings.

The bot stores a **stable hidden event key** in each issue and checks **both open and closed issues** before posting. Repeated daily runs do not create a new issue for the same alert. Closing an issue manually will not cause the bot to reopen it. A *different future catalog deadline* or a new, separately dated price change can legitimately create a new issue.

The website also shows **Actionable price & deadline alerts** at the top of Price Watch, including source links, prioritized review actions and a link to GitHub Issues. Historical events remain in the JSON feed without being presented as new active alerts.

For safety, notification failures do not stop GitHub Pages deployment: review the `Open deduplicated GitHub Issues` step in the daily workflow for failures. When authentication or GitHub Issue settings prevent an alert from being posted, its durable event remains accessible on Price Watch. An operator can rerun the workflow after fixing the permission issue.

### Code and tests

- `scripts/alert-engine.mjs`: pure deterministic alert feed, stable keys, 80-event bounded history, no source-network activity.
- `scripts/issue-alerts.mjs`: validates and deduplicates issue notifications, avoids pinging arbitrary usernames or posting injected carrier markdown.
- `scripts/notify-issues.mjs`: GitHub Actions entrypoint. Does not touch catalog values or close existing issues.
- `site/data/alerts.json`: public actionable feed refreshed by safe daily scan.
- `tests/alert-engine.test.mjs`, `tests/issue-alerts.test.mjs`, and expanded browser smoke checks: deadline changes, source outages, price conflicts, manual closure, duplicate prevention, XSS/markdown safety and mobile layout.

Run `node --test tests/*.test.mjs` for fast checks. Chrome browser acceptance tests run on each pull request. The unchanged daily scan at 10:17 UTC also runs on push to `main` and can be started manually from GitHub Actions.

## Five Bars 2.6 — Privacy-first personal watchlist

Visitors can now use **My watchlist** to track up to **30 saved phone offers, service plans, and entire providers**, including optional price targets. Any plan or phone offer in the catalog has a **Watch** button. The guided finder also offers **Watch plan** and **Watch phone** controls.

### Price semantics (important)

- **Plan target:** Standard catalog *per-line monthly rate*, or **monthly equivalent** for prepaid annual plans. It is NOT the lowest promotional rate, a family bundle, or necessarily the amount billed today. Annual upfront totals are shown separately.
- **Phone target:** Advertised handset sticker price, **excluding** required wireless service, taxes, financing, rebates, and other checkout charges.
- **Provider target:** Standard listed *service-plan* monthly-equivalent rate at that carrier only. Phones from that carrier can still produce official site alerts, but are **not** compared to a monthly service-price threshold.
- **No target:** Keep an offer or provider saved and see related site price-change/conflict/promotion-deadline alerts without requiring a number.
- Price conflicts detected by the official evidence engine **never** qualify for a threshold match. Ended phone promotions are excluded. Target matches are **paused** if the last source scan is over 48 hours old or unavailable.
- A threshold match means that the **published catalog estimate** meets your budget. It does **not** certify live stock, eligibility, checkout cost, taxes, port-in availability, renewal, network coverage or full offer terms. Users should open the carrier's actual offer page before purchasing.

### Notifications and privacy

The watchlist works **only in the visitor's own browser** using `localStorage` under the key `fivebars-watchlist-v1`. Five Bars collects **no account, email, phone number, address, user identity, or saved preferences on its server**. When a visitor opens or refreshes the website, the watchlist compares their saved choices with the latest published catalog and official partial-headline alert feed. "New or unreviewed" matches can be marked reviewed; duplicate events are recognized by stable local keys. Watching a provider and an individual plan does not duplicate the same underlying alert.

**It does not run in the background, send personalized email/SMS/push notifications, or sync across browsers and phones.** The GitHub Issues notifications built in 2.5 are **repository-owner operational notifications**, not personal visitor alerts.

Use **Export JSON** to see and optionally copy a local backup, and **Import JSON** to restore it in another browser. Import replaces the existing local watchlist and validates known offer IDs, provider names, list sizes, pricing bounds, and event keys. Clearing site data or private-browsing mode can erase a watchlist; users should export a copy first.

### Implementation and checks

- `site/watchlist-core.mjs`: dependency-free state normalization, 30-watch limit, rate target matching, dispute/expiry/staleness safeguards, alert de-duplication and reviewed state.
- `site/watchlist-ui.mjs`: responsive saved-offer cards, provider selection, price target editing, current matches, unread reviewed actions and export/import; it uses `textContent` for untrusted source text.
- `tests/watchlist.test.mjs`: no account, malformed pricing, nested watchers, annual prepay, source outages, conflict hold, expired offers, backup/restore and duplicate prevention.
- `tests/browser-smoke.mjs`: mobile/desktop acceptance checks for adding, saving, importing, exporting, acknowledging and restoring after page reload.

The existing no-AI GitHub Actions price monitor continues unchanged. The watchlist needs no new server, dependency, API key or subscription.

## Five Bars 2.7 — Switch & Save and commercial foundation (November 2026)

The new **Switch & Save** tab compares what a visitor currently pays for wireless service against a plan or advertised phone offer over 12, 24, and 36 months, using an intentionally conservative cash-flow model. It asks for the current total wireless bill, existing device payoff, one-time switching expenses, optional extra monthly fees, lines, porting eligibility, and a selected offer. The calculator runs locally without server storage or paid APIs.

- **Service-plan scenario:** recorded family rates where known, monthly introductory discounts only when eligible, normal recurring costs afterward, and full annual prepayments at month 1 and at each assumed 12-month renewal.
- **Device promotion scenario:** exactly one advertised handset, any required prepaid service and required carrier plan, with device price and fees paid upfront in the illustrative model. It does not combine a restricted phone discount with an unrelated cheap plan.
- **What is not counted:** guessed trade-in value, conditional bill credits, rebates, financing arrangements or undocumented tax incentives. Some offers cannot be calculated reliably; the tool refuses to provide a total in those cases.
- **Risk guards:** blocked or contradictory official pricing evidence stops an estimate. Full-terms review and unknown fees are clearly disclosed; an officially reached URL is never treated as proof of price or eligibility.
- **Customer output:** cash needed initially, line-item breakdown, projected totals and differences for 12/24/36 months, break-even within selected horizon, copyable report, print/PDF option and a shareable offer/period/lines URL with personal financial inputs omitted by default.

The comparison is an **illustration, not a guaranteed price or commitment**. Long-term totals assume that regular service rates, renewal terms and the user's original monthly bill remain stable. This assumption can be especially inaccurate if the original bill includes device installments that end during the comparison.

Four factual static pages support trust and future commercial readiness: the editorial review process, privacy, commercial disclosures and safe switching guide. Search discovery includes a small sitemap and robots file. No partner payments or commissions have been claimed, no affiliate URLs were inserted, and no third-party analytics or subscriber collection was added.

**Business launch:** See BUSINESS_READINESS.md for remaining hard gates: dated complete carrier term reviews, at least 10 real checkout comparisons, accessibility/phone testing, appropriate business and legal registrations, an independent contact channel, signed partner agreements and near-link compensation disclosures. Do not describe these as completed until they have actually been done.

Regression tests: tests/switch-core.test.mjs and tests/business-foundation.test.mjs. Real Chromium mobile and desktop acceptance tests additionally exercise the switching planner, phone prepay requirements, URL privacy and business pages. Existing no-AI monitoring remains unchanged.

## Five Bars 2.8 — manually signed offer verification

The automated price checker cannot independently certify all carrier checkout conditions. The new owner-only GitHub Actions workflow makes it easier to record real human reviews without opening a JSON editor.

To use: open the Five Bars GitHub repository, select Actions, choose Five Bars - human offer terms sign-off, then Run workflow on main.

- Verification: select operation verify, enter the exact ID from site/data/deals.json, an official carrier HTTPS source URL, the anonymized structured JSON in `review_details`, and the exact attestation I_HAVE_PERSONALLY_CHECKED_ALL_OFFER_TERMS. Use this ONLY after personally checking the rate, taxes, fees, eligibility, prepayment, number transfer, rebates, financing and unlock terms.
- Invalidation: select operation invalidate, enter the offer ID and the exact attestation I_CONFIRM_THIS_REVIEW_MUST_BE_INVALIDATED. No evidence URL is needed.
- The workflow checks inputs and official carrier domain, runs tests, commits the signed review ledger and records the GitHub initiator in the commit history. That commit triggers normal site publication.
- Full-terms verification becomes stale after 14 days and is invalidated by material price/term changes including annual upfront billing.
- A reachable page or matching promotional headline NEVER establishes full-terms verification. The workflow does not browse a carrier page or perform the human review for you. Do not enter private customer information in GitHub Actions.

See BUSINESS_READINESS.md for remaining business launch and advertising conditions.

## Five Bars 2.9 — Four evidence-labelled carrier comparisons and a review workbench

The website now links to a static, search-friendly carrier-comparison hub: https://gcd231983.github.io/five-bars/carrier-comparisons.html. Its four deliberately curated editorial guides are:

- US Mobile vs Visible: catalog regular pricing, underlying network choices and data/eligibility questions.
- Tello vs Mint Mobile: monthly and introductory rates versus possible multi-month prepaid commitments.
- Cricket vs H2O Wireless: AT&T-network choices, annual upfront billing and restricted handset promotions.
- Visible vs Total Wireless: Verizon-network options and line/plan requirements.

These are useful comparison starting points, NOT independently verified checkout quotes, best-deal awards, affiliate endorsements, or claims of exhaustive carrier analysis. Pages display catalog reference date, most recent source-scan date, official carrier links, full-term review status and partial evidence scope. A known official price conflict withholds the relevant catalog amount rather than silently publishing disputed savings.

The generator at scripts/build-comparisons.mjs and editorial text source scripts/comparison-pages.mjs create complete static HTML pages with canonical URLs, descriptive metadata and a curated sitemap. The GitHub daily source scan re-generates them on each run. Price baselines omit promotional eligibility discounts and show full annual prepayment amounts. Only a deliberately edited guide configuration can add a new pair, which avoids mass-producing thin SEO pages.

### Public read-only editor review workbench

Reviewers may open https://gcd231983.github.io/five-bars/review-workbench.html from the Sources tab. The workbench is noindex and excluded from the sitemap. It loads the current ranked review queue, 78-offer catalog, and signed review ledger; supports priority, carrier, kind and verification-state filters; and links the official offer and the protected GitHub sign-off workflow.

Each item includes a full-terms worksheet covering rate, promotion, tax, prepayment, financing, carrier network/phone compatibility, high-speed/hotspot/roaming and unlock requirements. A checked box or copied structured JSON is never a verification record. Copying a worksheet stores nothing on the server; official human attestation remains controlled by the existing GitHub Actions workflow and the human's actual inspection.

### Running and testing

- Run node scripts/build-comparisons.mjs to refresh editorial pages and the sitemap after catalog or verification updates.
- Run node --test tests/*.test.mjs to exercise output safety, actual regular vs annual catalog pricing, conflict holds, review signature validity and sitemap inclusion.
- GitHub PR browser checks automatically generate pages first and test mobile/desktop widths, no-JavaScript static HTML tables, official source links and editor filters.
- GitHub Pages deployment still runs on main, without paid AI, a backend, visitor account, affiliate links or tracking pixels.

Commercial readiness still depends on actual dated human full-terms reviews and documented partner agreements (see BUSINESS_READINESS.md). These pages should be used for beta testing and legitimate educational search discovery, not claims of verified promotions.

## Five Bars 3.0 — Dated official-source research and catalog corrections (2026-11-02)

A targeted public-source audit now records **twelve** plan rate baselines from official carrier pages and broadband labels, with real source URLs, observed standard rates, confirmed public facts and unresolved checkout questions. The 78-offer catalog has **66 offers without this first-level research** and **zero** documented independent human full-terms sign-offs. Nothing has been falsely marked verified.

**Public evidence report:** https://gcd231983.github.io/five-bars/source-research.html
**Research source ledger:** `site/data/research-evidence.json`
**Generated coverage inventory:** `site/data/research-audit.json`
**Detailed editorial report:** `OFFICIAL_SOURCE_AUDIT.md`

**Important correctness fixes:** Mint Unlimited's $30 monthly equivalent requires **$360 prepaid annually** at the regular 12-month renewal price; an eligible new-customer $180 introductory annual offer is separate and is NOT assumed. Unverified multi-line annual plans no longer appear as if they were ordinary monthly family payments. US Mobile network-dependent hotspot and streaming caveats, Visible network-specific video/hotspot tiers, Tello's dated promotion restrictions and Cricket's in-store activation/AutoPay details are now described more accurately.

The static evidence report and edited carrier comparison pages refresh with existing no-AI GitHub Actions, but the November 2 observation date remains fixed until new carrier research is actually conducted. The report marks research **aged after 21 days** and flags catalog rates or annual prepayments that diverge from the dated official record. These public source matches are NOT final checkout validation. The editor workbench now shows each researched offer's official sources and outstanding customer-specific questions.

Next: complete real checkout and human full-terms reviews before calling any offer fully verified, and expand the published-source audit beyond the first 12 plans. Do not apply affiliate tracking or claim paid-partner relationships until agreements and disclosures are approved.

## Five Bars 3.9 — human checkout evidence, not a URL-only badge

The read-only [reviewer workbench](https://gcd231983.github.io/five-bars/review-workbench.html) now helps authorized editors record all ten checkout questions, initial and renewal payments including mandatory taxes/fees, eligibility scenario, service period, inventory and optional postpaid finance terms. The copied JSON is reviewed by the manual GitHub Actions workflow, with the initiating GitHub user attributed in `verifications.json`. Incomplete, mismatched, held/out-of-stock and invalid data fail closed. A previously accepted checkout remains **scenario-specific**, expires after 14 days or a material catalog change, and does not make unverifiable postpaid costs safe to advertise.

See [CHECKOUT_VERIFICATION.md](CHECKOUT_VERIFICATION.md) for exact steps. Live evidence count remains **0/78** until a person actually completes the workflow with real checkout information; automated scans never fabricate that evidence.


## Five Bars 4.0 — reader correction intake (no paid AI)

Every published plan and phone card now links to a [mobile-friendly correction assistant](https://gcd231983.github.io/five-bars/report.html), with the stable offer ID preselected. The source-audit page, research queue, price-monitoring panels, comparison guides and website footer also link to the correction process.

The assistant validates the selected catalog offer, issue type, observation date, public HTTPS source and a brief explanation. It warns about possible private information, generates a **local-only draft**, and provides a separate link to GitHub's public structured issue form. No draft text or private report data is placed into a GitHub URL, browser storage, Five Bars database or automatic network submission. Users must explicitly choose to copy, log into GitHub and submit. Basic pattern checks are not a guarantee of complete redaction.

**Reader reports are unverified** and do not automatically adjust carrier pricing, evidence ratings, inventory or saved human checkout signatures. The owner's [corrections workflow](CORRECTIONS_POLICY.md) covers independent official-source verification and regression tests before approving a change. A GitHub account is currently required; a private no-login support channel remains a future, owner-managed business gate. Five Bars still has **53/78 dated partial source records**, **25** needing research and **0/78** independently signed human checkout scenarios at this milestone. No affiliate contracts or monetization are claimed.


## Five Bars 4.1 — required service payments and twelve more source records

Twelve additional handset promotions now have dated official-source references: two Metro, two Cricket, four Total Wireless, two Straight Talk, one Tracfone and one Boost. Current coverage is **65/78 partial source records**, **13 not yet researched**, **six inventory holds**, and **0 human checkout reviews**. Earlier milestone counts below are historical.

- Boost device calculations preserve the advertised service rate for headline matching but use the published rate without AutoPay by default. Confirming AutoPay eligibility changes the phone list, finder, comparison and Switch & Save estimates consistently. All seven Boost phone listings record the condition.
- Fixed prepaid service totals are separate from later recurring rates. The Tracfone example records the published $135 initial 90-day block and a $50 later monthly modeling assumption; the selected bundle and actual renewal schedule still require checkout confirmation.
- The free Total A36 listing requires a number transfer. Two Cricket Motorola listings are held after their official pages presented restock notices; this does not certify future stock.
- Source mismatches stop savings estimates. Material edits to payment conditions invalidate any prior human review signature.

Validation: 176 automated regression tests, catalog validation and mobile/desktop Chromium acceptance checks are required before merge. No automatic source scan can create a human checkout sign-off.
