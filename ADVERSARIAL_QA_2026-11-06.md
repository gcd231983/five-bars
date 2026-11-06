# Five Bars — adversarial browser QA (November 6, 2026)

This is a reproducible software test report, **not** independent carrier price, affiliate, accessibility, or checkout certification.

## Baseline and adverse findings

The standard Node regression suite and the existing responsive browser acceptance suite passed before this audit. A separate negative-path browser suite was then introduced in [PR #117](https://github.com/gcd231983/five-bars/pull/117).

- Initial exploratory browser run: [#42277961055](https://github.com/gcd231983/five-bars/actions/runs/42277961055) — 7 scenarios passed; 4 failed.
- **Confirmed defect 1:** Switch & Save retained prior calculated totals after a user edited the current bill or qualification fields. Fix: clear results and explain that a recalculation is needed whenever any form input or selection changes. No price or eligibility arithmetic was altered.
- **Confirmed defect 2:** Corrupted, obsolete or tampered local `fivebars-prefs` could inject an unknown shopping mode or invalid household count into `renderControls`, interrupting catalog startup. Fix: restore only recognized tabs, modes, sorting options, networks, 1–5 lines, and known boolean toggles. No offer data changed.
- **Test defects:** Two test cases used a selector matching several action buttons on one card. They were tightened to address the unique Add to compare button. These were not product failures.
- Clean second run: [#42278504798](https://github.com/gcd231983/five-bars/actions/runs/42278504798) — **11 of 11 adversarial scenarios passed** on the fixed branch. Separate Node regressions also passed.

## Adversarial scenarios

1. Horizontal overflow and view transitions at 320, 360 and 768 pixel widths, supplementing the existing 390 and 1280 pixel acceptance.
2. Rapid catalog search, sorting and network changes, unrelated-network empty state and full catalog/unlimited restoration.
3. Search-string HTML injection attempt (rendered as text, not executed).
4. Three-plan comparison persistence across reloads, fourth-offer rejection, cross-type protection and reset.
5. Malformed, oversized, duplicate and hostile watchlist JSON imports; local persistence and injection containment.
6. Switch & Save stale-result invalidation after numeric or eligibility changes and browser-native rejection of invalid negative input.
7. Startup recovery from invalid saved shopping mode, household count, provider, network and sort.
8. Graceful operation when browser local storage access is disabled.
9. Plan browsing during an optional source-monitoring endpoint outage (HTTP 503).
10. Small-phone More menu, secondary tools and browser Back navigation.

These tests are implemented in `tests/adversarial-browser.mjs`. The pull-request browser workflow and the daily production publish workflow run them after the existing mobile/desktop smoke suite, with failure screenshots and a structured audit result uploaded alongside browser artifacts.

## Explicit limitations

- These are deterministic Chrome/Playwright interactions on the release artifact in CI, not real iOS Safari, Android physical-device or assistive-technology tests.
- HTTP source reachability, official publication research and simulated quotes do not prove a carrier's current checkout, taxes, financing terms or eligibility.
- No customer accounts, backend access, payments, affiliate applications, tracking scripts, protected carrier checkout or unverified price changes are involved.
- Merge and successful PR checks alone are insufficient to confirm publication. Require the normal GitHub Pages deployment and public live-revision smoke check after merge.
