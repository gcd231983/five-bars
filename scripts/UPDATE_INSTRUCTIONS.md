# Five Bars — source rules and manual verification

The live updater is `scripts/auto-update.mjs`; **Claude is not part of the workflow**.

## Automatic rules

- `scripts/auto-core.mjs` expires a phone deal only when its explicit `ends` date is **earlier** than the current Eastern date, and removes a plan promotion only when `promo.ends` has passed.
- The Boost Mobile deals-page parser collects tentative candidates for recognized handset IDs (`boost-motog`, `boost-a17`, `boost-gplay`). All candidates require manual review, including unchanged prices. Nearby text is insufficient to verify product boundaries or complete eligibility; no scraped price is automatically applied or marked verified.
- No new phones or plans are generated from unstructured prose, and **HTTP 200 does not prove** that a conditional promotion remains valid.
- Any blocked or ambiguous listing is flagged in `site/data/status.json`. No price changes or new promotions are automatically committed.
- The file `checked` in deals.json remains the last **full human/AI review date**. A routine scan never rewrites that value. The scan date is separately stored in `site/data/status.json`.

## When adding a verified offer manually

Check an official carrier/merchant page and document the actual price, required plan price, required number transfer, advance prepayment, stay requirement, rebates/credits, bundled service months, and unlock terms. Check whether the device is financed and whether leaving early triggers a price clawback. Preserve stable IDs.

### Plans

- `id`, `carrier`, `plan`, `net` (`vzw`, `att`, `tmo`, `multi`), `unl`, `price`, `tax`, `pri`, `url` are required.
- Optional `firstMonthPrice` is an explicitly sourced one-line, first-month service charge that differs from the continuing rate; count it only once. Do not infer a family first bill. Optional `family` keys are **per-line** prices for counts `2`–`5`; `promo` may include `price`, `months`, `req`, `ends`, `text`; `maxLines`, `data`, `hot`, `video`, `extra`, `priceNote` are optional.
- Never treat a price available only with a special enrollment condition as the regular one-line price.

### Phone deals

- Required: `id`, `carrier`, `phone`, `os`, `net`, `price`, `port`, `lock`, `url`.
- Optional: `planPrice` (ongoing monthly service), `firstMonthPlanPrice` (different first monthly bill, such as $55 first then $50 with AutoPay; not allowed with multi-month prepaid), `prepay` (months actually prepaid), `stay` (months required but **not** necessarily prepaid), `bundle` (months included in device price), `rebate`, `credit`, `creditMonths`, `postpaid`, `store`, `was`, `ends`, `note`, `warn`.
- The phone's `price` is the **checkout device price before a mail-in or delayed rebate** for cash/prepaid models. For `postpaid:true`, the number can instead be a promotional net headline, and upfront, commitment, 12-month and savings totals must be withheld until full retail and installment terms are documented. Optional `fullRetailRequired:true` means buying on device financing voids that particular promotion. **Never subtract unreceived rebates, conditional gift cards or future bill credits from the due-today, minimum commitment, first-year, or savings ranking.** List those separately with eligibility and redemption caveats.
- If a price varies with trade-ins or financing, leave unsupported totals unknown rather than asserting a single guaranteed price.

## Verification procedure

```sh
node --test tests/*.test.mjs
node scripts/deals.mjs check
node scripts/auto-update.mjs --dry-run
```

The GitHub Actions workflow runs the tests and data validator, checks updater syntax, then performs a real source scan. Deployment requires all checks to pass. A source requiring authentication or preventing automated access must not be bypassed; leave its offer unverified and investigate manually when possible.

## New-customer promotions, first-month bills, and published research fields

- A plan `promo.req: "new"` must **NOT** be included in a default calculator. Only calculate it when the visitor explicitly confirms new-customer eligibility. When unconfirmed, use `price` as the continuing monthly rate. The legacy plans screen uses the "I qualify as a new customer" toggle; the guided finder uses a checkbox; Switch & Save collects its own confirmation.
- A documented one-line `firstMonthPrice` is counted once, separately from the ongoing `price`, even when the latter requires AutoPay. If the first-month amount for multiple lines has not been documented, restrict that selected offer to a single line with `maxLines: 1`; do not invent a family-wide initial charge.
- Official research records can include `publishedPromoPrice`, `publishedPromoMonths` and `publishedPromoRequirement` ("new"/"port") as a **complete triple**. Material mismatches with `promo.price`, `promo.months` or `promo.req` must show a source conflict and pause comparisons. These represent advertised conditional terms and do not grant human full-terms verification.
- Use official annual prepaid amounts (`billingMonths:12`, `billingUpfront`) and retain their actual upfront cash, distinct from effective monthly equivalents. Link each research observation directly to its official carrier URL; a reachable link is not checkout confirmation.


## Three-state port-in qualification and prepaid-promo prevention

- Plan `promo.req:"port"` is conditional: a missing answer is not consent or evidence that a customer can transfer. Set `canPort:true` only after a deliberate eligible-number confirmation. If the user selects `cannotPort:true`, do not apply the promotion, even if old stored preferences claim both. Port-in handset promotions should not be ranked as eligible finder recommendations without a positive port confirmation.
- The public plan list uses "I confirm eligible number transfer"; the guided finder uses `portStatus=unknown|yes|no`; Switch & Save retains its explicit canPort checkbox. New-customer confirmation is separate and does not establish port-in eligibility.
- **Do NOT put a multi-month, paid-in-advance discounted rate in an ordinary `promo` record.** A twelve-month $17/mo *equivalent* when $204 must be paid in advance is NOT a "$17/month for the first 12 months" monthly contract. Add distinct plans only when the upfront payment, renewal and exact selected term have been officially documented. The catalog linter rejects prepayment language in `promo.text`.
- Dated carrier source records can include `publishedPromoPrice`, `publishedPromoMonths`, and `publishedPromoRequirement`; do not infer a coupon or copy a promotional code from a separate sales channel without checkout confirmation.
- Recurring advertised service rates conditioned on AutoPay/eBilling/Auto-Refill remain **conditional** (not universal); document the undiscounted rate and compulsory charges in the plan's visible notes and source-ledger unresolved items until a fully qualified billing model is introduced.


## 3.7 — documented carrier charges and conditional billing discounts

- Optional `undiscountedPrice` (non-discount recurring service price, per line) MUST be recorded with a `discountCondition` of `autopay`, `autopay_ebilling`, or `auto_refill`. It cannot be lower than the catalog `price` (eligible published discounted recurring rate). Only a **documented single-line monthly offer** can currently use this metadata. Neither a carrier website mentioning AutoPay nor a prior promotional rate is proof of a customer's eligibility.
- Unconfirmed payment discount conditions always use `undiscountedPrice`; pass `discountQualified:true` ONLY on explicit customer affirmation in the main plan list, finder, comparison, or Switch & Save. Do not confuse this with new-customer or eligible number-transfer confirmation.
- Optional `knownMonthlyFee` and `knownActivationFee` are *per line*, separately sourced **fixed provider charges** for specifically documented monthly one-line plans. Monthly known fee enters each modeled bill once; activation enters the first bill once. Do not duplicate them in user-entered extra monthly fees. Additional taxes/fees/region-dependent surcharges stay unknown and explicitly disclosed.
- For Tracfone, `firstMonthPrice: 50` records that the $5 Auto-Refill discount starts **after** the initial $50 service month. For Consumer Cellular, all three fixed provider fee components plus $10 activation are included in the single-line quote only. Maintain dated research `publishedUndiscountedPrice`, `publishedDiscountCondition`, `publishedKnownMonthlyFee`, and `publishedKnownActivationFee`; these are subject to exact source conflict checks.
- A conditional benefit like StraightSAVINGS's future device credit or a discount expressly barred from stacking with AutoPay is **not** a guaranteed reduction to current service cash. Verify the carrier's own selected offer/channel wording and update the research ledger if material terms change.


## Five Bars 3.8 — availability and phone-offer first-month eligibility

- Set `availability:"out_of_stock"` only after reading a **dated selected carrier device page** and add `availabilityObservedOn:"YYYY-MM-DD"`. The offer remains browsable for transparency, but its monetary calculator values MUST be `null` and it MUST NOT be ranked as available in the guided finder, select-able for Switch & Save, or added to side-by-side cost comparisons. This is a **time-limited observation**, not a live inventory feed.
- A future carrier review may restore an offer by removing the hold **only with fresh documented stock observations** and a full check of actual qualifying offer terms. Merely seeing a reachable URL (HTTP 200) is NOT evidence of inventory; do not auto-clear these fields.
- Optional phone research field `publishedAvailability:"out_of_stock"` is a material signed field: if current catalog availability conflicts with the dated official observation, the source record turns **conflict** until manually researched again.
- Mint-like bundles must label `price` as the **combined handset + prepaid service upfront** when `bundle` is used. Don't independently add the included service months again or imply the `price` is device-only.
- Never conflate two carrier plan names or apply the family rate from one plan to another. The corrected Total ALL ACCESS selection supports **one line only** until an independent multi-line *first checkout* quote is documented. Include Metro's confirmed first service charge via `firstMonthPlanPrice` where a selected carrier page publishes it.
- Source research page lists unresearched offers in a risk-prioritized editorial queue with links labeled as **starting references**, not verified checkout links. Human reviewers must record exact price, tax, fee, stock, payment, port/new-customer, term, lock and expiration conditions before signing full terms.

## Five Bars 3.9 — checkout review evidence schema (human only)

- Follow [CHECKOUT_VERIFICATION.md](../CHECKOUT_VERIFICATION.md). The only supported public GitHub sign-off route is `.github/workflows/human-review.yml` on `main` with `review_details` as structured, anonymized JSON. The former URL-only `--full-terms-reviewed` command cannot certify an offer.
- The content includes `schema:1`, `channel` (official online checkout or carrier written quote), `observedAt` (same Eastern date as review), `lineCount`, `customerScenario` (eligible port/new/no port/existing/not required), `upfrontCents`, `renewalCents`, `billingMonths`, `requiredServiceMonths`, `taxesAndFeesIncluded:true`, `stockConfirmed:true`, and a complete ten-field true checklist. Postpaid quotes also document full retail, installment total/term, credit duration and early-exit exposure. The validator rejects unknown fields to prevent accidental collection of personal account information.
- Reviewer GitHub account, full current material catalog signature, official same-carrier HTTPS source and the checkout details are recorded together; the public label says a particular **scenario** was checked. Absent or stale evidence cannot be converted to an all-customer promise. Do not sign unavailable or expired offers, do not bypass carrier access restrictions, and do not invent actual checkout values.
- The public reviewer page is a privacy-preserving **drafting surface**; checking boxes and copying JSON never updates the verification ledger.


## Five Bars 4.0 — reader issue intake never updates rates automatically

- Reader-facing correction entry points link to `site/report.html?offer=<public-stable-id>` only. Use `site/report-core.mjs` for canonical offer lookups and user-input checks. Never put arbitrary free text, account details or checkout URLs into an issue-link query string.
- `site/report-ui.mjs` generates a local-only draft and opens GitHub's public `offer-correction.yml` issue form. It must not call an automatic report submission API, use localStorage for report contents or claim that the site creates tickets without user confirmation.
- The form's safety checks flag obvious personal data but are not perfect; the visitor and editor must inspect for private details before posting. Don't collect subscriber names, passwords, transfer PINs, IMEIs, account/order numbers or unredacted checkout screenshots.
- **A submitted reader issue is not an official price observation or verified checkout.** The existing research ledger and source-conflict rules still require an attributable dated carrier source and manual review before catalog changes. Follow [CORRECTIONS_POLICY.md](../CORRECTIONS_POLICY.md).


## Phone service discounts and fixed prepayments (4.1)

- Keep `planPrice` as the advertised service headline. When that rate requires AutoPay, store the pair `undiscountedPlanPrice` and `planDiscountCondition: "autopay"`. The undiscounted rate must be finite and at least the advertised rate. Calculators default to it; only an explicit `discountQualified: true` enables the lower rate. Preserve the headline for automated source comparisons.
- A published fixed service block may use `prepaidServiceTotal` alongside `prepay` (2–12 months). Charge that amount once initially; later modeled service uses the monthly plan rate. Do not infer a recurring monthly bill by dividing the initial block. Do not combine this field with `bundle`, `postpaid` or `firstMonthPlanPrice`. Clearly disclose the assumed later billing schedule and whether the selected device qualifies for that block.
- Source records use `publishedUndiscountedPlanPrice` with `publishedPlanDiscountCondition`, and `publishedPrepaidServiceTotal` with `publishedPrepayMonths`. A material discrepancy must pause savings estimates. Source publication is not a human checkout review.
- The anonymous checkout sign-off must cover both the device price and any fixed mandatory initial service amount; a lower observed quote requires reconciliation before sign-off.
