# Five Bars 3.9 — real checkout scenario verification

**Purpose:** make human approval accountable, limited to a specific checkout scenario and resistant to missing terms. This is **not** carrier certification, an invoice archive, or a guarantee that another consumer qualifies. Five Bars does not automatically conduct carrier checkouts.

## When a review can be recorded

1. Open the [live reviewer workbench](https://gcd231983.github.io/five-bars/review-workbench.html). Select the exact carrier offer ID, then read its dated official-source findings and outstanding eligibility questions.
2. Personally reach an **official carrier checkout** with the actual device/plan and option selected **before placing an order**, or obtain an actual **written carrier quote**. Do not pay or submit an order merely for Five Bars verification. Do not bypass an authentication or anti-bot control. If checkout cannot be accessed or its terms are incomplete, leave the offer unverified.
3. Check the full first payment (device, first service, required prepaid months, mandatory taxes, regulatory and activation fees, SIM/shipping) and the **renewal amount** for its stated cycle. Confirm customer status, port eligibility, AutoPay discounts, device stock, contract term, price lock/renewal rules, high-speed data, hotspot, roaming, IMEI/eSIM, device unlocking, credits, installment and cancellation terms. Confirm the evidence is **for the exact offer** and is **current**.
4. In the workbench's **Human verification checklist**, check the ten material terms and enter the exact observed first and recurring totals, in dollars. All mandatory fees must be included in those observed amounts. Choose whether the billing interval is 1 or 12 months, and record the applicable required service term, line count, eligibility and checkout channel. For postpaid device quotes, additionally enter documented device retail, installments, credit term, and early-exit liability.
5. Click **Copy structured checkout JSON for GitHub review**. It remains on your device until explicitly pasted. If any information is missing, the workbench refuses to generate complete evidence. Copying the worksheet does **not** approve a deal.
6. Open [GitHub Actions → Five Bars - human offer terms sign-off](https://github.com/gcd231983/five-bars/actions/workflows/human-review.yml), select **Run workflow** on `main`, choose `verify`, supply the exact `offer_id`, an official **public HTTPS source URL for that carrier and offer**, paste the JSON into `review_details`, and enter the exact human attestation `I_HAVE_PERSONALLY_CHECKED_ALL_OFFER_TERMS`. Only a user with repository write access can run that workflow.
7. GitHub executes regressions, checks official-domain matching and date/stock/schema restrictions, records the GitHub actor with the **one documented checkout scenario**, and audits the resulting ledger. The record expires after 14 days or when a material catalog field changes. Follow the Actions result; never presume success before it completes.

To undo a mistaken claim, run the same manual workflow with `invalidate` and attestation `I_CONFIRM_THIS_REVIEW_MUST_BE_INVALIDATED`. A review is not a guarantee of availability, service coverage, final taxes in another ZIP, or another person's eligibility.

## Data rules

The `review_details` JSON is **strictly structured, with no arbitrary notes**. Numbers are integer cents, e.g. $35.25 is `3525`. The current reviewer workbench produces the exact supported schema. **Never include** account numbers, names, phone numbers, addresses, ZIP-specific subscriber identity, transfer PINs, credentials, billing card details, screenshots containing personal data or cookies. GitHub history is persistent and can be public.

The record describes the `customerScenario` as `new_line_port`, `new_line_no_port`, `existing_customer` or `not_required`. Required fields include `observedAt` (Eastern review date), `channel`, `lineCount`, `upfrontCents`, `renewalCents`, `billingMonths` (1 or 12), `requiredServiceMonths`, `taxesAndFeesIncluded:true`, `stockConfirmed:true` and all ten checked terms. Financed postpaid devices must also document the total device retail, total installment obligations, installment duration, bill credit months and possible early-exit exposure. Missing information means no verified record.

**A generated template, a carrier price headline, an HTTP success, a hypothetical price and a checked checkbox are all insufficient.** Never fabricate checkout values to create a success badge. For a sample field guide, inspect `tests/helpers/checkout-fixtures.mjs`; those are deliberately synthetic test-only records and are NOT review evidence.

## Commercial readiness

Human-reviewed **scenario** records are not equivalent to 78 fully customer-verified shopping prices. Before public affiliate recommendations, independent checkout examples should be checked across representative carriers, ZIPs, network compatibility, taxes, line counts and enrollment conditions, with review records and a corrections mechanism. Affiliate relationships, legal readiness and consumer feedback remain separate owner tasks.
