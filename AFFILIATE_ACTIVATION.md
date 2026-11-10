# Affiliate partner activation register

This is a **process register**, not a claim that Five Bars has been accepted by any carrier or affiliate network. No approval, tracking identifier, commission rate, or payout terms have been independently verified.

| Candidate | Approval status | Tracking ID | Destination | Activation |
| --- | --- | --- | --- | --- |
| Impact affiliate network | Owner application / approval not verified | None recorded | None activated | Blocked |
| Direct wireless carrier programs | Not verified | None recorded | Official non-affiliate URLs only | Blocked |

## Activation checklist

1. Owner supplies dated acceptance evidence, applicable program terms, merchant name, authorized tracking URL/parameters, and payout/disclosure requirements.
2. Confirm that a compensated referral is allowed for this website and this specific carrier offer; record restrictions and any expiration.
3. Add a clear **"We may earn a commission if you buy through this link"** disclosure immediately beside each compensated link. Keep the broader disclosures page.
4. Add `rel="sponsored noopener noreferrer"` for outbound compensated links; retain safe HTTPS URLs and avoid leaking personal calculator, watchlist, or account values.
5. Keep comparison rankings independent of commission. Do not silently replace the catalog's official source URL or treat affiliate tracking as price evidence.
6. Add tests for each approved program's link behavior, labels, and opt-in analytics, then run regression and browser suites before release.
7. Recheck merchant and program approval periodically. Remove tracking and nearby commission claims if the relationship ends.

## Privacy-first measurement decision

Do not install third-party tracking scripts or outbound analytics until the owner has chosen a lawful measurement approach and the privacy notice has been updated. Prefer aggregate, consent-aware counts with no phone numbers, subscriber IDs, financial inputs, search terms, watchlists, or cross-site profiles. No analytics has been activated by this register.

## Remaining owner inputs

Approval correspondence, partner portal status, affiliate identifiers, allowed destinations, restrictions, and any tax/payment onboarding are not available in this repository. Never infer them from an application or a verification meta tag.

## Turning on an approved program (buying guides and carrier pages)

The static buying guides (`site/best/`), carrier pages (`site/carriers/`) and hubs read `site/data/affiliates.json`. Every program starts `"status": "inactive"`, so pages link to the carrier's official URL with no tracking.

When a network approves Five Bars for a carrier:

1. In `site/data/affiliates.json`, set that carrier's `"status": "active"`, `"approvedOn": "YYYY-MM-DD"` (the acceptance date) and `"url"` to the HTTPS tracking link from the partner portal. Anything else (missing date, `http:` link, unknown status) is ignored by the generator and covered by `tests/seo-pages.test.mjs`.
2. Run `node scripts/build-comparisons.mjs` (the daily workflow also does this) and `node --test tests/*.test.mjs`.
3. The generator automatically adds `rel="sponsored noopener noreferrer"`, an "Affiliate link" label beside each button, and an "Advertiser disclosure" notice near the top of every page that contains one. Ranking order is computed before links are chosen and is tested to stay identical.
4. Update the Approval status table above and keep the acceptance evidence. The catalog (`site/data/deals.json`) keeps official, untracked source URLs.
