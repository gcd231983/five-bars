// Five Bars decision helpers. Pure ESM shared by the website and Node tests.
// No AI, network calls, personal data collection, or paid APIs.

export const MAX_COMPARE = 3;
const DAY_MS = 86400000;

export function localDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const value = Date.parse(day + 'T12:00:00Z');
  return Number.isFinite(value) && new Date(value).toISOString().slice(0,10) === day;
}
export function pastEnd(date, today) {
  return validDay(date) && date < today;
}
export function usd(value) {
  return Number.isFinite(value) ? '$' + value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'Ask carrier';
}
export function offerSignature(offer) {
  // Evidence is invalidated if any material deal condition changes.
  const fields = ['id','carrier','plan','phone','net','os','price','planPrice','priceNote','promo',
    'family','maxLines','tax','pri','unl','data','hot','video','port','prepay','stay','bundle',
    'rebate','credit','creditMonths','postpaid','store','lock','ends','warn','note','url',
    'billingMonths','billingUpfront','firstMonthPrice','firstMonthPlanPrice','fullRetailRequired',
    'availability','availabilityObservedOn','listingHold','grossRetailPrice','financingMonths','maxBillCredits','newLineRequired','bundleRenewalUnverified','undiscountedPlanPrice','planDiscountCondition','prepaidServiceTotal',
    'undiscountedPrice','discountCondition','knownMonthlyFee','knownActivationFee','priceSourceDate'];
  return JSON.stringify(fields.map(key => [key, offer[key] === undefined ? null : offer[key]]));
}
// Anonymous, scenario-specific carrier checkout evidence. Never store billing
// credentials, subscriber details, transfer PINs or full checkout screenshots.
export const CHECKOUT_REVIEW_CHECKS = Object.freeze([
  'advertised_and_renewal_price',
  'upfront_service_device_prepayment',
  'all_mandatory_taxes_and_carrier_fees',
  'activation_sim_and_shipping_charges',
  'new_line_port_and_discount_eligibility',
  'minimum_service_term_and_renewal',
  'network_imei_esim_and_coverage',
  'data_hotspot_speed_and_roaming',
  'phone_lock_early_exit_and_credit_terms',
  'availability_and_offer_expiration'
]);
const cents=x=>Number.isSafeInteger(x)&&x>=0&&x<=10000000;
export function checkoutEvidenceIssues(offer,evidence,verifiedAt) {
  const issues=[];
  if(!offer||!evidence||typeof evidence!=='object'||Array.isArray(evidence))
    return ['An anonymized checkout evidence object is required'];
  const keys=['schema','channel','observedAt','lineCount','customerScenario','upfrontCents',
    'renewalCents','billingMonths','requiredServiceMonths','taxesAndFeesIncluded',
    'stockConfirmed','checks','financing'];
  if(Object.keys(evidence).some(key=>!keys.includes(key)))issues.push('Unknown checkout fields (personal identifiers are not allowed)');
  if(evidence.schema!==1)issues.push('Checkout evidence schema must be 1');
  if(!['official_online_checkout','carrier_written_quote'].includes(evidence.channel))
    issues.push('Select an official online checkout or written carrier quote');
  if(!validDay(evidence.observedAt)||evidence.observedAt!==verifiedAt)
    issues.push('Checkout observation date must match the manual review date');
  if(!Number.isInteger(evidence.lineCount)||evidence.lineCount<1||evidence.lineCount>5)
    issues.push('Line count must be 1 to 5');
  if(offer.phone&&evidence.lineCount!==1)
    issues.push('Phone quotes must describe one device, not an invented family bundle');
  if(offer.maxLines&&evidence.lineCount>offer.maxLines)
    issues.push('Selected line count exceeds the documented plan limit');
  if(!['new_line_port','new_line_no_port','existing_customer','not_required'].includes(evidence.customerScenario))
    issues.push('Specify the exact new-line/number-transfer customer scenario');
  if((offer.port===true||offer.promo?.req==='port')&&evidence.customerScenario!=='new_line_port')
    issues.push('The selected port promotion requires a matching port-in scenario');
  if((offer.promo?.req==='new'||offer.newLineRequired===true)&&!['new_line_port','new_line_no_port'].includes(evidence.customerScenario))
    issues.push('New-customer promotion requires a new-line scenario');
  if(!cents(evidence.upfrontCents)||!cents(evidence.renewalCents))
    issues.push('Enter actual initial and recurring quote amounts as integer cents');
  if(offer.billingMonths===12&&Number.isFinite(offer.billingUpfront)&&
     cents(evidence.upfrontCents)&&evidence.upfrontCents<Math.round(offer.billingUpfront*100))
    issues.push('A 12-month prepaid first payment cannot be below the catalog mandatory prepayment');
  if(offer.phone&&offer.postpaid!==true&&Number.isFinite(offer.price)&&
     cents(evidence.upfrontCents)&&evidence.upfrontCents<Math.round(offer.price*100))
    issues.push('An upfront handset or bundle quote cannot be below the catalog required cash price');
  if(offer.phone&&Number.isFinite(offer.prepaidServiceTotal)&&cents(evidence.upfrontCents)&&
     evidence.upfrontCents<Math.round((offer.price+offer.prepaidServiceTotal)*100))
    issues.push('The quote must include the handset and documented fixed prepaid service total');
  if(![1,12].includes(evidence.billingMonths)||
     (offer.billingMonths===12&&evidence.billingMonths!==12))
    issues.push('Renewal billing period must match the selected monthly or annual service');
  if(!Number.isInteger(evidence.requiredServiceMonths)||evidence.requiredServiceMonths<1||
     evidence.requiredServiceMonths>60||
     evidence.requiredServiceMonths<Math.max(1,Number(offer.prepay)||0,Number(offer.stay)||0,
       offer.billingMonths===12?12:1))
    issues.push('Document the full required prepaid or minimum service term');
  if(evidence.taxesAndFeesIncluded!==true)
    issues.push('All taxes and compulsory carrier charges must be included in the observed quote');
  if(offer.promo&&pastEnd(offer.promo.ends,verifiedAt))
    issues.push('An expired introductory promotion cannot receive a current checkout attestation; remove the expired promo before reviewing the regular plan');
  if(offer.listingHold)
    issues.push('This retailer-specific headline remains held for evidence review and cannot be checkout-attested');
  if(evidence.stockConfirmed!==true||offer.availability==='out_of_stock'||pastEnd(offer.ends,verifiedAt))
    issues.push('Offer must have confirmed available inventory and not be expired or held out of stock');
  if(!evidence.checks||typeof evidence.checks!=='object'||Array.isArray(evidence.checks)||
     Object.keys(evidence.checks).length!==CHECKOUT_REVIEW_CHECKS.length||
     CHECKOUT_REVIEW_CHECKS.some(key=>evidence.checks[key]!==true))
    issues.push('Every material pricing, eligibility, device and early-exit checklist item must be checked');
  if(offer.postpaid===true){
    const f=evidence.financing;
    if(!f||typeof f!=='object'||Array.isArray(f)||
      Object.keys(f).sort().join(',')!=='creditMonths,earlyExitExposureCents,installmentMonths,retailDeviceCents,totalInstallmentsCents'||
      !cents(f.retailDeviceCents)||!cents(f.totalInstallmentsCents)||
      !cents(f.earlyExitExposureCents)||!Number.isInteger(f.installmentMonths)||
      f.installmentMonths<1||f.installmentMonths>48||
      !Number.isInteger(f.creditMonths)||f.creditMonths<0||f.creditMonths>48)
      issues.push('Financed devices require explicit retail balance, installments, credit term and early-exit exposure');
  }else if(evidence.financing!==undefined&&evidence.financing!==null){
    issues.push('Do not attach postpaid financing fields to a non-financed offer');
  }
  return issues;
}

// An automated link request is NOT offer, price, eligibility or checkout verification.
// Favor neutral/uncertain states if the last scan is missing, stale, or malformed.
export function offerLinkCheck(offerId,snapshot,now=Date.now()){
  const observed=Date.parse(snapshot?.generatedAt||'');
  const instant=now instanceof Date?now.getTime():now;
  if(!Number.isFinite(observed)||!Number.isFinite(instant))
    return {state:'unknown',label:'Link-check status unavailable'};
  const age=instant-observed;
  if(age< -5*60000||age>48*3600000)
    return {state:'stale',label:'Offer-link scan outdated'};
  const entries=snapshot?.offers;
  const link=entries&&Object.hasOwn(entries,offerId)?entries[offerId]:null;
  if(link?.state==='source_unavailable')
    return {state:'unavailable',label:'Offer link not checked automatically'};
  if(link?.state==='source_reachable')
    return {state:'reachable',label:'Link responded; checkout unverified'};
  return {state:'unknown',label:'Offer-link check not available'};
}

export function verificationState(offer, record, today = localDay()) {
  if (!record || typeof record !== 'object') return {status:'unverified',label:'Offer not independently verified'};
  if (record.scope !== 'full_terms') {
    return {status:'unverified',label:'Offer not independently verified'};
  }
  if (record.signature !== offerSignature(offer)) {
    return {status:'changed',label:'Terms changed since last review'};
  }
  if (!validDay(record.verifiedAt) || record.verifiedAt > today || typeof record.evidenceUrl !== 'string' ||
      !/^https:\/\//.test(record.evidenceUrl) || record.method!=='anonymized_human_checkout_quote' ||
      !/^[a-z0-9-]{1,39}$/i.test(record.reviewerActor||'') ||
      checkoutEvidenceIssues(offer,record.checkout,record.verifiedAt).length) {
    return {status:'unverified',label:'Structured checkout evidence incomplete'};
  }
  const age = Math.floor((Date.parse(today + 'T12:00:00Z') - Date.parse(record.verifiedAt + 'T12:00:00Z')) / DAY_MS);
  if (age > 14) return {status:'stale',label:'Last reviewed ' + record.verifiedAt + '; recheck pricing'};
  return {status:'verified',label:'Human checkout scenario reviewed ' + record.verifiedAt,
    verifiedAt:record.verifiedAt,checkoutScenario:record.checkout.customerScenario,
    lineCount:record.checkout.lineCount};
}
export function planCost(plan, count = 1, options = {}) {
  const lines = Math.max(1,Math.min(5,Math.trunc(Number(count)) || 1));
  // Direct callers cannot fabricate a family quote for a one-line-only offer.
  if(plan.maxLines && lines>plan.maxLines)return null;
  const today = options.today || localDay();
  // Discounted catalog headlines are conditional, not the default price.
  const discountOffered=Number.isFinite(plan.undiscountedPrice)&&!!plan.discountCondition;
  const discountQualified=!discountOffered||options.discountQualified===true;
  const regularSingle=Number(discountQualified?plan.price:plan.undiscountedPrice);
  if (!Number.isFinite(regularSingle) || regularSingle < 0) return null;
  const knownMonthlyFee=Number.isFinite(plan.knownMonthlyFee)?plan.knownMonthlyFee:0;
  const knownActivationFee=Number.isFinite(plan.knownActivationFee)?plan.knownActivationFee:0;
  // Annual-prepaid amounts are per recorded offer and must NEVER be treated as
  // monthly billing for an assumed multi-line household. Until a documented
  // family-wide annual prepayment exists, these offers are one-line quotes.
  if (plan.billingMonths===12 &&
    (lines!==1 || !Number.isFinite(plan.billingUpfront) || plan.billingUpfront<=0))return null;
  const family = lines > 1 && plan.family ? plan.family[String(lines)] : null;
  const familyKnown = lines === 1 || (typeof family === 'number' && Number.isFinite(family) && family >= 0);
  const regular = familyKnown && lines > 1 ? family : regularSingle;
  const promo = plan.promo;
  const promoAllowedLines = lines === 1 || (promo?.familyEligible === true) ||
    (typeof promo?.family?.[String(lines)] === 'number');
  const introAvailable = !!promo && !pastEnd(promo.ends,today) &&
    !(promo.req==='port' && (options.canPort!==true || options.cannotPort===true)) &&
    !(promo.req === 'new' && options.newCustomer !== true) &&
    !(promo.autopayRequired===true && options.discountQualified!==true) &&
    promoAllowedLines && Number.isFinite(promo.price) && Number.isInteger(promo.months) && promo.months > 0;
  const intro = introAvailable && lines > 1 && promo.family && typeof promo.family[String(lines)] === 'number'
    ? promo.family[String(lines)] : promo?.price;
  const discounted = introAvailable ? Math.min(regular,intro) : regular;
  const introMonths = introAvailable ? Math.min(12,promo.months) : 0;
  const knownMonthlyFeeTotal=knownMonthlyFee*lines;
  const knownActivationFeeTotal=knownActivationFee*lines;
  const monthTotal=discounted*lines+knownMonthlyFeeTotal;
  const regularMonthTotal=regular*lines+knownMonthlyFeeTotal;
  const annual = plan.billingMonths===12 && Number.isFinite(plan.billingUpfront) && plan.billingUpfront>0 && lines===1;
  // A documented first month is charged once, not as a recurring monthly rate.
  const firstMonthAdjusted=!annual && lines===1 && Number.isFinite(plan.firstMonthPrice) && plan.firstMonthPrice>=0;
  const firstMonthDue=firstMonthAdjusted?plan.firstMonthPrice:discounted;
  const year=annual?plan.billingUpfront:(discounted*introMonths+regular*(12-introMonths))*lines+
    (firstMonthAdjusted?firstMonthDue-discounted:0)+knownMonthlyFeeTotal*12+knownActivationFeeTotal;
  const upfrontDue=annual?plan.billingUpfront:
    (firstMonthAdjusted?firstMonthDue:discounted*lines)+knownMonthlyFeeTotal+knownActivationFeeTotal;
  return {lines,nowPerLine:discounted,regularPerLine:regular,monthTotal,regularMonthTotal,year,
    upfrontDue,firstMonthAdjusted,firstMonthDue,billingMonths:annual?12:1,annualPrepaid:annual,
    knownMonthlyFeeTotal,knownActivationFeeTotal,discountQualified,
    conditionalDiscountUnconfirmed:discountOffered&&!discountQualified,
    discountCondition:plan.discountCondition||null,
    promoUsed:introAvailable,familyKnown,estimatedFamilyPrice:!familyKnown,
    promoFamilyUnconfirmed:lines>1 && !!promo && !promoAllowedLines,
    promoSuppressedForNoPort:!!promo && !!options.cannotPort && promo.req==='port',
    promoSuppressedForUnconfirmedPort:!!promo && promo.req==='port' &&
      (options.canPort!==true || options.cannotPort===true),
    promoSuppressedForNotNew:!!promo && promo.req==='new' && options.newCustomer!==true,
    promoSuppressedForUnconfirmedAutopay:!!promo && promo.autopayRequired===true && options.discountQualified!==true};
}
export function phoneCost(phone, options = {}) {
  if(phone.listingHold)return {due:null,commitment:null,year:null,netDevice:null,
    listingHold:true,planPrice:null,conditionalRewardsExcluded:true};
  if(phone.availability==='out_of_stock')return {due:null,commitment:null,year:null,
    netDevice:null,unavailable:true,financingUncertain:false,planPrice:null,
    firstMonthPlanPrice:null,conditionalRewardsExcluded:true};
  const price=Number(phone.price);
  if(!Number.isFinite(price)||price<0)return null;
  const conditional=Number.isFinite(phone.undiscountedPlanPrice)&&phone.planDiscountCondition==='autopay';
  const discountQualified=!conditional||options.discountQualified===true;
  const plan=phone.planPrice==null?null:Number(discountQualified?phone.planPrice:phone.undiscountedPlanPrice);
  const validPlan=Number.isFinite(plan)&&plan>=0?plan:null;
  // A postpaid promotional headline can be net of years of bill credits.
  // Without retail/installment/credit-loss terms a cash quote is misleading.
  if(phone.postpaid===true)return {due:null,commitment:null,year:null,netDevice:null,
    financingUncertain:true,planPrice:validPlan,firstMonthPlanPrice:null,
    prepay:Math.max(0,Number(phone.prepay)||0),stay:Math.max(0,Number(phone.stay)||0),
    conditionalRewardsExcluded:true};
  if(phone.newLineRequired===true && options.newCustomer!==true)
    return {due:null,commitment:null,year:null,netDevice:price,planPrice:validPlan,
      requiresNewLine:true,conditionalRewardsExcluded:true};
  const prepay=Math.max(0,Number(phone.prepay)||0);
  const stay=Math.max(0,Number(phone.stay)||0);
  const bundle=Math.max(0,Number(phone.bundle)||0);
  const first=validPlan===null?null:(Number.isFinite(phone.firstMonthPlanPrice)?
    Number(phone.firstMonthPlanPrice):validPlan);
  if(first!==null && first<0)return null;
  // Conditional rebates and monthly credits are NOT cash received at checkout
  // and are excluded from due, commitment, year and recommendation rankings.
  const prepaidMonths=Math.max(1,prepay);
  const minimumMonths=Math.max(1,prepay,stay);
  const prepaidService=Number.isFinite(phone.prepaidServiceTotal)?phone.prepaidServiceTotal:
    validPlan===null?null:first+validPlan*(prepaidMonths-1);
  const due=bundle?price:prepaidService===null?null:price+prepaidService;
  const commitment=bundle?price:validPlan===null?null:price+prepaidService+validPlan*(minimumMonths-prepaidMonths);
  const year=bundle?(bundle>=12?price:validPlan===null?null:price+validPlan*(12-bundle)):
    (validPlan===null?null:price+prepaidService+validPlan*(12-prepaidMonths));
  return {due,commitment,year,netDevice:price,financingUncertain:!!phone.postpaid,
    planPrice:validPlan,firstMonthPlanPrice:first,prepay,stay,
    conditionalDiscountUnconfirmed:conditional&&!discountQualified,discountQualified,
    conditionalRewardsExcluded:!!(Number(phone.rebate)>0||Number(phone.credit)>0)};
}
function networkOK(net, preference) {
  return !preference || preference==='any' || net===preference || net==='multi';
}
function trustworthySort(a,b) {
  // Known household pricing should sort ahead of extrapolated one-line prices.
  if (!!a.uncertain !== !!b.uncertain) return a.uncertain ? 1 : -1;
  return (a.year ?? Infinity) - (b.year ?? Infinity);
}
export function rankMatches(catalog, preferences = {}, today = localDay()) {
  const lines = Math.min(5,Math.max(1,Number(preferences.lines)||1));
  const budget = Number(preferences.budget);
  const hasBudget = preferences.budget !== '' && preferences.budget !== null &&
    preferences.budget !== undefined && Number.isFinite(budget) && budget >= 0;
  const network = preferences.network || 'any';
  const cannotPort = !!preferences.cannotPort;
  const canPort = preferences.canPort===true && !cannotPort;
  const unconfirmedPhonePorts=(catalog.phones||[]).filter(d=>d.port===true && d.availability!=='out_of_stock' && !canPort).length;
  const unavailablePhones=(catalog.phones||[]).filter(d=>d.availability==='out_of_stock').length;
  const unconfirmedNewLines=(catalog.phones||[]).filter(d=>d.newLineRequired===true&&d.availability!=='out_of_stock'&&preferences.newCustomer!==true).length;
  const plans = (catalog.plans || [])
    .filter(p => networkOK(p.net,network) && (!preferences.provider || preferences.provider==='any' || p.carrier===preferences.provider) && (!p.maxLines || lines<=p.maxLines) &&
      (!preferences.priority || p.pri===true) && (!preferences.hotspot || !!p.hot))
    .map(p => {
      const cost = planCost(p,lines,{today,cannotPort,canPort,newCustomer:preferences.newCustomer===true,
        discountQualified:preferences.discountQualified===true});
      return cost && {type:'plan',id:p.id,offer:p,cost,year:cost.year,
        uncertain:cost.estimatedFamilyPrice};
    }).filter(Boolean)
    .filter(item=> !hasBudget || item.cost.regularMonthTotal <= budget)
    .sort(trustworthySort);
  const phones = (catalog.phones || [])
    .filter(d => networkOK(d.net,network) &&
      (!preferences.provider || preferences.provider==='any' || d.carrier===preferences.provider) &&
      !pastEnd(d.ends,today) && d.availability!=='out_of_stock' && !d.listingHold && !(d.port && !canPort) &&
      !(d.newLineRequired===true && preferences.newCustomer!==true) &&
      !(d.prepay>0 && !Number.isFinite(d.planPrice) && !d.bundle))
    .map(d => {
      const cost = phoneCost(d,{discountQualified:preferences.discountQualified===true,
        newCustomer:preferences.newCustomer===true});
      return cost && {type:'phone',id:d.id,offer:d,cost,year:cost.year,
        uncertain:lines>1 || cost.year===null || cost.financingUncertain};
    }).filter(Boolean)
    // A device deal is quoted per handset, not as a made-up family bundle.
    .filter(item=> !hasBudget || lines>1 || item.cost.planPrice===null || item.cost.planPrice <= budget)
    .sort(trustworthySort);
  return {
    plans: plans.slice(0,5),phones: phones.slice(0,5),
    planMatches:plans.length,phoneMatches:phones.length,lines,
    messages:[
      ...(lines>1 ? ['Phone offers are priced per device; do not treat them as a multi-line household quote.'] : []),
      ...(lines>1 && hasBudget ? ['Your household budget is not applied to per-device phone offers because qualifying family pricing is unknown.'] : []),
      ...(plans.some(x=>x.cost.estimatedFamilyPrice) ?
        ['Some plans have no published multi-line price. Those figures extrapolate the one-line rate.'] : []),
      ...(plans.some(x=>x.cost.promoFamilyUnconfirmed) ?
        ['Introductory discounts are excluded for multiple lines unless family eligibility is explicitly recorded.'] : []),
      ...(plans.some(x=>x.cost.promoSuppressedForUnconfirmedPort) ?
        ['Port-in introductory discounts are excluded until you confirm you can transfer an eligible number.'] : []),
      ...(unconfirmedNewLines>0 ?
        [unconfirmedNewLines+' new-line-only device promotion(s) are excluded until you explicitly confirm eligible new activation. They remain browsable in Phone Deals.'] : []),
      ...(unavailablePhones>0 ?
        [unavailablePhones+' phone promotion(s) observed out of stock are excluded from recommendations and savings estimates.'] : []),
      ...(unconfirmedPhonePorts>0 ?
        ['Port-in-only phone promotions are excluded from recommendations until you confirm number-transfer eligibility. You can still browse them under Phone Deals.'] : []),
      ...(plans.some(x=>x.cost.promoSuppressedForUnconfirmedAutopay)?
        ['AutoPay-required introductory prices are excluded until you confirm the carrier payment enrollment condition.'] : []),
      ...(plans.some(x=>x.cost.conditionalDiscountUnconfirmed)?
        ['AutoPay, Auto-Refill or AutoPay + eBilling discounts are excluded until you confirm all required enrollment conditions.'] : []),
      ...(plans.some(x=>x.cost.knownMonthlyFeeTotal>0||x.cost.knownActivationFeeTotal>0)?
        ['Published fixed provider fees and activation costs are included where documented; government taxes and other unknown charges remain excluded.'] : []),
      ...(plans.some(x=>x.cost.promoSuppressedForNotNew) ?
        ['New-customer introductory discounts are excluded until you explicitly confirm eligibility.'] : []),
      ...(plans.some(x=>x.cost.annualPrepaid) ?
        ['Annual prepaid plans require the full year payment upfront. The advertised monthly figure is an effective equivalent, not monthly billing.'] : []),
      ...(plans.some(x=>x.cost.firstMonthAdjusted) ?
        ['Documented first-month charges are included in upfront and first-year modeled amounts.'] : [])
    ],
  };
}
export function normalizeCompare(items, catalog, today=localDay()) {
  const entries = Array.isArray(items) ? items : [];
  const taken = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || !['plan','phone'].includes(entry.type) || typeof entry.id!=='string') continue;
    if (result.length >= MAX_COMPARE) break;
    if (result.length && entry.type!==result[0].type) continue;
    const found = (entry.type==='plan' ? catalog.plans : catalog.phones || []).find(p=>p.id===entry.id);
    // Restoring local browser storage must enforce the SAME safeguards that
    // prevent shoppers adding held, out-of-stock or expired devices directly.
    // An expired PLAN intro is different: the standard plan still exists.
    if (!found || taken.has(entry.id) || (entry.type==='phone' &&
      (pastEnd(found.ends,today)||found.listingHold||found.availability==='out_of_stock'))) continue;
    taken.add(entry.id);
    result.push({type:entry.type,id:entry.id});
  }
  return result;
}

/**
 * Relative, price-only comparison of the currently selected offers.
 * This is NOT a carrier checkout or a "best plan" recommendation: plans
 * may have different data allowances and networks. Skip highlights when
 * any quote is missing, financing is unknown or household prices are
 * extrapolated. Eligibility uses the exact same calculator as the cards.
 */
export function comparisonPriceOverview(type,offers,lines=1,eligibility={},today=localDay()){
  if(!['plan','phone'].includes(type)||!Array.isArray(offers)||
      offers.length<2||offers.length>MAX_COMPARE)return null;
  const cost=offers.map(offer=>{
    if(!offer||typeof offer!=='object')return null;
    if(type==='phone' &&
      (pastEnd(offer.ends,today)||offer.listingHold||offer.availability==='out_of_stock'))return null;
    return type==='plan'?planCost(offer,lines,{...eligibility,today}):phoneCost(offer,eligibility);
  });
  if(cost.some(c=>!c||!Number.isFinite(c.year)||c.year<0||
      c.estimatedFamilyPrice||c.promoFamilyUnconfirmed||c.financingUncertain||
      c.listingHold||c.unavailable||c.requiresNewLine))return null;
  const values=cost.map(c=>c.year);
  const lowest=Math.min(...values),highest=Math.max(...values);
  const cheapestIndices=values.flatMap((value,i)=>value===lowest?[i]:[]);
  return {lowest,highest,range:highest-lowest,cheapestIndices,
    tied:cheapestIndices.length>1};
}
