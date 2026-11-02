# Five Bars — official-source audit: November 2, 2026

**Scope: official publicly available plan pages, broadband consumer disclosures and carrier promotion notices. NOT a completed carrier checkout, personal eligibility test, carrier-approved partnership or signed full-terms review.**

## Current coverage and meanings

- **Total catalog**: 78 items — 38 plans, 40 device promotions.
- **12 initial plan baselines researched**: US Mobile (Starter, Premium, Light), Visible (Visible, Visible+, Visible+ Pro), Tello (Everyday, Starter, Power, Max), Mint Unlimited, Cricket Supreme Unlimited.
- **66 items lack this documented first-level research**: 26 other plans and all 40 phone promotions. Their catalog prices should still be treated as unconfirmed starting points.
- **Human checkout/full-terms sign-offs in `site/data/verifications.json`**: zero. Official source research and a rate match do not change this.
- **Research date**: 2026-11-02. The generator marks price-source observations aged after 21 days; the separately signed full-terms review expires after 14 days or a material data change.

Public record: https://gcd231983.github.io/five-bars/source-research.html
Underlying 12-item source file: `site/data/research-evidence.json`.
Machine-readable coverage report: `site/data/research-audit.json`.

## Confirmed public-rate baselines (not checkout)

| Carrier | Plan ID | Official standard-rate observation | Key evidence |
|---|---|---|---|
| US Mobile | `usm-starter` | $25/month | https://www.usmobile.com/broadband-facts ; port-in promotion and network terms: https://www.usmobile.com/plans |
| US Mobile | `usm-premium` | $44/month | https://www.usmobile.com/broadband-facts ; underlying-network hotspot differences: https://www.usmobile.com/help/docs/our-plans/core-plans/unlimited-data-plans |
| US Mobile | `usm-light` | $10/month | https://www.usmobile.com/broadband-facts (Light 2GB broadband label) |
| Visible | `visible` | $25/month | https://www.visible.com/buy/plans (broadband label) |
| Visible | `visible-plus` | $35/month | https://www.visible.com/buy/plans (broadband label) |
| Visible | `visible-pro` | $45/month | https://www.visible.com/buy/plans (broadband label) |
| Tello | `tello` | $15/month regular; qualified first three months $10 | https://tello.com/buy/custom_plans ; offer end and eligibility: https://blog.tello.com/news/halloween-deal-10gb-for-10-mo-first-3-months/ |
| Tello | `tello-starter` | $10/month | https://tello.com/buy/custom_plans |
| Tello | `tello-power` | $20/month | https://tello.com/buy/custom_plans |
| Tello | `tello-max` | $25/month | https://tello.com/buy/custom_plans |
| Mint Mobile | `mint` | $30/month equivalent on 12-month regular renewal **requires $360 paid upfront** | https://www.mintmobile.com/phone-plans/3-month-plans/ and https://www.mintmobile.com/phone-plans/12-month-plans/ ; separate eligible initial $180 annual offer: https://www.mintmobile.com/help/what-is-mint-mobiles-switch-to-mint-and-get-3-6-or-12-months-of-premium-wireless-for-15-mo-any-plan-promotion/ |
| Cricket | `cricket-supreme` | $60/month before AutoPay | https://www.cricketwireless.com/support/plans-and-features/plans ; official label including $25 in-store fee: https://qrcricket.cricketwireless.com/en_US/unl50.html |

## Concrete correctness improvements made with this audit

1. Mint: record explicit 12-month billing with $360 cash required upfront and an informative separate reference to eligible introductory annual terms. Remove unsourced flat family-rate claims. Never present the monthly equivalent as a bill paid every month.
2. Plan calculators: when an annual prepaid listing lacks an explicitly documented multiple-line upfront quote, do NOT calculate a false multi-line monthly checkout estimate.
3. US Mobile: clarify that Premium hotspot allowance and Starter high-speed data behavior depend on underlying network. Streaming quality defaults can be lower than advertised upgraded limits.
4. Visible: clarify 5/10/15Mbps hotspot tiers and device/network-specific video resolution, while keeping regular price separate from optional promotional codes.
5. Tello: preserve the documented three-month $10 offer through November 9, 2026 for eligible *new lines*, with an ending/plan-change restriction.
6. Cricket: explicitly show $60 before AutoPay, potential $5 monthly reduction from month two, and the $25 in-store fee. Family table prices may rely on later AutoPay and should not be represented as verified first-month due.

## Remaining facts before each offer can be called fully reviewed

Even if the official plan label supports a rate, we must still verify **actual checkout** for the intended consumer: line/new-customer eligibility, port-in requirements and discount codes, exact initial cash, recurring renewal, taxes, activation, device financing or rebates, prepaid refund rules, device lock/unlock, signal/coverage and IMEI/eSIM compatibility. Some information is account-specific or not available to an unattended web agent.

Use the read-only https://gcd231983.github.io/five-bars/review-workbench.html to open current source links, inspect remaining questions and prepare a human review checklist. An authorized reviewer may sign through the protected GitHub Actions workflow **only after personally checking the exact carrier terms**. No output in this audit itself changes `verifications.json`.

## Responsible next batch

Prioritize device offers with unusual terms (free phone with minimum service, rebates or financing) as the next set of source-only research, then complete the remaining 26 service plans. Add screenshots/dated checkout terms when permitted, and record price conflicts rather than substituting guesses.

## Implementation

- `scripts/build-source-research.mjs` creates a public HTML report and machine-readable 78-offer inventory from the curated research ledger and current catalog. It does **not** crawl, update prices or impersonate human review.
- `scripts/source-research.mjs` checks dated evidence vs recorded monthly and annual upfront fields, marks old evidence and conflicts, and escapes untrusted text/URLs for HTML publication.
- The no-AI daily workflow refreshes publication pages and sitemap, but never changes the original human research date.
- See `tests/source-research.test.mjs` and browser smoke checks for regression verification.
