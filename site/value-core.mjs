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
    'availability','availabilityObservedOn',
    'undiscountedPrice','discountCondition','knownMonthlyFee','knownActivationFee','priceSourceDate'];
  return JSON.stringify(fields.map(key => [key, offer[key] === undefined ? null : offer[key]]));
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
      !/^https:\/\//.test(record.evidenceUrl)) {
    return {status:'unverified',label:'Review evidence incomplete'};
  }
  const age = Math.floor((Date.parse(today + 'T12:00:00Z') - Date.parse(record.verifiedAt + 'T12:00:00Z')) / DAY_MS);
  if (age > 14) return {status:'stale',label:'Last reviewed ' + record.verifiedAt + '; recheck pricing'};
  return {status:'verified',label:'Manually checked ' + record.verifiedAt,verifiedAt:record.verifiedAt};
}
export function planCost(plan, count = 1, options = {}) {
  const lines = Math.max(1,Math.min(5,Math.trunc(Number(count)) || 1));
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
    promoSuppressedForNotNew:!!promo && promo.req==='new' && options.newCustomer!==true};
}
export function phoneCost(phone) {
  if(phone.availability==='out_of_stock')return {due:null,commitment:null,year:null,
    netDevice:null,unavailable:true,financingUncertain:false,planPrice:null,
    firstMonthPlanPrice:null,conditionalRewardsExcluded:true};
  const price=Number(phone.price);
  if(!Number.isFinite(price)||price<0)return null;
  const plan=phone.planPrice==null?null:Number(phone.planPrice);
  const validPlan=Number.isFinite(plan)&&plan>=0?plan:null;
  // A postpaid promotional headline can be net of years of bill credits.
  // Without retail/installment/credit-loss terms a cash quote is misleading.
  if(phone.postpaid===true)return {due:null,commitment:null,year:null,netDevice:null,
    financingUncertain:true,planPrice:validPlan,firstMonthPlanPrice:null,
    prepay:Math.max(0,Number(phone.prepay)||0),stay:Math.max(0,Number(phone.stay)||0),
    conditionalRewardsExcluded:true};
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
  const due=bundle?price:validPlan===null?null:price+first+validPlan*(prepaidMonths-1);
  const commitment=bundle?price:validPlan===null?null:price+first+validPlan*(minimumMonths-1);
  const year=bundle?(bundle>=12?price:validPlan===null?null:price+validPlan*(12-bundle)):
    (validPlan===null?null:price+first+11*validPlan);
  return {due,commitment,year,netDevice:price,financingUncertain:!!phone.postpaid,
    planPrice:validPlan,firstMonthPlanPrice:first,prepay,stay,
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
      !pastEnd(d.ends,today) && d.availability!=='out_of_stock' && !(d.port && !canPort))
    .map(d => {
      const cost = phoneCost(d);
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
      ...(unavailablePhones>0 ?
        [unavailablePhones+' phone promotion(s) observed out of stock are excluded from recommendations and savings estimates.'] : []),
      ...(unconfirmedPhonePorts>0 ?
        ['Port-in-only phone promotions are excluded from recommendations until you confirm number-transfer eligibility. You can still browse them under Phone Deals.'] : []),
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
export function normalizeCompare(items, catalog) {
  const entries = Array.isArray(items) ? items : [];
  const taken = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || !['plan','phone'].includes(entry.type) || typeof entry.id!=='string') continue;
    if (result.length >= MAX_COMPARE) break;
    if (result.length && entry.type!==result[0].type) continue;
    const found = (entry.type==='plan' ? catalog.plans : catalog.phones || []).find(p=>p.id===entry.id);
    if (!found || taken.has(entry.id)) continue;
    taken.add(entry.id);
    result.push({type:entry.type,id:entry.id});
  }
  return result;
}
