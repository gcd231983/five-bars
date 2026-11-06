# Five Bars improvement roadmap (November 2026)

## Release rules
- One focused pull request per phase; require regression and browser smoke checks to pass before merging.
- Never equate a carrier headline scan with checkout verification.
- Keep upfront prepaid months distinct from required future service months.
- Preserve original offer URLs, source attribution, and eligibility/financing disclosures.
- Do not activate affiliate links without approved program credentials and accurate disclosures.

## Phase 1 — Mobile browsing (merged in PR #78)
- Show five ranked phone offers initially, with an accessible expand/collapse button.
- Add canonical carrier icons to phone cards and preserve a fallback.
- Preserve ranking, price warnings, and the existing plan-card expansion.
- Acceptance: all matching offers remain accessible; automated browser and regression suites pass.

## Phase 2 — Price reliability (in progress: stale catalog and source scan warnings)
- Audit data ingestion and last-successful-check timestamps for all plan and phone feeds.
- Distinguish source headline checks, human-reviewed checkout evidence, and stale/unverified deals.
- Surface expired/changed promotions without presenting unverified checkout prices.
- Add regression tests for prepaid vs. commitment, annual billing, port-in eligibility, and conditional credits.
- Acceptance: no stale source is represented as freshly verified; scheduled jobs report failures clearly.

## Phase 3 — Affiliate and SEO readiness
- Inventory carrier partnership programs and approved vs. pending status; no invented approvals.
- Add clear affiliate disclosures adjacent to monetized links when approvals exist.
- Implement privacy-conscious, optional outbound-click measurement with no sensitive user data.
- Review canonical tags, sitemap, structured data, accessible labels, and mobile performance.
- Acceptance: no unapproved affiliate redirect or misleading endorsement; test outbound links and SEO generation.

## Phase 4 — Ongoing operations
- Monitor scheduled refreshes, dead links, and promotion deadlines.
- Maintain an owner review queue for checkout-only terms and partner account approvals.
- Publish a final acceptance report listing only verified completed items and remaining owner-dependent steps.

## Phase 2 implementation note
The catalog's `checked` field is a human-curated reference date, not the timestamp of the automated scan. The website now warns when the catalog date is older than seven days, and separately warns when the automated scan is older than 48 hours or unavailable. These warnings do not silently update the reference date, validate checkout pricing, or suppress access to offers. Follow-up work must audit the actual scheduled workflows and source verification jobs.

## Phase 2 workflow audit (2026-11-06)
- `.github/workflows/daily.yml` schedules the job daily at 10:17 UTC, also on pushes and successful human-review workflows.
- The update job validates data, runs deterministic source monitoring, expires documented promotions, regenerates research and comparisons, then commits a validated snapshot.
- The browser job tests that snapshot and deploy requires both update and browser jobs to succeed.
- Automatic source reachability and headline observations do not certify current checkout prices. The homepage now distinguishes stale scans and partial source reachability from successful source checks.
- `site/data/status.json` observed 18 public sources checked and 10 reachable at its 2026-11-06 09:49 UTC timestamp. Follow up on unreachable sources rather than marking them verified.
- `site/data/deals.json` retains a 2026-10-29 human catalog review date; the daily job must not silently imply a new manual review.
- `site/data/alerts.json` includes the Tello November 9 deadline; this is a catalog/source alert, not independent checkout confirmation.
- Daily execution and production deployment success must be checked in Actions; the presence of a cron configuration alone does not prove a successful daily run.

## Phase 3 kickoff: affiliate controls
- The finder now discloses current lack of reported paid placements and links to the existing disclosures page.
- Do not change offer URLs, inject referral parameters, claim approvals, or mark links sponsored until actual agreements and accurate per-link disclosures exist.
- Owner-dependent: obtain program approvals, partner identifiers, tracking terms, and confirm privacy/disclosure obligations before monetized links are activated.
