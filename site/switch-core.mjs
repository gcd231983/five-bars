// Five Bars Switch & Save: deterministic estimated cash-flow comparisons.
// No network calls, API keys, browser storage, tracking, or checkout promises.
import {planCost,phoneCost,verificationState,localDay,pastEnd,validDay} from './value-core.mjs';

export const SWITCH_HORIZONS=Object.freeze([12,24,36]);
const conflicts=new Set(['headline_mismatch','ambiguous','unresolved_mismatch']);
const MAX_AMOUNT=100000;
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
function amount(name,value,max=MAX_AMOUNT){
  const n=typeof value==='string' && value.trim()==='' ? NaN:Number(value);
  if(!Number.isFinite(n)||n<0||n>max)throw Error(name+' must be a number from $0 to $'+max.toLocaleString('en-US')+'.');
  return money(n);
}
function sampleOffer(catalog,type,id){
  if(!['plan','phone'].includes(type))throw Error('Choose either a plan or a phone deal.');
  const src=type==='plan'?catalog?.plans:catalog?.phones;
  if(!Array.isArray(src))throw Error('Catalog is unavailable.');
  return src.find(x=>x.id===id)||null;
}
function sum(values){return money(values.reduce((total,v)=>total+v,0));}
function healthy(proof){return !conflicts.has(proof?.state);}
function evidenceStatus(id,type,opts){
  const doc=type==='plan'?opts.mvnoEvidence:opts.phoneEvidence;
  return doc?.offers?.[id]||null;
}
function buildCashflow(offer,type,scenario,months){
  const note=[],service=Array(months).fill(0),L=scenario.lines;
  let deviceUpfront=0,serviceUpfront=0;
  if(type==='plan'){
    if(offer.maxLines && L>offer.maxLines)
      throw Error('This plan has not been quoted for '+L+' lines. Reduce your line count or choose another offer.');
    const requiresNew=offer.promo?.req==='new'&&!scenario.newCustomer;
    const cost=planCost(requiresNew?{...offer,promo:null}:offer,L,
      {today:scenario.today,cannotPort:scenario.cannotPort||!scenario.canPort,
        canPort:scenario.canPort,newCustomer:scenario.newCustomer,
        discountQualified:scenario.discountQualified});
    if(!cost)throw Error('This plan has no usable published service price.');
    if(cost.annualPrepaid){
      if(!Number.isFinite(offer.billingUpfront)||offer.billingUpfront<=0)
        throw Error('Annual upfront payment is not known.');
      for(let month=0;month<months;month+=12)service[month]=money(offer.billingUpfront);
      serviceUpfront=money(offer.billingUpfront);
      note.push('Annual prepay repeats every 12 months at the currently listed amount. Renewal pricing is NOT guaranteed.');
      if(offer.promo)note.push('Any separate monthly introductory offer is not added to the annual prepay rate.');
    }else{
      if(offer.billingMonths===12 && L!==1)
        throw Error('Annual prepaid plans cannot be quoted for multiple lines without an explicit family price.');
      const m=cost.promoUsed?Math.min(months,Math.max(0,Number(offer.promo?.months)||0)):0;
      for(let month=0;month<months;month++){
        service[month]=money((month<m?cost.nowPerLine:cost.regularPerLine)*L+cost.knownMonthlyFeeTotal);
      }
      if(cost.firstMonthAdjusted){
        service[0]=money(cost.firstMonthDue+cost.knownMonthlyFeeTotal);
        note.push('Published first service bill: $'+money(cost.firstMonthDue).toFixed(2)+
          ', with later bills modeled at the listed rate; confirm AutoPay and eligibility.');
      }
      if(cost.knownActivationFeeTotal)service[0]=money(service[0]+cost.knownActivationFeeTotal);
      serviceUpfront=service[0];
      if(cost.knownMonthlyFeeTotal||cost.knownActivationFeeTotal)
        note.push('Includes documented fixed carrier provider fees $'+money(cost.knownMonthlyFeeTotal).toFixed(2)+
          '/mo and activation $'+money(cost.knownActivationFeeTotal).toFixed(2)+
          '; government taxes, other fees and price changes remain unknown.');
      if(cost.conditionalDiscountUnconfirmed)
        note.push('AutoPay/Auto-Refill/eBilling conditional rate not assumed: use published undiscounted base until eligibility is confirmed.');
      if(requiresNew)note.push('New-customer/new-line introductory pricing excluded because carrier eligibility was not confirmed.');
      if(offer.promo?.req==='port'&&!scenario.canPort)
        note.push('Port-in introductory pricing excluded unless the visitor confirms an eligible number transfer.');
      if(cost.promoUsed)note.push('Intro rate applies only for the recorded '+offer.promo.months+
        ' month(s), then modeled at the listed regular rate. Promotion eligibility remains unverified.');
      else if(offer.promo?.req==='port' && scenario.cannotPort)
        note.push('Port-in intro discount excluded because you cannot transfer your current number.');
      if(cost.promoFamilyUnconfirmed)
        note.push('No unverified multi-line promotional price was assumed.');
      if(cost.estimatedFamilyPrice)
        note.push('No published family rate for '+L+' lines: the model extrapolates a single-line rate. Actual cost could differ.');
    }
    if(offer.tax!==true)note.push('Carrier taxes, regulatory fees and activation charges may apply beyond your entered estimates.');
  }else{
    if(L!==1)throw Error('Phone promotions are per device. Use one line; household phone bundles cannot be assumed.');
    if(pastEnd(offer.ends,scenario.today))
      throw Error('This device promotion has passed its recorded expiration date.');
    if(offer.newLineRequired===true && scenario.newCustomer!==true)
      throw Error('This phone promotion requires confirmed eligible new-line activation before savings can be estimated.');
    if(offer.port && (scenario.cannotPort||!scenario.canPort))
      throw Error('This phone promotion requires a confirmed eligible number transfer before a savings estimate can be shown.');
    if(!Number.isFinite(offer.price)||offer.price<0)
      throw Error('The advertised device price is unavailable.');
    deviceUpfront=money(offer.price);
    const prepay=Math.max(1,Math.trunc(Number(offer.prepay)||0));
    const bundle=Math.max(0,Math.trunc(Number(offer.bundle)||0));
    const phoneEstimate=phoneCost(offer,{discountQualified:scenario.discountQualified});
    const base=phoneEstimate?.planPrice??null;
    if(phoneEstimate?.conditionalDiscountUnconfirmed)
      note.push('Required phone service uses the published rate without AutoPay. The discounted rate applies only after you confirm AutoPay eligibility.');
    if((base===null||!Number.isFinite(base)||base<0) && bundle<months)
      throw Error('This phone deal has no reliable required monthly plan price for the selected horizon.');
    if(bundle){
      if(bundle>0 && !Number.isInteger(bundle))throw Error('Bundle coverage is unclear.');
      for(let month=bundle;month<months;month++)service[month]=money(base);
      serviceUpfront=0;
      note.push('Advertised device bundle includes '+bundle+' month(s) of service; subsequent months assume the listed plan rate.');
    }else{
      for(let month=0;month<months;month++)service[month]=money(base);
      const billedNow=Math.min(months,prepay);
      const first=Number.isFinite(offer.firstMonthPlanPrice)?offer.firstMonthPlanPrice:base;
      if(first<0)throw Error('First-month service charge is invalid.');
      service[0]=money(Number.isFinite(offer.prepaidServiceTotal)?offer.prepaidServiceTotal:first+base*(billedNow-1));
      for(let month=1;month<billedNow;month++)service[month]=0;
      serviceUpfront=service[0];
      if(first!==base)note.push('First service month is $'+money(first).toFixed(2)+
        '; remaining modeled service months are $'+money(base).toFixed(2)+
        ' with applicable AutoPay or other eligibility conditions.');
      if(prepay>1)note.push('The offer requires '+prepay+' month(s) of prepaid service, charged in the first modeled month.');
      if(Number.isFinite(offer.prepaidServiceTotal))note.push('The first service block costs $'+money(offer.prepaidServiceTotal).toFixed(2)+
        ' upfront. Later service assumes the listed monthly rate; confirm the actual renewal interval and price.');
    }
    if(offer.postpaid)note.push('Financed/postpaid terms and recurring device payments are not fully specified. The model assumes the listed device amount is paid upfront, so actual cash timing may differ.');
    if(Number(offer.rebate)>0||Number(offer.credit)>0)
      note.push('Conditional rebates, device credits and trade-in promotions are excluded from savings. They must be independently confirmed.');
    if(Number(offer.stay)>0)note.push('Carrier records at least '+offer.stay+' month(s) of required service; early-exit penalties are not modeled.');
    if(Number(offer.lock)>0)note.push('Device unlocking is listed after '+offer.lock+' month(s); verify unlock eligibility directly with the carrier.');
    if(offer.port)note.push('Number-transfer eligibility is assumed. Confirm your account and transfer PIN before ordering.');
    note.push('The included carrier plan is fixed to this phone offer. It is not automatically combined with an unrelated cheap plan.');
  }
  return {service,serviceUpfront,deviceUpfront,notes:note};
}
export function normalizeScenario(input={}){
  const lines=Number(input.lines??1);
  if(!Number.isInteger(lines)||lines<1||lines>5)throw Error('Choose between 1 and 5 wireless lines.');
  const h=Number(input.horizon??12);
  if(!SWITCH_HORIZONS.includes(h))throw Error('Choose a 12-, 24-, or 36-month comparison.');
  const day=input.today??localDay();
  if(!validDay(day))throw Error('Comparison date is invalid.');
  if(input.canPort===true && input.cannotPort===true)
    throw Error('Number-transfer eligibility inputs conflict.');
  return {
    lines,horizon:h,today:day,cannotPort:!!input.cannotPort,
    canPort:input.canPort===true,newCustomer:input.newCustomer===true,
    discountQualified:input.discountQualified===true,
    currentMonthly:amount('Current monthly bill',input.currentMonthly,5000),
    payoff:amount('Existing device payoff',input.payoff??0),
    switchFees:amount('One-time switching fees',input.switchFees??0),
    extraMonthly:amount('Additional monthly fees',input.extraMonthly??0,1000)
  };
}
export function simulateSwitch({catalog,type,id,scenario,phoneEvidence={},
  mvnoEvidence={},status={},verifications={},researchEvidence=null}){
  const opts={phoneEvidence,mvnoEvidence};
  const config=normalizeScenario(scenario);
  const offer=sampleOffer(catalog,type,id);
  if(!offer)throw Error('The selected listing is not in the current catalog.');
  if(type==='phone'&&offer.availability==='out_of_stock')
    throw Error('This handset promotion was observed out of stock. Current checkout and switch-savings estimates are withheld pending a new carrier stock check.');
  if(type==='phone'&&offer.postpaid===true)
    throw Error('Financed/trade-in phone promotion: no reliable savings without full device retail price, installment payments, qualifying service and credit-loss/payoff terms. Ask the carrier for its complete agreement first.');
  // A dated, manually researched public official price baseline may contradict
  // future catalog edits. Stop showing savings until the discrepancy is resolved.
  // A baseline match is NOT independent full checkout verification.
  const published=researchEvidence?.records?.[id]||null;
  if(published){
    const mismatch=type==='phone'?
      (published.kind!=='phone'||!Number.isFinite(published.publishedDevicePrice)||
       offer.price!==published.publishedDevicePrice||
       offer.planPrice!==published.publishedPlanMonthly||
       (published.publishedUndiscountedPlanPrice!==undefined&&
        (offer.undiscountedPlanPrice!==published.publishedUndiscountedPlanPrice||offer.planDiscountCondition!==published.publishedPlanDiscountCondition))||
       offer.port!==published.publishedPortRequired||
       (published.publishedNewLineRequired!==undefined&&offer.newLineRequired!==published.publishedNewLineRequired)||
       (published.publishedPrepayMonths!==undefined&&offer.prepay!==published.publishedPrepayMonths)||
       (published.publishedPrepaidServiceTotal!==undefined&&offer.prepaidServiceTotal!==published.publishedPrepaidServiceTotal)||
       (published.publishedFirstMonthPlanPrice!==undefined&&offer.firstMonthPlanPrice!==published.publishedFirstMonthPlanPrice)||
       (published.publishedConditionalRebate!==undefined&&offer.rebate!==published.publishedConditionalRebate)||
       (published.publishedCreditMonthly!==undefined&&offer.credit!==published.publishedCreditMonthly)||
       (published.publishedCreditMonths!==undefined&&offer.creditMonths!==published.publishedCreditMonths)||
       (published.publishedFullRetailRequired!==undefined&&offer.fullRetailRequired!==published.publishedFullRetailRequired)||
       (published.publishedAvailability!==undefined&&offer.availability!==published.publishedAvailability)):
      (!Number.isFinite(published.publishedMonthly)||
       Math.abs(offer.price-published.publishedMonthly)>0.0001||
       (published.billingMonths===12?
        offer.billingMonths!==12||!Number.isFinite(published.billingUpfront)||offer.billingUpfront!==published.billingUpfront:
        offer.billingMonths===12)||
       (published.publishedFirstMonthPrice!==undefined&&offer.firstMonthPrice!==published.publishedFirstMonthPrice)||
       (published.publishedUndiscountedPrice!==undefined&&
        (offer.undiscountedPrice!==published.publishedUndiscountedPrice||offer.discountCondition!==published.publishedDiscountCondition))||
       (published.publishedKnownMonthlyFee!==undefined&&offer.knownMonthlyFee!==published.publishedKnownMonthlyFee)||
       (published.publishedKnownActivationFee!==undefined&&offer.knownActivationFee!==published.publishedKnownActivationFee)||
       (published.publishedPromoPrice!==undefined&&
        (offer.promo?.price!==published.publishedPromoPrice||offer.promo?.months!==published.publishedPromoMonths||
         offer.promo?.req!==published.publishedPromoRequirement)));
    if(mismatch)throw Error('Official published-source research conflicts with this offer price or required payment terms. Switch estimates are paused pending review.');
  }
  const proof=evidenceStatus(id,type,opts);
  if(!healthy(proof)||status?.offers?.[id]?.reviewRequired===true)
    throw Error('Official price evidence or manual-review status conflicts with this listing. Switch estimates are paused until reviewed.');
  const unreviewed=verificationState(offer,verifications?.offers?.[id],config.today);
  const output={};
  let dueToday=null,breakEven=null,firstYearExtra=0;
  for(const h of SWITCH_HORIZONS){
    const {service,serviceUpfront,deviceUpfront,notes}=buildCashflow(offer,type,config,h);
    const monthlyFees=Array(h).fill(config.extraMonthly);
    const monthCash=service.map((c,i)=>money(c+monthlyFees[i]+
      (i===0?config.payoff+config.switchFees+deviceUpfront:0)));
    const modeledNew=sum(monthCash);
    const baseline=money(config.currentMonthly*h);
    const difference=money(baseline-modeledNew);
    let cumulative=0,breakeven=null;
    for(let i=0;i<h;i++){
      cumulative=money(cumulative+config.currentMonthly-monthCash[i]);
      if(cumulative>=0&&breakeven===null)breakeven=i+1;
    }
    output[h]={
      months:h,currentTotal:baseline,newTotal:modeledNew,
      savings:difference,
      upfrontDue:money(config.payoff+config.switchFees+deviceUpfront+serviceUpfront+config.extraMonthly),
      serviceTotal:sum(service),additionalMonthlyFeeTotal:money(config.extraMonthly*h),
      oneTimeCost:money(config.payoff+config.switchFees+deviceUpfront),
      breakeven,notes
    };
  }
  const choice=output[config.horizon];
  const facts=[
    'Your current monthly bill is assumed unchanged over each comparison horizon. If existing phone installments or discounts end, the real difference will change.',
    'The calculation includes only the amounts you entered and documented catalog prices. It does not know your actual checkout taxes, activation fees, device financing, incentives, coverage or contract conditions.',
    'For longer horizons, published regular plan prices and any annual prepay renewal are assumed to remain the same; this is a scenario, not a forecast.',
    'Phone promotions are per device; coverage and IMEI/eSIM compatibility must be checked on the carrier website.',
    ...choice.notes
  ];
  if(unreviewed.status!=='verified')facts.unshift('The complete offer has NOT received a current documented independent full-terms review.');
  if(published && validDay(published.observedOn)){
    const researchAge=(Date.parse(config.today+'T12:00:00Z')-Date.parse(published.observedOn+'T12:00:00Z'))/86400000;
    if(researchAge>21)facts.unshift('The dated official public price research is older than 21 days; reconfirm it before switching.');
    else facts.unshift('Only the published official '+(type==='phone'?'conditional device headline':'plan baseline')+' was cross-checked on '+published.observedOn+'; checkout terms remain unverified.');
  }
  const summary={
    schema:1,offer:{id:offer.id,kind:type,carrier:offer.carrier,name:type==='plan'?offer.plan:offer.phone,
      url:offer.url,network:offer.net},
    scenario:config,breakEven:choice.breakeven,
    results:output,chosen:choice,reviewStatus:unreviewed.status,
    evidenceState:proof?.state??'not_scoped',
    confidence:unreviewed.status==='verified'?'reviewed_but_reconfirm':'indicative_not_fully_verified',
    warnings:[...new Set(facts)]
  };
  return summary;
}
export function formatSwitchSummary(report,{includeInputs=false}={}){
  const rows=[
    'Five Bars — estimated Switch & Save analysis',
    report.offer.carrier+' — '+report.offer.name,
    'Plan/device: '+report.offer.kind+' | '+report.scenario.lines+' line(s)',
    ...SWITCH_HORIZONS.map(h=>{
      const x=report.results[h];return h+' months: current $'+x.currentTotal.toFixed(2)+
        ', switch $'+x.newTotal.toFixed(2)+', difference '+(x.savings>=0?'+':'-')+'$'+Math.abs(x.savings).toFixed(2);
    }),
    'Illustrative cash needed at the start: $'+report.chosen.upfrontDue.toFixed(2),
    'Break even (chosen horizon): '+(report.breakEven===null?'Not within '+report.scenario.horizon+' months':'Month '+report.breakEven),
    'Status: '+report.confidence.replace(/_/g,' '),
    'Not verified checkout pricing; see current carrier terms and all fees.',
    report.offer.url
  ];
  if(includeInputs){
    rows.push('Entered existing monthly bill: $'+report.scenario.currentMonthly.toFixed(2),
      'Existing device payoff: $'+report.scenario.payoff.toFixed(2),
      'One-time switching fees: $'+report.scenario.switchFees.toFixed(2),
      'Extra estimated monthly charges: $'+report.scenario.extraMonthly.toFixed(2));
  }
  return rows.join('\n');
}
export function switchShareParams(type,id,scenario,{includeFinancials=false}={}){
  if(!['plan','phone'].includes(type)||!/^[a-z0-9._-]{1,80}$/i.test(id))
    throw Error('Invalid offer for sharing.');
  const params=new URLSearchParams();
  params.set('switch',type+':'+id);
  const lines=Number(scenario.lines??1);
  params.set('lines',String(Number.isInteger(lines)&&lines>=1&&lines<=5?lines:1));
  params.set('months',String(SWITCH_HORIZONS.includes(Number(scenario.horizon))?scenario.horizon:12));
  if(scenario.cannotPort||!scenario.canPort)params.set('noport','1');
  if(scenario.canPort)params.set('canport','1');
  if(scenario.newCustomer)params.set('newcustomer','1');
  if(scenario.discountQualified)params.set('discountqualified','1');
  if(includeFinancials){
    // These values are intentionally omitted by default because links are
    // visible to anyone who receives them and may appear in browser history.
    const valid=normalizeScenario(scenario);
    for(const [k,value] of [['bill',valid.currentMonthly],['payoff',valid.payoff],
      ['fees',valid.switchFees],['monthlyfees',valid.extraMonthly]])
      params.set(k,String(value));
  }
  return params;
}
export function parseSwitchShare(search,catalog){
  const p=new URLSearchParams(String(search||'').replace(/^\?/,'')),raw=p.get('switch');
  const parts=raw?.match(/^(plan|phone):([a-z0-9._-]{1,80})$/i);
  if(!parts || !sampleOffer(catalog,parts[1],parts[2]))return null;
  const nums={currentMonthly:'bill',payoff:'payoff',switchFees:'fees',extraMonthly:'monthlyfees'};
  const scenario={
    lines:/^[1-5]$/.test(p.get('lines')||'')?Number(p.get('lines')):1,
    horizon:SWITCH_HORIZONS.includes(Number(p.get('months')))?Number(p.get('months')):12,
    cannotPort:p.get('noport')==='1',
    canPort:p.get('canport')==='1'&&p.get('noport')!=='1',
    newCustomer:p.get('newcustomer')==='1',discountQualified:p.get('discountqualified')==='1'
  };
  for(const [key,field] of Object.entries(nums)){
    const v=p.get(field);
    if(v!==null && /^\d{1,6}(?:\.\d{1,2})?$/.test(v) && Number(v)<=MAX_AMOUNT)
      scenario[key]=Number(v);
  }
  return {type:parts[1],id:parts[2],scenario,hasFinancials:p.has('bill')};
}
