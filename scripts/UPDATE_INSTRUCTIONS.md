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
