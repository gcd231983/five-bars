# Five Bars — official-source audit: November 2, 2026

**Scope: official publicly available plan pages, broadband consumer disclosures and carrier promotion notices. NOT a completed carrier checkout, personal eligibility test, carrier-approved partnership or signed full-terms review.**

## Current coverage and meanings

- **Total catalog**: 78 items — 38 plans, 40 device promotions.
- **36 dated plan-rate baselines researched**: the previous 28 plus Ultra Mobile (two plans), MobileX (two plans), Google Fi Essentials, Consumer Cellular 1GB, Tracfone Freedom and Straight Talk StraightSAVINGS.
- **9 dated conditional handset headlines researched**: the original five plus Boost Pixel 10a, Boost Motorola razr 2025, Boost Moto G 2026 and Visible iPhone 18 Pro.
- **33 entries remain without recorded official-publication research**: 2 other service plans and 31 phone offers. A matching conditional handset headline does not establish checkout eligibility.
- **Human checkout/full-terms sign-offs in `site/data/verifications.json`**: zero. Official source research and a rate match do not change this.
- **Research date**: 2026-11-02. The generator marks price-source observations aged after 21 days; the separately signed full-terms review expires after 14 days or a material data change.

Public record: https://gcd231983.github.io/five-bars/source-research.html
Underlying 45-item source file: `site/data/research-evidence.json`.
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

## Five Bars 3.4 — financed devices and four more public device headlines (November 2, 2026)

The consumer calculators now **withhold all unsubstantiated financed/trade-in phone cash totals** for three currently unmodelable postpaid promotions. A $0 promotional *net* phone price is not a verified device retail price, installment agreement or cash payable at checkout. Source-level research has expanded from 20 to **24 of 78 offers** (15 plan baselines; nine *conditional* handset headlines); **54 still lack first-level research** and **zero have signed full-terms checkout verification**.

| Official published conditional offer | First-level publication evidence | Source |
| --- | --- | --- |
| Boost Pixel 10a | $49.99 selected online device headline with $60/mo Unlimited Premium and eligible number transfer; online prepayment and lock conditions not established | https://www.boostmobile.com/deals |
| Boost Motorola razr 2025 | $29.99 selected device, $60 monthly qualifying plan, two prepaid months and eligible port-in; minimum documented device plus prepaid service $149.99 before fees | https://www.boostmobile.com/deals |
| Boost Moto G 2026 | $0 selected online handset conditional on $60/mo plan and eligible number transfer; first checkout taxes/fees unknown | https://www.boostmobile.com/deals |
| Visible iPhone 18 Pro | $1,199 full-retail handset; activation on $45/mo Visible+ Pro, $20/mo conditional service credits for 24 months ($480 maximum); **device financing excludes this specific promotion** | https://www.visible.com/m/deals and https://www.visible.com/buy/phones/iphone-18-pro |

The Visible benefit requires full retail purchase and eligible service throughout the credit period. The base first-year estimate keeps the $1,199 handset and 12 months of $45 service gross; **no promised $240 first-year or $480 two-year credit is deducted from core savings**. Separately, mainstream postpaid financing rules from AT&T, Verizon and T-Mobile confirm that lost credits and installment balances create material early-exit risks:

- https://offers.att.com/
- https://www.verizon.com/support/device-payment-faqs/
- https://www.t-mobile.com/support/new-to-tmobile/promotional-cards-credits-and-rebates

These policy links explain risks; they do NOT verify any particular device promotion, new customer's eligibility, taxes or the actual monthly financed payment. Future work should collect device retail/MSRP, down payment, device installments, trade-in appraisal, plan, taxes, credit start/end and early-exit liability before any financed offer can receive a numerical quote.

## Five Bars 3.5 — eligibility safeguards and broader official research (November 2, 2026)

**Why this release matters:** Previous general plan calculators could apply a new-customer-only discount by default. The public listing, guided recommendations, comparison calculator, and Switch & Save now require the visitor to affirm new-customer eligibility before including those introductory discounts. Unconfirmed visitors see the normal published rate, not an invented promotional qualification. Number-transfer eligibility and multi-line pricing still require confirmation.

**Metro pricing correction:** Official selected single-line bring-your-own-phone service is **$30 first month, then $25/month with eligible AutoPay**. Its premium single-line plan is **$65 first month, then $60 with eligible AutoPay**. An earlier unsourced $15/month for three-month Metro promotion has been removed. The previously stored multi-line prices for these selected options were removed from automatic calculations until separately verified. Official https://www.metrobyt-mobile.com/phone-plans

**Boost Unlimited standard pricing:** Published $25/month recurring rate with AutoPay, taxes and fees extra; **$10/month for six months** is a conditional *new-customer* promotion and must not affect regular quotes unless eligibility is affirmed. Official https://www.boostmobile.com/plans

**Red Pocket monthly pricing:** Essentials $10 for 3GB; Plus $20 for 20GB with a conditional eligible-new-line $10 first month; Premium $30 with 50GB premium data and a conditional eligible-new-line $15 first month. A public source match does not certify new-line eligibility or taxes. Official https://my.redpocket.com/plans

**Helium monthly pricing:** Air $15 with 10GB including 5GB hotspot; Infinity $30 with 36GB high-speed and applicable data-speed management. Taxes and fees apply. Official https://support.hellohelium.com/en/articles/17734883-plans-pricing

**H2O annual prepaid:** 10GB/high-speed equivalent $16/month means **$192 due upfront for 12 months**; 30GB equivalent $24/month means **$288 due upfront**. Neither is ordinary monthly billing; tax/regulatory charges may apply. Official https://www.h2owireless.com/plan/monthly

**Good2Go annual prepaid:** 1GB $60 upfront ($5/month equivalent), 3GB $120 upfront ($10/month equivalent), 5GB $240 upfront ($20/month equivalent); always display cash paid annually. Official https://annualplans.good2gomobile.com/home-page

The source ledger now records **37/78** dated public-source findings (28 service plans and nine device promotions); **41/78** remain unresearched at this level; **0/78** have complete human full-terms checkout sign-offs. Records retain open eligibility and tax questions. New documentary fields capture the *conditional introductory amount, number of promo months and required customer status* so material catalog mismatches pause savings. The site links directly from a plan or phone badge to its dated source record; a source badge says PARTIAL, not verified checkout.

## Five Bars 3.6 — verified-publication scope and port/prepayment rules (November 2, 2026)

The default plan comparison no longer assumes a shopper is eligible to **port in an active number**. US Mobile Starter/Premium promotional prices appear in the calculator only if the visitor positively confirms eligible number transfer; no answer means regular monthly price. In the guided finder, number transfer is a three-way choice (**unconfirmed / yes / no**); port-required phone offers do not appear as qualifying recommendations until yes. The catalog still lists conditionally advertised devices for browsing with eligibility warnings, and Switch & Save independently requires port eligibility.

US Mobile's current public plan selector advertises **$15/mo Starter and $25/mo Premium for six months with port-in**, then $25 and $44; its separately published October 20 carrier articles describe alternative FBF10/FBF20 code campaigns at $10/$20 for six months. These should **not** be conflated, substituted without selecting the actual offer channel, or stacked. The selected online promo records now sign the amount, term and transfer condition as a partial carrier observation, not a checkout approval. Sources: https://www.usmobile.com/plans and https://www.usmobile.com/blog/cell-phone-plans/ .

**Ultra prepaid billing correction:** The site previously modeled a multi-month advance-payment headline as a regular 12-month introductory subscription without charging the advance payment. That assumption was removed. The quoted **one-month** Ultra Unlimited cost is $49; Ultra 4GB costs $19, before taxes/fees. Carrier-published 3/6/12-month rates require selecting those separate durations and paying all months upfront; not included in this one-month model. Ultra official sources: https://www.ultramobile.com/product/unlimited-prepaid-plan/ and https://www.ultramobile.com/product/4gb-prepaid-plan/ .

Other new first-level carrier observations:

| Catalog ID | Observed published service-only baseline | Official source |
| --- | --- | --- |
| `mobilex-unlimited10` | $14.88 for 10GB high-speed, then lower speeds; taxes extra | https://mymobilex.com/all-faqs/ |
| `mobilex-unlimited30` | $24.88 for 30GB high-speed, then lower speeds; taxes extra | https://mymobilex.com/all-faqs/ |
| `fi` | $35 Fi **Unlimited Essentials**, 30GB high-speed; excludes taxes and temporary Pixel promotions | https://fi.google.com/about/plans |
| `cc` | $20 Consumer Cellular 1GB with $5 AutoPay/eBilling reduction; additional mandatory phone fees, taxes and activation may apply | https://www.consumercellular.com/shopping/choose/plan |
| `tracfone` | $45 Tracfone Freedom with Auto-Refill, $50 without; prior anniversary promotion ended Oct 26, 2026 | https://www.tracfone.com/plans/tracfone-freedom-30-days |
| `straighttalk` | $25 ordinary StraightSAVINGS rate, with qualified new BYOP/AutoPay $20 promotional option **not assumed** | https://www.straighttalk.com/whyst/bring-your-own-phone |

**Evidence boundary:** The published-rate ledger now covers **45 of 78 catalog entries** (36 plans and 9 conditional phone headlines); **33 entries still lack this first-level source research**. Exactly **0 of 78** have customer-specific, complete human checkout verification. Service-only prices may exclude taxes, activation, AutoPay ineligibility, SIM kits, and other compulsory fees; they do not guarantee checkout cash. The published observation date is not overwritten by an automated link check.
