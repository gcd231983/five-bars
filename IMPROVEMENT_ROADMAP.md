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
