# Five Bars — ten-scenario checkout evidence plan

This is a **manual evidence-collection checklist**, not a list of ten verified deals. It does not authorize changing prices, clearing retailer holds, ranking commercial partners, or activating affiliate links. Each review must concern one genuine, current, anonymized official carrier checkout or written quote. **Do not purchase a plan or phone solely for a review.**

## Why these ten

The previous launch shortlist contained only plans. This set deliberately covers six service plans and four phone offers with different real-world billing and eligibility hazards. It samples the ways advertised prices can diverge from what a specific customer owes. Actual provider selection does not imply endorsement or a paid partnership.

| Offer ID | Scenario to inspect | Specific pitfall to resolve |
| --- | --- | --- |
| `visible` | Standard one-line monthly BYOD | Confirm actual first payment, taxes, renewal, and any payment-method condition |
| `usm-starter` | **Two-line** household quote | Family pricing and selected network; do **not** apply a single-line port-in intro to two lines without evidence |
| `tello` | New-line intro and published deadline | Validate both customer eligibility and deadline; after the intro ends, review the **regular** plan, not an expired promotion |
| `mint` | Twelve-month prepaid plan | Full annual payment due **upfront**, taxes and renewal; a monthly equivalent is **not** monthly billing |
| `cricket-25` | Twelve-month BYOD/new-line plan | Exact channel, annual prepayment, qualified handset, activation fees and renewal |
| `cc` | Monthly service with itemized carrier fees | Recurring and one-time charges, plus unknown location-dependent taxes |
| `boost-p10a` | Discounted phone with future service commitment | Differentiate online/store offers, AutoPay eligibility, due today and the months required to retain the deal |
| `cricket-16e` | $0 advertised handset with multiple service months prepaid | Port eligibility, prepaid service charged now, activation, unlocking and cancellation |
| `vzpre-a17` | New-line-only phone with a special first bill | Exactly which device and qualifying plan, new-line eligibility, first month and subsequent month charges |
| `vz-18pro` | Postpaid financed device with conditional monthly bill credits | Gross retail, installment amounts, credit duration and potential remaining debt on early cancellation; withhold costs if missing |

## How to complete one review safely

1. Open the [live editorial review workbench](https://fivebars.info/review-workbench.html). The **10-scenario launch review shortlist** is selected by default. Choose an offer and read its distinct caution and open carrier source.
2. Personally inspect the correct **official carrier checkout before placing an order**, or obtain a **written quote** from that carrier. Do not bypass bot or account protections. If stock, terms, eligibility, tax or financing detail is missing, stop; leave the offer unverified.
3. Check actual first and renewal totals **inclusive of mandatory taxes and fees**, exact billing interval, line count, first-month adjustments, minimum/prepaid service period, transfer/new-line requirements, and other checklist conditions. For financed devices, include gross retail, installments, bill credits and early-exit liability.
4. In the workbench, complete all ten material terms with the genuine observed values and copy its structured checkout JSON. This is still **not** an approval. **Never enter names, subscriber IDs, addresses, account information, transfer PINs, cards, or other personal data** in GitHub or worksheet fields.
5. Run the repository's [human sign-off workflow](https://github.com/gcd231983/five-bars/actions/workflows/human-review.yml) on `main`, following [CHECKOUT_VERIFICATION.md](CHECKOUT_VERIFICATION.md). The exact offer ID, carrier source URL, current anonymized quote, GitHub identity and explicit human attestation are required.
6. Confirm the workflow actually succeeded. The public catalog can show the specific reviewed scenario, not a guarantee for other customers. Re-check when terms change and no later than the existing 14-day review freshness window.

An offer blocked at checkout, out of stock, or with missing financing terms should remain **unverified**. An expired introductory offer must not receive a new sign-off for its former price. Ten completed checkbox worksheets are not ten observations; the release gate requires **ten genuine, complete, current reviews** spanning these different risk categories.

## Separate release blockers

The three retailer-specific holds remain tracked in [issue #28](https://github.com/gcd231983/five-bars/issues/28). Business, private support, accessibility, legal and affiliate authorizations remain tracked in [issue #32](https://github.com/gcd231983/five-bars/issues/32). Do not conflate passing software tests, publicly published headline matches, or this plan with either kind of approval.
