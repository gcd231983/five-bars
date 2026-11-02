// Conservative official-source price evidence for Five Bars.
// Evidence scope: device headline price + required plan + port-in requirement.
// NEVER call these findings full-deal verification or change catalog prices.
// This parser deliberately fails closed if wording/structure is unfamiliar.
import { createHash } from 'node:crypto';

export const BOOST_SOURCE = 'https://www.boostmobile.com/deals';

const BOOST_HEADLINES = [
  {id:'boost-motog',model:'moto\\s+g\\s*[-\u2013]?\\s*2026',plan:'Unlimited Premium'},
  {id:'boost-a17',model:'Galaxy\\s+A17\\s+5G',plan:'Unlimited+'},
  {id:'boost-gplay',model:'moto\\s+g\\s+play\\s*[-\u2013]?\\s*2026',plan:'Unlimited+'},
];

function readable(html) {
  if (typeof html !== 'string' || html.length > 1_500_000) return '';
  return html
    .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;|&#160;|&#xA0;/gi,' ')
    .replace(/&#43;|&#x2b;|&plus;/gi,'+')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
    .replace(/&rsquo;|&#8217;/gi,'\u2019')
    .replace(/\s+/g,' ').trim();
}
function money(str) {
  const n = Number(str.replace(/,/g,''));
  return Number.isFinite(n) && n >= 0 && n <= 3000 ? Math.round(n*100)/100 : null;
}
function sourceIdentity(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ['boostmobile.com','www.boostmobile.com','my.boostmobile.com'].includes(host);
  } catch {return false;}
}
export function parseBoostHeadlineProofs(html) {
  const text = readable(html);
  const observations = {};
  const conflicts = [];
  for (const rule of BOOST_HEADLINES) {
    // Exact sequence: model FOR $device [$retail] ON OUR $plan PLAN AND KEEP YOUR NUMBER. GET THIS DEAL.
    // No wildcard spans across an adjacent offer or a navigation element.
    const syntax = '(?:Get\\s+the\\s+)?'+rule.model+
      '\\s+for\\s+\\$([\\d,]{1,7}(?:\\.\\d{1,2})?)'+
      '(?:\\s+\\$[\\d,]{1,7}(?:\\.\\d{1,2})?)?'+
      '\\s+On\\s+our\\s+\\$([\\d,]{1,7}(?:\\.\\d{1,2})?)'+
      '\\s+(Unlimited\\s+Premium|Unlimited\\+)\\s+Plan'+
      '\\s+and\\s+keep\\s+your\\s+number\\.?\\s+Get\\s+This\\s+Deal\\b';
    const pattern = new RegExp(syntax,'gi');
    const matches = [];
    for (const m of text.matchAll(pattern)) {
      const price = money(m[1]),planPrice=money(m[2]);
      if (price===null || planPrice===null) continue;
      const planName=m[3].replace(/\s+/g,' ').trim();
      const match = {price,planPrice,port:true,planName,
        digest:createHash('sha256').update(m[0]).digest('hex').slice(0,20)};
      matches.push(match);
      if (matches.length>=12)break;
    }
    if (!matches.length) continue;
    const variants=[...new Set(matches.map(m=>JSON.stringify([m.price,m.planPrice,m.planName])))];
    if (variants.length!==1) {
      conflicts.push({id:rule.id,reason:'Conflicting prices or plans for the same model on the official page',
        variants:variants.length});
      continue;
    }
    observations[rule.id] = matches[0];
    observations[rule.id].repetitions=matches.length;
    observations[rule.id].expectedPlanName=rule.plan;
  }
  return {observations,conflicts};
}

function isValidTime(checkedAt) {
  return typeof checkedAt==='string' && Number.isFinite(Date.parse(checkedAt));
}
function keepHistory(previous, observations, day, source) {
  const before=previous && previous.schema===1 && typeof previous.offers==='object' && !Array.isArray(previous.offers)
    ? previous.offers : {};
  const offers={};
  for (const [id,values] of Object.entries(before)) {
    if (!BOOST_HEADLINES.some(rule=>rule.id===id) || !Array.isArray(values)) continue;
    offers[id]=values.filter(v=>v&&typeof v.date==='string'&&Number.isFinite(v.price)&&
      Number.isFinite(v.planPrice)&&v.source===BOOST_SOURCE).slice(-90);
  }
  for (const [id,v] of Object.entries(observations)) {
    if (!BOOST_HEADLINES.some(rule=>rule.id===id))continue;
    const entries=offers[id]||[];
    const todayObservation={date:day,price:v.price,planPrice:v.planPrice,source,
      scope:'advertised_device_and_plan_headline'};
    const prior = entries.filter(p=>p.date!==day);
    offers[id]=[...prior,todayObservation].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
  }
  return {schema:1,description:'Observed official carrier headline prices only. NOT verified checkout or total ownership cost.',
    offers};
}
export function evaluatePriceEvidence({catalog,html,sourceAvailable=false,finalUrl=BOOST_SOURCE,
  checkedAt=new Date().toISOString(),day=checkedAt.slice(0,10),previousHistory=null}) {
  if(!catalog || !Array.isArray(catalog.phones) || !isValidTime(checkedAt)) {
    throw Error('Invalid catalog or evidence scan timestamp');
  }
  const pageOK=sourceAvailable && sourceIdentity(finalUrl);
  const parsed=pageOK ? parseBoostHeadlineProofs(html) : {observations:{},conflicts:[]};
  const alerts=[],offers={};
  const conflictIds=new Set(parsed.conflicts.map(c=>c.id));
  for(const rule of BOOST_HEADLINES) {
    const d=catalog.phones.find(p=>p.id===rule.id);
    if(!d)continue;
    const observed=parsed.observations[rule.id]||null;
    let state = !pageOK ? 'source_unavailable' : conflictIds.has(rule.id) ? 'ambiguous' :
      !observed ? 'not_found' :
      observed.price===d.price && observed.planPrice===d.planPrice &&
      observed.port===d.port && observed.planName===rule.plan ? 'headline_matched' : 'headline_mismatch';
    offers[rule.id]={
      scope:'advertised_device_and_plan_headline',
      state,checkedAt,sourceUrl:BOOST_SOURCE,sourceHost:'boostmobile.com',
      model:d.phone,
      catalogPrice:d.price,catalogPlanPrice:d.planPrice,catalogPort:!!d.port,
      observedPrice:observed?.price??null,
      observedPlanPrice:observed?.planPrice??null,
      observedPort:observed?.port??null,
      observedPlanName:observed?.planName??null,
      evidenceDigest:observed?.digest??null,
      modelOccurrences:observed?.repetitions??0,
      fullTermsVerified:false,
      note:state==='headline_matched' ?
        'Official page text matches the device price, required plan and number transfer; other conditions are NOT verified.' :
        state==='source_unavailable'?'Official source could not be checked.' :
        state==='ambiguous'?'Conflicting model listings require human review.' :
        state==='not_found'?'Exact model/price/plan wording not found. It may have changed or disappeared.' :
        'Official page headline differs from the catalog; review before changing pricing.'
    };
    if(state!=='headline_matched'){
      alerts.push({id:rule.id,type:'price_evidence_'+state,
        reason:offers[rule.id].note,currentPrice:d.price,observedPrice:observed?.price??null,
        currentPlanPrice:d.planPrice,observedPlanPrice:observed?.planPrice??null,
        source:BOOST_SOURCE});
    }
  }
  const observedValid=Object.fromEntries(Object.entries(parsed.observations).filter(([id])=>!!offers[id]));
  const history=keepHistory(previousHistory,observedValid,day,BOOST_SOURCE);
  const states=Object.values(offers);
  const report={schema:1,generatedAt:checkedAt,
    source:BOOST_SOURCE,
    scope:'Exact advertised device price, required service plan and number-port headline only; no financing/unlocking/fees/checkout confirmation.',
    method:'Conservative strict official-page text extraction. No AI, no automatic catalog price edits.',
    summary:{
      offersChecked:states.length,headlineMatches:states.filter(x=>x.state==='headline_matched').length,
      priceMismatches:states.filter(x=>x.state==='headline_mismatch').length,
      missingOrAmbiguous:states.filter(x=>['not_found','ambiguous'].includes(x.state)).length,
      sourceUnavailable:states.filter(x=>x.state==='source_unavailable').length,
      observationsRecorded:Object.keys(observedValid).length,
      needReview:alerts.length,
    },
    offers,alerts};
  return {report,history};
}
