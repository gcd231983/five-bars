// Editorial selection for TEN distinct checkout scenarios, not ten verified offers.
// Each scenario requires a real, current itemized carrier checkout or written quote.
// Catalog and human-review ledger remain the only sources for price and sign-off state.
// An expired promotion or unsupported purchase path must NOT be rubber-stamped.
export const LAUNCH_REVIEW_SCENARIOS=Object.freeze([
  Object.freeze({
    id:'visible',goal:'Standard single-line monthly BYOD plan',
    check:'Confirm recurring service, taxes, payment method requirements, and renewal price.',
    caution:'An advertised base rate is not a customer-specific checkout total.'
  }),
  Object.freeze({
    id:'usm-starter',goal:'Household plan with two lines',
    check:'Quote two eligible lines; confirm each line’s monthly cost, network selection, taxes, and activation.',
    caution:'Do not apply the separate single-line port-in promotion to two lines without explicit carrier proof.'
  }),
  Object.freeze({
    id:'tello',goal:'New-line introductory promotion and deadline',
    check:'If the promotion is still active, confirm the new-line requirement, deadline, intro months, renewal and taxes.',
    caution:'After the published promotion ends, review only a current standard-plan quote; never approve expired intro terms.'
  }),
  Object.freeze({
    id:'mint',goal:'Annual prepayment versus monthly equivalent',
    check:'Record the full twelve-month upfront payment, taxes, renewal amount, and whether intro pricing applies.',
    caution:'The monthly equivalent is not a monthly bill. Never use an unconfirmed introductory annual discount.'
  }),
  Object.freeze({
    id:'cricket-25',goal:'Annual prepaid BYOD with activation conditions',
    check:'Confirm the full annual charge, qualifying new-line/BYOD status, fees, future renewal, and device compatibility.',
    caution:'Do not treat a retailer SIM headline as a carrier-approved monthly billing arrangement.'
  }),
  Object.freeze({
    id:'cc',goal:'Monthly plan with separate known carrier fees',
    check:'Confirm recurring provider charges, one-time activation, taxes and the full first payment.',
    caution:'The presence of a catalog fee is not proof that all location-specific fees are known.'
  }),
  Object.freeze({
    id:'boost-p10a',goal:'Discounted device with required months of future service',
    check:'Verify the selected online purchase path, phone price, first payment, AutoPay conditions and minimum service commitment.',
    caution:'Do not count future required months as immediate prepayment; do not mix online and store-only terms.'
  }),
  Object.freeze({
    id:'cricket-16e',goal:'Advertised zero-dollar phone with prepaid service',
    check:'Confirm eligible transfer, mandatory prepaid service months, activation, taxes, locking and early-exit rules.',
    caution:'A $0 advertised device still has a nonzero service checkout; do not promise a free transaction.'
  }),
  Object.freeze({
    id:'vzpre-a17',goal:'New-line-only phone with a different first-month bill',
    check:'Confirm eligible new activation, exact handset, first service price, future plan price and all fees.',
    caution:'A current-line upgrade or an alternative service tier is not evidence of qualifying new-line pricing.'
  }),
  Object.freeze({
    id:'vz-18pro',goal:'Financed device with conditional monthly bill credits',
    check:'Obtain gross retail balance, all installments, conditional credits, required plan, tax and cancellation exposure.',
    caution:'Do not sign off a $0 net device headline as zero checkout; withhold totals until a complete quote exists.'
  })
]);
export const LAUNCH_REVIEW_IDS=Object.freeze(LAUNCH_REVIEW_SCENARIOS.map(s=>s.id));
export const LAUNCH_REVIEW_BY_ID=new Map(LAUNCH_REVIEW_SCENARIOS.map(s=>[s.id,s]));
