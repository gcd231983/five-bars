# Five Bars — automatic, Claude-free deal monitoring

Five Bars compares US phone plans and advertised phone offers. The website is a static GitHub Pages site. A scheduled GitHub Actions workflow checks public sources and publishes **conservative** updates without Claude, AI subscriptions, paid APIs, or external servers.

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
2. Run `node scripts/review-offer.mjs verify OFFER_ID https://official-carrier-offer-page --full-terms-reviewed`.
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

The `Price watch` tab adds **strict, source-scoped, partial price validation** independent of Claude. It currently supports **three Boost Mobile phone offers** only: Moto G 2026, Galaxy A17 5G, and Moto G Play 2026.

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

When a mismatch is reported, inspect the exact official carrier offer page and the terms of service, financing, eligibility and unlock rules. Correct `site/data/deals.json` **only after human review**; optionally record full-terms verification using `node scripts/review-offer.mjs verify OFFER_ID https://official-carrier-page --full-terms-reviewed`. The next daily scan will compare the corrected catalog against the newly advertised headline.

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

New official carrier source links are part of `site/data/deals.json`. The no-AI daily scanner checks availability of those links, but this is not an automatic full-price revalidation for the newly added MVNOs. Automatic **partial price evidence** remains limited to the three explicitly supported Boost Mobile devices; expanding that safely is a separate workstream.

Run `node --test tests/*.test.mjs` for pricing/provider/annual-billing checks, then review screenshots from the Chromium mobile and desktop PR workflow.

## Automatic MVNO rate evidence — rollout November 2, 2026

This upgrade extends the existing no-AI **Price watch** system beyond Boost device offers to **seven specific service plans** on public official carrier pages:

| Provider | Scoped plans | Evidence scope |
|---|---|---|
| Helium Mobile | Air 10GB, Infinity Unlimited | Exact advertised monthly plan-rate heading |
| MobileX | Basic Unlimited 10GB, Basic Unlimited 30GB | Exact advertised allowance and monthly price in the plan FAQ |
| Good2Go Mobile | Annual 1GB, 3GB, 5GB | Exact **annual upfront payment**, matching data allowance, and 12-month equivalent |

**Important:** These are *partial headline checks*, not checkout or full plan verification. Tax, fees, auto-pay requirements, throttling, new-customer terms, renewals, financing, coverage and phone compatibility are **not** independently verified by the parser. The three sources are allowlisted. Blocked or changed pages fail closed; they never trigger price guesses or automatic catalog edits.

- Every successful daily scan stores `site/data/mvno-evidence.json` and `site/data/mvno-history.json` (up to **90 observation days** per supported plan).
- Matching headlines display a clearly labeled **partial official-rate match** badge. Missing/unavailable official pages display review-needed messaging, not a success badge.
- If the official price or annual amount **differs**, the site keeps the plan visible but **hides its advertised costs**, disables its comparison button, and removes it from finder recommendations.
- A mismatch remains **unresolved** even if the next scan is blocked or the plan wording disappears. Only a fresh exact official headline match lifts the hold.
- Automatic scans will **not modify `site/data/deals.json`** based on observed pricing. A human must review a new rate and its full plan terms.
- **Tello, H2O Wireless and Red Pocket** remain in the main comparison catalog but are **not yet automatically rate-validated**: their official pricing pages have returned HTTP 403 to the scheduled scanner. This implementation will not bypass access controls.
- Historical entries represent observed official **headline rates**, not guaranteed checkout prices or actual consumer transactions.

Technical implementation: `scripts/mvno-evidence.mjs` implements strict extraction, allowlisted source provenance, conflicting-variant detection, mismatch persistence, and history limits. The no-AI update coordinator writes the files; the static site reads them; Node regression tests and Chromium mobile/desktop smoke checks cover the critical behavior.

To inspect current evidence, open Five Bars → **Price watch**. To diagnose a run, open GitHub Actions → **Five Bars - no-AI deal checks and website**. Do not rely on ordinary HTTP 200 page availability as evidence of a specific price.
