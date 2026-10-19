# Daily update: Five Bars deal list

You maintain `site/data/deals.json` for Five Bars, a US phone-plan and free-phone deal tracker.
Today's deal pages are already downloaded to `work/sources.txt` (the first line has today's date).

## Steps

1. Read `work/sources.txt` and `site/data/deals.json`.
2. Run up to 6 web searches (and fetch pages as needed) to confirm current promos at the big carriers
   (Verizon, AT&T, T-Mobile) and the popular MVNOs (Visible, US Mobile, Mint, Total Wireless, Metro, Cricket, Boost).
3. Edit `site/data/deals.json` in place so it reflects today's deals (rules below).
4. Run `node scripts/deals.mjs check`. If it reports problems, fix them and run it again until it passes.
5. Stop. Don't touch any other file, and don't commit; the workflow does that.

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
- Leave `checked` alone; the workflow sets it.

## Plan fields

`id`, `carrier`, `plan`, `net` (`vzw` | `att` | `tmo` | `multi`), `unl` (true/false), `data` (string, only when `unl` is false),
`price`, `priceNote` (optional), `promo` (optional: `price`, `months` (use 60 for multi-year), `text`, `req` (`port` | `new`), `ends`),
`tax` (taxes included, true/false), `pri` (priority data, true/false), `hot` (string or null), `video` (string or null),
`extra` (optional), `url` (https).

## Phone deal fields

`id`, `carrier`, `phone`, `os` (`iphone` | `android`), `net`, `price` (what you pay for the phone, 0 if free),
`was` (optional regular price), `rebate` (optional), `planPrice` (monthly plan required, or null if it varies),
`prepay` (optional months paid up front), `stay` (optional months you must keep the plan),
`bundle` (optional months of service included in `price`), `credit` and `creditMonths` (optional monthly bill credit),
`port` (must move your number, true/false), `store` (optional, in-store only), `postpaid` (optional),
`lock` (whole months until unlocked, 0 if sold unlocked), `ends` (optional), `note` (optional),
`warn` (optional catch worth knowing), `url` (https).
