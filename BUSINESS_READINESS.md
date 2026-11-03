# Five Bars — business-readiness gates

Status on November 2, 2026: PRE-COMMERCIAL-LAUNCH. This is a checklist, not a statement that the business is registered, an affiliate agreement exists, or checkout prices are independently verified.

## Already built

- 38 wireless plans and 40 advertised phone offers with finder, comparisons, network/provider choices and customer watchlists.
- Dated official source monitoring, partial headline checks, mismatch holds, historical rates, a review queue and owner notifications via GitHub Issues.
- New Switch & Save customer calculator: 12/24/36-month modeled costs, upfront payment, payoff, annual prepay, required service, eligibility constraints and safe report sharing.
- Editorial standards, privacy, commercial disclosures, switching guide, search-index metadata, automated regression and browser testing.
- Free GitHub Pages hosting and no-paid-AI scheduled validation.

## Hard gates before asserting complete consumer or commercial readiness

### Price and eligibility verification

- [ ] Review all 78 offers against each carrier's actual checkout/plan terms; confirm required plan, service price, applicable taxes, phone lock, financing, number transfer, activation fees, promotions, annual billing, renewal, high-speed allotments, hotspot, roaming and coverage limitations.
- [ ] Use official carrier broadband consumer labels when available, and document dated evidence and human review in the existing signed verification ledger. A link scan or partial headline match alone does not count as complete verification.
- [ ] Work through the prioritized review queue; never bypass site access restrictions or invent prices for blocked providers.
- [ ] Recheck any offer after its terms or price change; run catalog validation and browser tests before publishing.
- [ ] Confirm at least ten diverse representative checkout examples against the switching calculator, including family pricing, annual renewals, postpaid credits, trade-in conditions and deferred phone-payment schedules.

### Customer experience and support

- [ ] Conduct real phone/browser tests with at least two mobile operating systems, keyboard and screen-reader navigation, slow connections and nontechnical users.
- [ ] Verify users understand that $5 monthly equivalent might require $60 up front, a $0 phone still requires paid wireless service, and saved watchlists do not provide off-site notifications.
- [ ] Set up a private business contact/support mechanism. Do not request carrier transfer PINs, account numbers, phone numbers, or financial details through public GitHub issues.
- [ ] Monitor scanner outages and prioritize corrections with dated response records before advertising a support service level.

### Business identity, compliance and relationships — OWNER ACTION REQUIRED

- [ ] Choose and clear the business name, consider trademark availability, settle the legal entity, tax ID, banking and any needed local registration with qualified advice.
- [ ] Obtain independent legal/privacy/accessibility and advertising disclosure review before paid launch; verify eligibility for specific merchant/affiliate programs.
- [ ] Sign actual carrier/affiliate agreements. Never insert commission links or paid placement without authorized agreements.
- [ ] Keep a partner approval ledger: agreed destinations, commission terms, advertising limits, renewal/expiration dates, and approved compensation language.
- [ ] Clearly disclose any material affiliate relationships close to related links; never sell position in unpaid ranking as an independent best-value recommendation.
- [ ] If adding analytics pixels, account sync or email/push marketing, design explicit consent, data retention, security controls, unsubscribe and cost budgets first. Local-only watchlists must not silently upload user data.

## Go-to-market sequencing

**A. Private beta (current stage):** Validate savings calculations, user understanding, and site accessibility; share privacy-safe reports and collect voluntary feedback without invented savings guarantees.

**B. Evidence-led public launch:** Manually verify a credible core of the catalog and publish the date, source and offer limitations. Write substantive network/carrier guides based on actual research rather than thin automatically generated SEO pages.

**C. Monetization:** Once legal identity and agreements are established, activate only approved referral links with clear adjacent disclosures and independent price-based ranking. Do not imply carrier endorsement or partnership that does not exist.

**D. Scale:** Measure useful outcomes with consent, improve comparisons, expand verified source coverage, and only add a backend for opt-in email/push notifications when demand and operating economics justify it.

## Do not overstate

This project has not demonstrated a registered legal business, partner relationships, full independent verification of all listings, guaranteed customer savings, or advertising compliance certification. These require real-world evidence and/or owner decisions. The site can be a useful consumer beta without claiming those milestones.

## Five Bars 2.8 — manually signed offer verification

The automated price checker cannot independently certify all carrier checkout conditions. The new owner-only GitHub Actions workflow makes it easier to record real human reviews without opening a JSON editor.

To use: open the Five Bars GitHub repository, select Actions, choose Five Bars - human offer terms sign-off, then Run workflow on main.

- Verification: select operation verify, enter the exact ID from site/data/deals.json, an official carrier HTTPS source URL, and the exact attestation I_HAVE_PERSONALLY_CHECKED_ALL_OFFER_TERMS. Use this ONLY after personally checking the rate, taxes, fees, eligibility, prepayment, number transfer, rebates, financing and unlock terms.
- Invalidation: select operation invalidate, enter the offer ID and the exact attestation I_CONFIRM_THIS_REVIEW_MUST_BE_INVALIDATED. No evidence URL is needed.
- The workflow checks inputs and official carrier domain, runs tests, commits the signed review ledger and records the GitHub initiator in the commit history. That commit triggers normal site publication.
- Full-terms verification becomes stale after 14 days and is invalidated by material price/term changes including annual upfront billing.
- A reachable page or matching promotional headline NEVER establishes full-terms verification. The workflow does not browse a carrier page or perform the human review for you. Do not enter private customer information in GitHub Actions.

See BUSINESS_READINESS.md for remaining business launch and advertising conditions.

## Five Bars 2.9 — Four evidence-labelled carrier comparisons and a review workbench

The website now links to a static, search-friendly carrier-comparison hub: https://gcd231983.github.io/five-bars/carrier-comparisons.html. Its four deliberately curated editorial guides are:

- US Mobile vs Visible: catalog regular pricing, underlying network choices and data/eligibility questions.
- Tello vs Mint Mobile: monthly and introductory rates versus possible multi-month prepaid commitments.
- Cricket vs H2O Wireless: AT&T-network choices, annual upfront billing and restricted handset promotions.
- Visible vs Total Wireless: Verizon-network options and line/plan requirements.

These are useful comparison starting points, NOT independently verified checkout quotes, best-deal awards, affiliate endorsements, or claims of exhaustive carrier analysis. Pages display catalog reference date, most recent source-scan date, official carrier links, full-term review status and partial evidence scope. A known official price conflict withholds the relevant catalog amount rather than silently publishing disputed savings.

The generator at scripts/build-comparisons.mjs and editorial text source scripts/comparison-pages.mjs create complete static HTML pages with canonical URLs, descriptive metadata and a curated sitemap. The GitHub daily source scan re-generates them on each run. Price baselines omit promotional eligibility discounts and show full annual prepayment amounts. Only a deliberately edited guide configuration can add a new pair, which avoids mass-producing thin SEO pages.

### Public read-only editor review workbench

Reviewers may open https://gcd231983.github.io/five-bars/review-workbench.html from the Sources tab. The workbench is noindex and excluded from the sitemap. It loads the current ranked review queue, 78-offer catalog, and signed review ledger; supports priority, carrier, kind and verification-state filters; and links the official offer and the protected GitHub sign-off workflow.

Each item includes a full-terms worksheet covering rate, promotion, tax, prepayment, financing, carrier network/phone compatibility, high-speed/hotspot/roaming and unlock requirements. A checked box is never a verification record. Copying a worksheet stores nothing on the server; official human attestation remains controlled by the existing GitHub Actions workflow and the human's actual inspection.

### Running and testing

- Run node scripts/build-comparisons.mjs to refresh editorial pages and the sitemap after catalog or verification updates.
- Run node --test tests/*.test.mjs to exercise output safety, actual regular vs annual catalog pricing, conflict holds, review signature validity and sitemap inclusion.
- GitHub PR browser checks automatically generate pages first and test mobile/desktop widths, no-JavaScript static HTML tables, official source links and editor filters.
- GitHub Pages deployment still runs on main, without paid AI, a backend, visitor account, affiliate links or tracking pixels.

Commercial readiness still depends on actual dated human full-terms reviews and documented partner agreements (see BUSINESS_READINESS.md). These pages should be used for beta testing and legitimate educational search discovery, not claims of verified promotions.

## Real publisher programs researched (not activated)

See AFFILIATE_PIPELINE.md for current official program references and application requirements. The published programs include Tello (CJ), US Mobile (Impact), and Mint Mobile (Impact). Mint lists traffic/follower criteria; none has approved this site. The commercial launch still requires business decisions and signed partner terms. No commission-bearing links or visitor tracking were added.

## Five Bars 3.0 — Dated official-source research and catalog corrections (2026-11-02)

A targeted public-source audit now records **twelve** plan rate baselines from official carrier pages and broadband labels, with real source URLs, observed standard rates, confirmed public facts and unresolved checkout questions. The 78-offer catalog has **66 offers without this first-level research** and **zero** documented independent human full-terms sign-offs. Nothing has been falsely marked verified.

**Public evidence report:** https://gcd231983.github.io/five-bars/source-research.html
**Research source ledger:** `site/data/research-evidence.json`
**Generated coverage inventory:** `site/data/research-audit.json`
**Detailed editorial report:** `OFFICIAL_SOURCE_AUDIT.md`

**Important correctness fixes:** Mint Unlimited's $30 monthly equivalent requires **$360 prepaid annually** at the regular 12-month renewal price; an eligible new-customer $180 introductory annual offer is separate and is NOT assumed. Unverified multi-line annual plans no longer appear as if they were ordinary monthly family payments. US Mobile network-dependent hotspot and streaming caveats, Visible network-specific video/hotspot tiers, Tello's dated promotion restrictions and Cricket's in-store activation/AutoPay details are now described more accurately.

The static evidence report and edited carrier comparison pages refresh with existing no-AI GitHub Actions, but the November 2 observation date remains fixed until new carrier research is actually conducted. The report marks research **aged after 21 days** and flags catalog rates or annual prepayments that diverge from the dated official record. These public source matches are NOT final checkout validation. The editor workbench now shows each researched offer's official sources and outstanding customer-specific questions.

Next: complete real checkout and human full-terms reviews before calling any offer fully verified, and expand the published-source audit beyond the first 12 plans. Do not apply affiliate tracking or claim paid-partner relationships until agreements and disclosures are approved.


## Five Bars 3.1 — first-bill accuracy and official rate coverage (November 2, 2026)

The Total Wireless MAX 5G BYO plan now models a $30 first bill and $20/month afterward with qualifying AutoPay. Estimated service total: $250 over 12 months, $490 over 24, and $730 over 36, before unrecorded taxes, fees, or eligibility changes. First-month source terms invalidate prior manual signatures if changed. There are now 15 dated published plan-baseline records and 63 other listings lacking this first-level research. All 78 require customer-specific checkout/full-terms verification before claiming a verified catalog. Boost Pixel 10a online and in-store advance-payment requirements must not be conflated.


## Five Bars 3.3 — researched conditional device headlines

Official-publication source coverage now includes 15 wireless plan rates and five additional conditional device offers, for 20/78 recorded public-source findings (58 without first-level research). Documented handset rates, first bills, required prepaid service, number-transfer conditions and delayed rewards are audited separately. Switch & Save now pauses when a dated device-source finding conflicts with current catalog payment fields. These checks remain limited to conditional public advertisements. Human checkout/full-terms reviews are still 0/78, and no commercial partner approval or guaranteed savings are asserted.


## Five Bars 3.4 — financing quote holds and stronger source coverage (November 2, 2026)

- Three postpaid phone promotion records (T-Mobile, Verizon, AT&T) lack the device's gross retail balance/installment agreement. Their $0 or discounted *headline* is no longer turned into a bogus upfront or 12-, 24- or 36-month savings estimate in the legacy list, guided finder, comparison or Switch & Save.
- The Visible iPhone 18 Pro program is annotated **full retail purchase required**, with $20 monthly conditional service credits for up to 24 months; those future credits remain outside guaranteed cost and savings totals. Material credit and payment-method conditions invalidate a matching published source record if edited.
- Dated public source research includes three additional Boost online device headlines and the Visible retail-only offer: 24 of 78 research records (15 plans, nine devices). 54 still lack first-level research; all 78 still lack human checkout/full-term signatures.
- Buyer-protection goal: require actual device retail price, installment term, down payment, plan requirement, credit schedule, trade-in eligibility and early-exit payoff before offering a numerical model on financed postpaid deals. No invented savings, affiliate proof or automatic promotion verification.

## Five Bars 3.5 — eligible-only promotions and source provenance

- New-line discounts no longer lower a default cost comparison without explicit visitor eligibility confirmation. This applies consistently across the main plans screen, guided finder, side-by-side comparison and Switch & Save. Carrier publication of a promotion does not make every shopper eligible.
- Correct Metro BYOP ($30 first, $25 subsequent qualifying AutoPay) and Premium ($65 first, $60 subsequent qualifying AutoPay) single-line plans; remove undocumented introductory pricing and unsupported initial family quotes.
- Correct Boost Unlimited taxes as extra and retain the six-month new-line price only when qualified; Red Pocket Plus/Premium one-month new-line offers have the same eligibility guard.
- Dated source coverage expands from 24 to **37 of 78** entries, including official H2O and Good2Go annual-prepay values, which must not be mistaken for monthly cash bills.
- The public cards now link directly to the dated official-source research, with an explicit **partial evidence, not checkout verified** label. Material source-research disagreements stop comparisons and legacy price cards.
- **Full checkout-reviewed count remains zero.** Further expansion, independent checkout documentation, complaints/contact paths, and affiliate disclosure review are still required before any verified deal claims or referral monetization.


## Five Bars 3.6 — port-in and prepaid promotional protections (November 2, 2026)

- Introductory **port-in discounts** no longer apply automatically to the legacy plans page, shared model, guided finder, or side-by-side comparison. The user must confirm eligible number transfer; "not sure" conservatively models ordinary service prices. The guided finder also withholds port-only handset recommendations until eligibility is positively confirmed. Switch & Save continues to require its own confirmation.
- Discovered and corrected a financially material mistake: Ultra's prepaid 3/6/12-month **effective** discounted rates were represented as payable monthly intro rates without cash paid upfront. Ultra Unlimited and 4GB now use the sourced **1-month** $49/$19 baselines; multi-month choices are descriptive only until a distinct paid-in-advance catalog model exists. Catalog validator rejects a prepayment promotion entered in the ordinary monthly `promo.text` field.
- Clarified Google Fi $35 as Essentials rather than Premium, Tracfone Auto-Refill/expired anniversary terms, Straight Talk regular $25 vs conditional $20 AutoPay offer, and Consumer Cellular recurring/activation extras.
- Extended official-source research from 37 to **45 of 78 listings** (36 plan baselines, nine phone headlines); only two service plans and 31 phone offers lack a dated source record. All 78 still need independent full checkout and customer eligibility reviews.
- Additional commercial readiness gate: model compulsory service fees and explicit AutoPay eligibility before calling estimates actual paid totals, or continue labeling them conservative **service-only** estimates. Do not monetize referrals as verified-price recommendations yet.


## Five Bars 3.7 — first-payment accuracy, recurring fees and checkout readiness

- Five selected one-line plans now have *conditional* payment-method rate fields. The default is each provider's documented non-discounted base price; selecting AutoPay/Auto-Refill/eBilling eligibility explicitly is required for the lower price. This is a **model assumption**, not verification of enrollment at checkout.
- Consumer Cellular 1GB now includes its published $5.00/month fixed provider fee components and $10 per-line activation in first payment and 12/24/36-month Switch & Save cashflow. Location-dependent taxes and unknown charges remain separate, and the offer is restricted to one line until multi-line provider fee rules are confirmed.
- Tracfone Freedom models $50 first month and $45 subsequent months only with documented eligible Auto-Refill, or $50 each cycle without it. Metro and Total distinct first-month bills continue to be counted once.
- Corrected unsupported $20 AutoPay pricing language for Straight Talk StraightSAVINGS. The selected $25 BYOP offer explicitly says it does NOT stack AutoPay; $29.88 physical SIM starter bundle is conditional on purchase channel. No promised $50 delayed device credit is subtracted from guaranteed cash.
- Official-source research count remains **45/78**, and **0/78** checkout/full-terms signatures are confirmed. This improvement corrects math/terms on dated sources; it does not claim comprehensive mandatory charges for other 73 listings or independently validated transactions.
- For monetization readiness, future per-offer checklists must include state- and ZIP-specific taxes, complete carrier and payment-processing fees, SIM/eSIM charges, first-service discount timing, required funding methods, activation channel and renewal pricing. Never advertise service estimates as checkout totals.


## Five Bars 3.8 — inventory-aware comparisons and official proof completion

- Corrected the highest-risk plan-name/billing mixup: Total ALL ACCESS vs Total MAX 5G, and Metro Moto G 2026's previously understated qualifying service plan and initial service month.
- Added eight source-checked public carrier-price records, raising partial research coverage to **53/78**. A source match is NOT a checkout signoff; **25** listings are unresearched and **0/78** fully reviewed.
- Introduced a **dated unavailable-inventory hold**: out-of-stock Mint Galaxy S26 FE, Cricket Galaxy S25 FE, Cricket razr 2025 and Cricket Galaxy A37 5G remain in the historical audit but cannot produce estimated buying costs, finder recommendations, compare actions or Switch & Save reports. Source and signed review checks include availability changes.
- The Mint Pixel 11's $579 *bundle* is now called out as **$399 device + $180 annual prepaid Unlimited**, not misrepresented as a $579 handset-only cost.
- The official audit shows current inventory holds and a deterministic high-priority remaining-research list. Research priority is a workflow aid, NOT an affiliate ranking or proof of customer eligibility.
- Next commercialization gates: inventory rechecks (with dated evidence), first/renewal billing by ZIP and channel, compulsory fee review, line-count eligibility, independent sign-offs with a responsible human and timestamp, complaint/price-reporting workflow, and clear affiliate/no-affiliate disclosures.

## Five Bars 3.9 — structured, scenario-specific checkout sign-off (November 2, 2026)

- A public carrier link and a typed attestation **no longer** earn a "manually checked" label. The GitHub owner workflow requires an actual carrier checkout/written quote, exact first and recurring cash totals including compulsory taxes/fees, renewal interval, minimum service commitment, eligibility and availability, plus ten manually checked material conditions.
- Review records must be attributable to the authenticated GitHub Actions actor and include only anonymized enumerated evidence. Arbitrary free text and unknown JSON keys are rejected to reduce accidental exposure of customer information.
- The public badge is explicitly tied to **one documented checkout scenario**; it is **not an all-customers eligibility claim**. A reviewed record expires after 14 days or on material catalog mutation; out-of-stock or expired offers are barred from sign-off.
- Financed postpaid devices additionally require documented retail amount, installment total and duration, bill-credit duration and early-exit exposure. **The existing device calculator still withholds all incomplete financing totals even if some promotional fields were reviewed.**
- Editors can prepare the checkout record from the read-only workbench, but **only** GitHub Actions with write access can save the ledger. No automated scan, local checklist, page visit, or generated sample can certify a deal.
- Current verified scenario records remain **0/78**; 53/78 have dated *partial* public-source observations and 25 are still missing those. This release adds safeguards and operational readiness, not customer testimonials, sales or affiliate authorization.


## Five Bars 4.0 — public reporting and editorial accountability (November 2, 2026)

- [x] Build a mobile-friendly correction assistant linked from plan/phone cards, audited source entries and comparison guides, with offer-ID preselection, required issue category, date, safe public URL and report draft.
- [x] Add a public GitHub issue form that emphasizes reader feedback is **unverified**, requires privacy acknowledgement and does not silently update pricing or make checkout-verified claims.
- [x] Define a repeatable editorial triage protocol for independently checking official selected terms, resolving source conflicts, correcting the catalog, running mobile/desktop tests and communicating outcomes without inventing a service-level promise.
- [x] Remove previous GitHub issue links that included free-text report bodies in URL parameters; the draft is copied locally and pasted only by an intentional visitor action.
- [ ] Provide a **private, no-GitHub-account** contact channel for ordinary consumers once the owner selects a provider and funds/approves moderation, privacy, retention and abuse controls. No mailbox, live support or response-time guarantee is invented.
- [ ] Complete at least ten independently reviewed real checkout scenarios across carriers, tax regions and service terms. A GitHub reader issue is not a customer-specific quote.
- [ ] Obtain actual partner contracts, owner-approved commercial identity and near-link material-connection disclosure before enabling commissions. The current site remains free of paid affiliate placements.


## Five Bars 4.1 — service-payment accuracy (November 2, 2026)

- [x] Expand dated partial source coverage to 65 of 78 listings; 13 remain without a complete first-level source record.
- [x] Prevent unconfirmed AutoPay discounts from lowering required phone-service cost estimates.
- [x] Separate a fixed initial prepaid service block from subsequent monthly modeling assumptions.
- [x] Enforce the Total A36 number-transfer condition and hold two additional Cricket promotions for inventory review.
- [x] Cover new payment fields in source-conflict checks, catalog validation and human-review signatures.
- [ ] Complete real, independently recorded checkout scenarios: still **0/78**.
- [ ] Establish the owner-selected private consumer support channel and actual partner agreements before commercial launch.

These changes improve source coverage and calculation behavior. They do not establish carrier-approved prices, a completed business launch or human review of customer-specific quotes.


## Five Bars 4.2 — new-line offer qualification and source rigor (November 2–3, 2026)

- [x] Record five additional **dated public carrier** handset observations: AT&T Prepaid moto g 2026, Verizon Prepaid Galaxy A17/Moto G Play, Verizon iPhone 16e, Mint Pixel 11, and Mint Galaxy S26 FE. Source coverage: **70 of 78** total offers; **eight** still lack a complete source record.
- [x] Correct the $45 Verizon Prepaid phone-service assumption. The selected free-phone promotion requires a NEW Unlimited line: $60 first service month, $50 subsequent monthly service only with confirmed Auto Pay; otherwise $60/month. The $45 tier is not the qualifying Unlimited plan.
- [x] Require positive new-line eligibility confirmation for affected device recommendation and savings calculations. Unsupported confirmation never produces a cheaper automatic purchase estimate.
- [x] Keep Mint's $579 and $480 device-plus-one-year bundles from double-charging included prepaid service; preserve the S26 FE inventory hold.
- [x] Exclude the expired $199 annual US Mobile plan baseline from Pixel 11 estimated cash. Current bundle service payment is **unknown**, not $0 or a guessed annual rate.
- [x] Bind new-line eligibility evidence to source-conflict detection and human checkout-signature validation; test unknown eligibility, selected billing, stock and residual unknown costs.
- [ ] Gather **real, independently observed full checkout evidence** under the owner-controlled sign-off flow. Count remains **0 of 78**; published carrier rates are not a confirmed customer quote.
- [ ] Complete first-level publication research for the **eight** remaining catalog offers; investigate retailer-specific and financed postpaid offers separately.
- [ ] Obtain private customer-support provider, terms/privacy approval and signed commercial partner contracts before commission-enabled launch.

No change in these public records establishes an actual checkout total, current customer eligibility, signed advertising contract, partner acceptance or affiliate revenue.

## Five Bars 4.3 — distinguish carrier evidence from retail-store promotions and installment credits

- [x] Replace the unsupported Cricket Walmart-SIM $25 monthly interpretation with the documented **$300 prepaid for 12 months** BYOD plan ($25/month equivalent), limited to one line; the former Walmart checkout claim was not corroborated.
- [x] Place the selected Walmart Verizon Galaxy A17, Walmart Straight Talk Galaxy A17 and Simple Mobile Galaxy A16 device headlines on explicit **retailer evidence holds**. They remain visible only as historical research leads, never as purchasable $0 cost/savings recommendations; they are not claimed out of stock.
- [x] Document conditional gross retail, installment duration and potential bill-credit ceilings for three iPhone 18 Pro financed offers. Unknown qualifying service remains **null**, rather than a fabricated $80 plan or $0 upfront total.
- [x] Add a partial official-source state for the three financed offers and the US Mobile Pixel 11 with missing annual-plan cash. Public-source research now covers **75 of 78** listings: **71 matched published baselines**, **4 partial device/headline records** with unpriced service, **3 retailer-specific listings still without sufficient first-party source research**.
- [x] Enforce holds in list estimates, finder, comparison, Switch & Save, signed checkout attestations, and source audits; preserve source/date/signature sensitivity and focused regression tests.
- [ ] Confirm exact store-specific device and required-service checkout for three held listings; obtain ZIP-specific activation, tax and payment-method totals for the other listings.
- [ ] Record actual checkout and full-terms evidence through the protected human review flow (**still 0 of 78**).
- [ ] Establish private support and execute actual partnership agreements before commercial revenue.

Neither a URL, publication, retailer result nor the visitor's eligibility checkbox is independent verification of the itemized checkout total.

## Five Bars 4.4 — separate retailer listing observations (November 2, 2026)

- [x] Add `site/data/retailer-evidence.json` for three held device offers with exact product links, observation dates, documented uncertainty and pending checkout requirements. **Retailer observations never count as carrier-published price matches or full checkout verification.**
- [x] Walmart's selected online Galaxy A17 pages were observed at $99.88 each; these **retailer-online product prices are not qualified $0 in-store activation prices**. Simple Mobile's dynamic page remains inconclusive; no numeric price is invented.
- [x] Require each retailer evidence record to map to the exact held catalog offer, its exact HTTPS URL, a valid observation date and a false `selectedPromotionVerified` status.
- [x] Keep all three offers excluded from estimated upfront costs, rankings, Switch & Save and human checkout certification; held entries are also excluded from the public **Free phone** filter and cannot be compared using the old $0 headline.
- [x] Render the observed retailer price and explicit channel mismatch within the public evidence audit, separated from carrier publications and checkout evidence.
- [ ] Obtain current, itemized proof for exact retailer-channel activation, qualifying plan, location-specific taxes, phone stock, unlock rules and actual first bill before lifting any of the three holds.
- [ ] Continue gathering human observed checkout records (still **0/78**) and verifying business agreements before commercial launch.

Published first-party retailer page observations are **not** a certification that the device is currently purchasable at that price, nor that activation, carrier plan, tax or customer eligibility matches a separate offer.
