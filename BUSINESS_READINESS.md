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
