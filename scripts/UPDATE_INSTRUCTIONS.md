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
- The phone's `price` is the **checkout device price before a mail-in or delayed rebate**. **Never subtract unreceived rebates, conditional gift cards or future bill credits from the due-today, minimum commitment, first-year, or savings ranking.** List those separately with eligibility and redemption caveats.
- If a price varies with trade-ins or financing, leave unsupported totals unknown rather than asserting a single guaranteed price.

## Verification procedure

```sh
node --test tests/*.test.mjs
node scripts/deals.mjs check
node scripts/auto-update.mjs --dry-run
```

The GitHub Actions workflow runs the tests and data validator, checks updater syntax, then performs a real source scan. Deployment requires all checks to pass. A source requiring authentication or preventing automated access must not be bypassed; leave its offer unverified and investigate manually when possible.
