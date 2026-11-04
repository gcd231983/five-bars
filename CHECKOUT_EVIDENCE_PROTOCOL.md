# Five Bars: real checkout evidence collection protocol

**Status: collection guide only. No checkout is certified by this document.**

Use this with [the review workbench](https://gcd231983.github.io/five-bars/review-workbench.html) and [commercialization gate #32](https://github.com/gcd231983/five-bars/issues/32). This file is not a verification ledger and does not change any offer's status.

## First ten representative scenarios

| Offer ID | Scenario to observe | Critical discrepancy to check |
| --- | --- | --- |
| `usm-starter` | New-line eligible port-in versus regular monthly plan | Promotional duration, network choice and first payment |
| `visible` | Single-line BYOD | Due today, taxes and fees |
| `total-max` | BYOD with qualifying AutoPay | First month versus recurring discounted months |
| `mint` | New customer, multi-month service | Entire prepayment and renewal |
| `cricket-25` | 12-month BYOD | $300 upfront versus $25 monthly equivalent |
| `good2go-annual1` | Annual 1GB plan | $60 upfront, fees and renewal |
| `cc` | Consumer Cellular Basic 1GB | Activation and published fixed fees |
| `tello` | Everyday 10GB promotion | First three months, post-promotion renewal and eligibility |
| `boost-p10a` | Pixel 10a handset promotion | Device due today, service requirement, lock and commitment |
| `att-18pro` | Financed iPhone | Gross installments, conditional credits, trade-in and early exit |

Catalog IDs designate **research targets**, not presently available or checkout-confirmed offers. Replace an expired or inaccessible target with another representative documented scenario and record why.

## Worksheet — one copy per genuine observation

- Offer ID and exact carrier/retailer channel:
- Observation date, time and time zone:
- Official URL and anonymized tax jurisdiction (state/ZIP region only as needed):
- New/existing subscriber, port-in, BYOD, AutoPay, trade-in and other eligibility:
- Device model, storage, lock policy and mandatory plan:
- Advertised amount and promotion expiration:
- **Itemized amount due today** (device, service, activation, taxes, fees, shipping, other):
- First service bill and ongoing bill; payment cadence and prepaid months:
- Renewal amount/date, minimum commitment and cancellation conditions:
- Device gross price, financing term, conditional credits and early-exit exposure:
- High-speed data, hotspot, roaming, coverage and other material limitations:
- Evidence: dated redacted screenshots or written carrier quote:
- Reviewer and unresolved unknowns:
- Reconciliation with Five Bars upfront and 12/24/36-month estimates:
- Disposition: **unverified** / **needs correction** / **ready for authorized human sign-off**:

## Privacy and integrity rules

1. Do not purchase, activate, open subscriber accounts or enter credentials to collect evidence. Do not bypass bot protection or access restrictions.
2. Never put customer names, phone numbers, street addresses, account numbers, transfer PINs, payment details or unredacted checkout screenshots in public GitHub issues.
3. Public advertised prices and a reachable link are **not** checkout verification. Record unknown amounts as unknown, not zero.
4. Never run the protected human-signoff workflow without a real human having inspected the complete relevant terms and truthfully providing its required attestation. A completed worksheet alone is not a sign-off.
5. For each verified scenario, compare upfront cost and 12/24/36-month calculations, correct any confirmed discrepancies, then run the Node regression suite and mobile/desktop browser checks before merge.
6. Keep retailer-channel holds intact until **the exact retailer** and required activation channel are supported by genuine evidence. Carrier direct-store deals do not clear Walmart holds.
7. Keep the commercial release gate closed until owner-controlled legal, support, accessibility and affiliate requirements are independently satisfied.
