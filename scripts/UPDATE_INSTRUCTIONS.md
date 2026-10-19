# Daily update: Five Bars deal list

You maintain `site/data/deals.json` for Five Bars, a US phone-plan and free-phone deal tracker.
Today's deal pages are already downloaded to `work/sources/`. Start with `work/sources/INDEX.txt`:
it has today's date and lists every source as OK (with its file) or FAILED (the download was blocked).

## Steps

1. Read `work/sources/INDEX.txt`, every OK source file it lists, and `site/data/deals.json`.
2. For each FAILED source, try its URL once with WebFetch.
3. Run up to 8 web searches (and fetch pages as needed) to confirm current promos at the big carriers
   (Verizon, AT&T, T-Mobile) and the popular MVNOs (Visible, US Mobile, Mint, Total Wireless, Metro, Cricket, Boost).
   Spend at least one search on multi-line (family) pricing for plans that are missing it.
4. Edit `site/data/deals.json` in place so it reflects today's deals (rules below).
5. Run `node scripts/deals.mjs check`. If it reports problems, fix them and run it again until it passes.
6. Stop. Don't touch any other file, and don't commit; the workflow does that.

## Rules

- Use only facts from today's pages or your searches. Never invent a carrier, price, phone, or date.
- **plans** are regular service plans. Keep each one unless you find evidence its price or terms changed
  (update it) or it was discontinued (remove it). Add, update, or remove its `promo` based on today's info.
  Add an important new plan only if a source clearly lists it.
- **phones** are free or discounted phone deals. Keep a deal only if today's pages or searches still show it.
  Remove deals that are gone or expired. Add new free or near-free deals you find; keep the best 25 to 40.
- Keep the same `id` for the same deal. New ids use lowercase letters, digits and hyphens, like `metro-a17`.
- Dates are `YYYY-MM-DD`. Set `promo.ends` or `ends` only when a source states an end date.
- Prices are plain numbers in US dollars. `price` on a plan is the regular monthly price for one line.
- Write short plain sentences in sentence case and use ’ for apostrophes in text.
- Leave `checked` and `sources` alone; the workflow sets them.
- Weigh sources sensibly. Carrier pages are best for their own prices. Carrier-written guides (like US Mobile’s blog)
  and Reddit or Slickdeals posts are leads: confirm a deal with a second source or the carrier’s page before adding it.

## Family (multi-line) pricing

- `family` is optional on a plan. Keys are line counts `"2"` to `"5"`; values are the regular **per-line** monthly price
  at that many lines. Example: 4 lines for $115 total → `"4": 28.75`.
- If a carrier charges the same price per line no matter how many lines (US Mobile, Visible, Mint, Tello),
  fill all four keys with the 1-line price, so the site can say so.
- Include only line counts a source actually states. Leave `family` out when you don’t know it.
- If a deal is limited to one line (or a few), set `maxLines` to that number so it’s hidden for bigger households.

## Plan fields

`id`, `carrier`, `plan`, `net` (`vzw` | `att` | `tmo` | `multi`), `unl` (true/false), `data` (string, only when `unl` is false),
`price`, `priceNote` (optional), `promo` (optional: `price`, `months` (use 60 for multi-year), `text`, `req` (`port` | `new`), `ends`),
`family` and `maxLines` (optional, see above), `tax` (taxes included, true/false), `pri` (priority data: true, false, or null if unknown), `hot` (string or null), `video` (string or null),
`extra` (optional), `url` (https).

## Phone deal fields

`id`, `carrier`, `phone`, `os` (`iphone` | `android`), `net`, `price` (what you pay for the phone, 0 if free),
`was` (optional regular price), `rebate` (optional), `planPrice` (monthly plan required, or null if it varies),
`prepay` (optional months paid up front), `stay` (optional months you must keep the plan),
`bundle` (optional months of service included in `price`), `credit` and `creditMonths` (optional monthly bill credit),
`port` (must move your number, true/false), `store` (optional, in-store only), `postpaid` (optional),
`lock` (whole months until unlocked, 0 if sold unlocked), `ends` (optional), `note` (optional),
`warn` (optional catch worth knowing), `url` (https).
