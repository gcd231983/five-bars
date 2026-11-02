# Five Bars — official-source audit: November 2, 2026

**Scope: official publicly available plan pages, broadband consumer disclosures and carrier promotion notices. NOT a completed carrier checkout, personal eligibility test, carrier-approved partnership or signed full-terms review.**

## Current coverage and meanings

- **Total catalog**: 78 items — 38 plans, 40 device promotions.
- **15 published plan baselines researched**: original 12 plus Total Wireless MAX 5G BYO and H2O 10GB and Unlimited monthly plans.
- **5 conditional handset headlines added**: Metro iPhone 16e, Total Wireless Galaxy A17, Cricket iPhone 16e, Cricket Moto G Stylus 2025 and Cricket Galaxy A17.
- **58 entries remain without recorded official-publication research**: 23 other service plans and 35 phone offers. A matching conditional handset headline does not establish checkout eligibility.
- **Human checkout/full-terms sign-offs in `site/data/verifications.json`**: zero. Official source research and a rate match do not change this.
- **Research date**: 2026-11-02. The generator marks price-source observations aged after 21 days; the separately signed full-terms review expires after 14 days or a material data change.

Public record: https://gcd231983.github.io/five-bars/source-research.html
Underlying 20-item source file: `site/data/research-evidence.json`.
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

## Additional public carrier evidence — November 2, 2026

- Total Wireless MAX 5G BYO: official $30 first month, then $20/month with eligible AutoPay, yielding $250 service cost in the first 12 months before unspecified costs. https://www.totalwireless.com/m/plans and https://www.totalwireless.com/m/byop
- H2O monthly 10GB: $20 regular / $18 with eligible AutoPay, 2GB hotspot. H2O monthly unlimited (30GB high-speed): $30 regular / $27 with AutoPay, 5GB hotspot. https://www.h2owireless.com/plan/monthly
- Boost Pixel 10a: online page advertises $49.99 handset and $60 plan with number transfer, while the separate in-store page says two prepaid months. These are not necessarily the same channel or checkout conditions. https://www.boostmobile.com/deals and https://www.boostmobile.com/offers . This phone does NOT count toward the 15 plan-baseline records.

None of this establishes customer-specific checkout costs or a human full-terms sign-off.

## Five Bars 3.3 — conditional handset source audit (November 2, 2026)

Five selected device offers have separate official publication records, distinct from 15 supported plan-rate baselines. These records validate specifically quoted handset prices and required service rates/port-in/prepay fields. A conditional price match is not a complete checkout review, device compatibility check or verified customer savings.

| Device listing | Selected publication findings | Official source |
|---|---|---|
| Metro iPhone 16e | $99.99 handset; $55 first service month then eligible $50 AutoPay; separate conditional $100 virtual Mastercard | https://www.metrobyt-mobile.com/deals/apple |
| Total Wireless Galaxy A17 | $0 on selected switch option; Total STARTER $40 first month then eligible $35 AutoPay | https://www.totalwireless.com/buy/smartphones/samsung-galaxy-a17-5g-prepaid |
| Cricket iPhone 16e | $0 for selected online new-account port-in; 3 prepaid $60 service months; other price/prepay selections also appear | https://www.cricketwireless.com/shop/smartphones/apple-iphone-16e-128gb-black |
| Cricket Moto G Stylus 2025 | $0 on selected online port-in; 2 prepaid $60 service months; other handset price selections also appear | https://www.cricketwireless.com/shop/smartphones/motorola-moto-g-stylus-2025-gibraltar-sea |
| Cricket Galaxy A17 | $0 on selected new-line port-in; $60 Supreme Unlimited plan and first service month due | https://www.cricketwireless.com/shop/smartphones/samsung-galaxy-a17-5g-black |

Carrier offer pages may show different prices across customer types, locations, selected service tiers or revisions. In the daily site generator, aging evidence does not refresh its original observation date. A source conflict suppresses a savings calculation; it does not automatically edit a carrier promotion. Customer-specific checkout, taxes, early-exit conditions and full unlock policies still need human review. **20/78 public-source researched; 0/78 human checkout/full-terms reviewed.**
