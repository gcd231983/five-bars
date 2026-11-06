# Five Bars — engineering acceptance and owner handoff
**Snapshot date:** November 6, 2026 (America/New_York)  
**Technical outcome:** PUBLIC BETA ENGINEERING ACCEPTED — validated CI, published GitHub Pages, independently probed production revision.  
**Business outcome:** NOT approved for guaranteed checkout pricing, paid referral operation, or commercial-launch certification.

## 1. Verifiable production acceptance

- Canonical site: **https://fivebars.info/**
- Most recent successful production workflow at this snapshot: [Five Bars no-AI deal checks & website #42244972423](https://github.com/gcd231983/five-bars/actions/runs/42244972423).
- The production workflow passed all four dependent jobs: **update**, **browser**, **deploy**, and **Verify public production website**.
- The public smoke check independently retrieved the HTML homepage, current `/data/status.json`, canonical `/sitemap.xml`, and `/release.json`.
- **Publicly verified release SHA:** `45abfda352a17bc37efd213fad419730fb9c3490`; release content fingerprint `a77d8ad6298e4a68`.
- A successful GitHub merge alone does **not** establish public deployment. The complete workflow and live `release.json` check are required for each later release.

### Accepted changes (each merged after both regression and mobile/desktop browser CI)

| PR | Consumer protection |
| --- | --- |
| [#98](https://github.com/gcd231983/five-bars/pull/98) | A dated official Tello promotion publication can be viewed separately from an inaccessible purchase page, without certifying checkout. |
| [#99](https://github.com/gcd231983/five-bars/pull/99) | US Mobile Starter and Premium six-month introductory estimates require **both** confirmed eligible number transfer **and** confirmed AutoPay eligibility. |
| [#100](https://github.com/gcd231983/five-bars/pull/100) | Dated first-party US Mobile family and prepaid guides appear as narrow research alternatives; invalid and future publication dates are rejected. |
| [#102](https://github.com/gcd231983/five-bars/pull/102) | Editorial queue prioritizes official publication gaps, retailer-channel holds, dated stock holds and conflicting source facts. |
| [#103](https://github.com/gcd231983/five-bars/pull/103) | Same-URL link failure history elevates **still-listed conditional promotions** that remain uncheckable across scans spanning seven days, for *manual editorial review only*. |

No new automatic price inference, checkout sign-offs, merchant approvals, outbound affiliate tracking or removal of held offers was authorized by these changes.

## 2. Recorded catalogue and monitoring snapshot

Machine scan completed **2026-11-06 15:38:55 UTC**:

| Measure | Recorded result | Meaning |
| --- | ---: | --- |
| Catalog offers | 78 | 38 service plans and 40 phone offers |
| Public source URLs fetched | 10 of 18 reachable | Reachability is **not** verified price/terms |
| Distinct offer links fetched | 46 of 60 reachable | No guarantee of current promotional eligibility |
| Official dated research | 72 matched / 4 partial / 2 unresearched | First-party publication scope only |
| Current independent full-terms checkout scenarios | **0 of 78** | Customer-specific prices/taxes remain unverified |
| Maintenance reviews | 8 high / 26 medium / 44 routine | These are **review priorities**, not proof of invalid deals |
| Retailer-specific evidence holds | 3 | Suppress exact checkout and savings claims until genuine channel-specific proof |
| Dated out-of-stock holds | 6 | Remain excluded from recommendations until observed availability supports release |
| Seven-day uncheckable conditional offers | 0 | Per-offer history began tracking; no artificial prior-week outages inferred |

The editorial catalog reference date remains **2026-10-29**. The routine scanner's timestamp **must not** silently advance a full human review date. Full-terms attestation requires real anonymized evidence; passing tests, page responses, research articles or synthetic fixtures do not qualify.

## 3. Time-sensitive safeguard

The Tello Everyday 10GB introductory offer is cataloged as **$10/month for three months** for eligible newly activated lines, then **$15/month**, with a published end date **November 9, 2026 at 11:59 p.m. EST**. The official carrier publication corroborates the published deadline, not any visitor's checkout. The code uses the Eastern calendar boundary: on **November 10, 2026**, the automated workflow removes only the expired introductory promotion and retains the standard $15/month plan. Exact-date tests cover the last valid day and the following day. Confirm later scheduled scans and do not reactivate this promotion without new source evidence.

## 4. What is safe to rely on now

- The working public-beta site and guided comparisons, with conservative 12-month/upfront/required-service distinctions.
- Documented source links, last-scan and source-status disclosures, automatic known-expiration processing and recovery warnings.
- Curated comparison/research pages, sitemap, review workbench, human review safeguards and correction reporting.
- Recurring no-paid-AI GitHub Actions (daily `17 10 * * *` UTC, or **5:17 a.m. EST / 6:17 a.m. EDT**) with test → scan → browser → deployment → production verification gates.
- An inaccessible (403, timeout, oversized) source **does not** automatically prove an offer was withdrawn, nor may an HTTP 200 independently certify its advertised terms.

## 5. Explicit remaining owner and editorial gates — NOT COMPLETE

1. **Real independent checkout observations:** Record at least ten diverse genuine, itemized, anonymous carrier checkout or written quote scenarios. The prioritized offer IDs and exact evidence checklist are in [issue #32](https://github.com/gcd231983/five-bars/issues/32) and the [read-only workbench](https://fivebars.info/review-workbench.html). Do not submit account numbers, transfer PINs, payment information or unredacted personal documents.
2. **Three held retailer activations:** Verify the selected Walmart/retailer-channel Verizon Prepaid A17, Straight Talk A17 and Simple Mobile A16 offers with actual channel-specific terms, customer scenario, inventory, taxes and required service. See [issue #28](https://github.com/gcd231983/five-bars/issues/28); keep the existing holds in place.
3. **Remaining blocked or partially scoped public sources:** Conduct attributable editorial research when source access permits. H2O, Red Pocket, Clark and BestPhonePlans scanner limitations are not permission to bypass access restrictions; public-source alternatives never establish private checkout facts. See [issue #87](https://github.com/gcd231983/five-bars/issues/87).
4. **Owner-approved support and privacy:** Confirm a genuinely private working support inbox, appropriate data handling, retention/moderation practice, and review of privacy disclosures.
5. **Independent real-user validation:** Test representative iOS/Android phones, slow connections, keyboard and screen readers, and comprehension of upfront payment versus monthly cost and device credit exposure. Automated browser tests are not a certification.
6. **Commercial and affiliate authorization:** Confirm business/legal and advertising compliance requirements, actual network/carrier program acceptance, signed terms, authorized referral destinations, tracking/disclosure rules and tax/payment onboarding. No paid link may be activated on the strength of an application alone.

### Operational closeout rule

**Engineering/public beta:** accepted at the verified release SHA above.  
**Commercial conversion / verified-checkout claims:** blocked until owner and real-world evidence gates are closed with checkable records.  
**Future automated changes:** preserve the date-based expiry and price safeguards, require new green CI and post-deployment production smoke, and never imply an unreadable source is a confirmed price change.

This report is a dated repository snapshot, **not** a live carrier quote, legal opinion, or continuing guarantee. For the newest results use [live launch readiness](https://fivebars.info/launch-readiness.html) and [GitHub Actions](https://github.com/gcd231983/five-bars/actions/workflows/daily.yml).
