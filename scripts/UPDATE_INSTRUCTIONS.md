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
