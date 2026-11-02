// Conservative MVNO price evidence: official, bounded plan headings only.
// The scanner NEVER edits catalog rates or marks all promotion terms verified.
// Tello, H2O and Red Pocket currently block automated access; never bypass it.
import {createHash} from 'node:crypto';

export const MVNO_SOURCES = Object.freeze({
  helium: 'https://support.hellohelium.com/en/articles/17734883-plans-pricing',
  mobilex: 'https://mymobilex.com/all-faqs/',
  good2go: 'https://annualplans.good2gomobile.com/home-page',
});

export const MVNO_PLAN_RULES = Object.freeze({
  'helium-air':      {source:'helium',carrier:'Helium Mobile',months:1},
  'helium-infinity': {source:'helium',carrier:'Helium Mobile',months:1},
  'mobilex-unlimited10':{source:'mobilex',carrier:'MobileX',months:1},
  'mobilex-unlimited30':{source:'mobilex',carrier:'MobileX',months:1},
  'good2go-annual1':{source:'good2go',carrier:'Good2Go Mobile',months:12},
  'good2go-annual3':{source:'good2go',carrier:'Good2Go Mobile',months:12},
  'good2go-annual5':{source:'good2go',carrier:'Good2Go Mobile',months:12},
});

function validSource(sourceKey, url) {
  if (!Object.hasOwn(MVNO_SOURCES,sourceKey)) return false;
  try {
    const base=new URL(MVNO_SOURCES[sourceKey]);
    const u=new URL(url);
    return u.protocol==='https:' && u.origin===base.origin && !u.username && !u.password &&
      !u.port && (u.pathname===base.pathname || u.pathname===base.pathname.replace(/\/$/,'') || u.pathname==='/home');
  } catch {return false;}
}
function visibleText(html){
  if(typeof html!=='string' || html.length>1_500_000) return '';
  return html
    .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;|&thinsp;|&#160;|&#xA0;/gi,' ')
    .replace(/&dollar;|&#36;|&#x24;/gi,'$')
    .replace(/&amp;/gi,'&')
    .replace(/[\u200B-\u200D\u2060-\u206F\uFEFF]/g,'')
    .replace(/\s+/g,' ').trim();
}
function currency(s){
  const n=Number(String(s).replace(/,/g,''));
  return Number.isFinite(n)&&n>=0&&n<=3000 ? Math.round(n*100)/100 : null;
}
function proof(snippet,price,upfront=null){
  return {
    price,upfront,
    evidenceDigest:createHash('sha256').update(snippet).digest('hex').slice(0,20),
  };
}
function add(output,id,entry){
  if(!output.has(id))output.set(id,[]);
  output.get(id).push(entry);
}
/** Return exact headline observations per plan. A label alone is not enough. */
export function parseMvnoHeadlines(sourceKey,html){
  const plain=visibleText(html);
  const matches=new Map();
  if(sourceKey==='helium'){
    // Air Plan $15/month; Infinity Plan $30/month. No nearby unrelated dollars.
    const pattern=/\b(Air|Infinity)\s+Plan\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*\/\s*(?:month|mo)\b/gi;
    for(const m of plain.matchAll(pattern)){
      const id=m[1].toLowerCase()==='air'?'helium-air':'helium-infinity';
      const price=currency(m[2]);
      if(price!==null)add(matches,id,proof(m[0],price));
    }
  }else if(sourceKey==='mobilex'){
    // FAQ section "Basic Unlimited 10GB: $14.88" and "Basic Unlimited 30GB: $24.88".
    const pattern=/\bBasic\s+Unlimited\s+(10|30)\s*GB\s*:\s*\$\s*([\d,]+(?:\.\d{1,2})?)\b/gi;
    for(const m of plain.matchAll(pattern)){
      const id=m[1]==='10'?'mobilex-unlimited10':'mobilex-unlimited30';
      const price=currency(m[2]);
      if(price!==null)add(matches,id,proof(m[0],price));
    }
  }else if(sourceKey==='good2go'){
    // Cards show "$60 Annual Payment ... 1GB high speed data per month".
    // The negative lookahead forbids crossing into another annual-price card.
    const pattern=/\$\s*([\d,]+(?:\.\d{1,2})?)\s+Annual\s+Payment\b((?:(?!\$\s*[\d,.]+\s+Annual\s+Payment)[\s\S]){0,300}?)\b(1|3|5)\s*GB\s+high\s+speed\b/gi;
    for(const m of plain.matchAll(pattern)){
      const upfront=currency(m[1]);
      if(upfront===null || upfront===0) continue;
      const id='good2go-annual'+m[3];
      add(matches,id,proof(m[0],Math.round((upfront/12)*100)/100,upfront));
    }
  }
  const observations={},conflicts=[];
  for(const [id,list] of matches.entries()){
    if(!Object.hasOwn(MVNO_PLAN_RULES,id))continue;
    const distinct=[...new Set(list.map(m=>JSON.stringify([m.price,m.upfront])))];
    if(distinct.length>1){
      conflicts.push({id,reason:'Conflicting official prices for the same plan',variants:distinct.length});
    }else{
      observations[id]={...list[0],repetitions:list.length};
    }
  }
  return {observations,conflicts};
}
function validDay(day) {
  return typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(day+'T12:00:00Z')) &&
    new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
}
function historyFrom(previous, observations, date){
  const old=previous?.schema===1 && previous?.offers && typeof previous.offers==='object' &&
    !Array.isArray(previous.offers) ? previous.offers : {};
  const offers={};
  for(const [id,rule] of Object.entries(MVNO_PLAN_RULES)){
    const source=MVNO_SOURCES[rule.source];
    const values=Array.isArray(old[id])?old[id]:[];
    const cleaned=values.filter(v=>v && validDay(v.date) && Number.isFinite(v.price) &&
      (rule.months===1||Number.isFinite(v.upfront)) && v.source===source).slice(-90);
    if(cleaned.length)offers[id]=cleaned;
  }
  for(const [id,result] of Object.entries(observations)){
    if(!Object.hasOwn(MVNO_PLAN_RULES,id))continue;
    const rule=MVNO_PLAN_RULES[id];
    const entry={date,price:result.price,upfront:result.upfront??null,
      billingMonths:rule.months,source:MVNO_SOURCES[rule.source],
      scope:'official_plan_rate_and_billing_term_headline'};
    const existing=(offers[id]||[]).filter(v=>v.date!==date);
    offers[id]=[...existing,entry].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
  }
  return {schema:1,description:'Official carrier headline rate and billing period observations, NOT full checkout or eligibility verification.',offers};
}
export function evaluateMvnoEvidence({catalog,sources,checkedAt=new Date().toISOString(),
  day=checkedAt.slice(0,10),previousHistory=null}){
  if(!catalog || !Array.isArray(catalog.plans) || !Array.isArray(sources) ||
    !Number.isFinite(Date.parse(checkedAt)) || !validDay(day))
    throw Error('Invalid MVNO evidence input');
  const evidence={},observations={},alerts=[];
  const prepared={};
  for(const key of Object.keys(MVNO_SOURCES)){
    const official=MVNO_SOURCES[key];
    const found=sources.find(s=>s.url===official);
    const trusted=found?.ok===true && validSource(key,found.finalUrl||found.url);
    prepared[key]=trusted?parseMvnoHeadlines(key,found._html||''):{observations:{},conflicts:[]};
    prepared[key].trusted=trusted;
  }
  for(const [id,rule] of Object.entries(MVNO_PLAN_RULES)){
    const p=catalog.plans.find(x=>x.id===id && x.carrier===rule.carrier);
    if(!p)continue;
    const src=prepared[rule.source];
    const parsed=src.observations[id];
    const ambiguous=src.conflicts.some(c=>c.id===id);
    const expectedPrice=Number(p.price);
    const expectedUpfront=rule.months===12?Number(p.billingUpfront):null;
    const billingOK=rule.months===12?
      p.billingMonths===12&&Number.isFinite(expectedUpfront)&&
      Math.round(expectedUpfront/12*100)/100===expectedPrice:
      !p.billingMonths || p.billingMonths===1;
    const same=parsed && parsed.price===expectedPrice &&
      (rule.months!==12 || parsed.upfront===expectedUpfront) && billingOK;
    const state=!src.trusted?'source_unavailable':ambiguous?'ambiguous':
      !parsed?'not_found':same?'headline_matched':'headline_mismatch';
    const note=state==='headline_matched'?
      'Official carrier page matches the advertised plan rate and billing term only. Taxes, checkout, and full terms NOT verified.':
      state==='source_unavailable'?'Official carrier page blocked or failed; no current price validation available.':
      state==='not_found'?'Required exact price-and-plan wording was not found; review before relying on the catalog rate.':
      state==='ambiguous'?'Carrier page contains conflicting plan prices; review required.':
      'Advertised plan rate or billing period differs from the catalog; review before displaying cost estimates.';
    evidence[id]={
      state,scope:'official_plan_rate_and_billing_term_headline',
      checkedAt,sourceUrl:MVNO_SOURCES[rule.source],carrier:p.carrier,plan:p.plan,
      catalogPrice:p.price,catalogUpfront:rule.months===12?p.billingUpfront??null:null,
      billingMonths:rule.months,
      observedPrice:parsed?.price??null,observedUpfront:parsed?.upfront??null,
      evidenceDigest:parsed?.evidenceDigest??null,fullTermsVerified:false,note,
    };
    if(parsed && !ambiguous && src.trusted)observations[id]=parsed;
    if(state!=='headline_matched'){
      alerts.push({id,type:'mvno_price_'+state,reason:note,
        currentPrice:p.price,observedPrice:parsed?.price??null,
        currentUpfront:p.billingUpfront??null,observedUpfront:parsed?.upfront??null,
        source:MVNO_SOURCES[rule.source]});
    }
  }
  const values=Object.values(evidence);
  return {
    report:{
      schema:1,generatedAt:checkedAt,
      scope:'Official plan headline price and billing term ONLY; no taxes, renewal, eligibility or checkout confirmation.',
      method:'Strict plan-card or plan-FAQ extraction from allowlisted official carrier pages; no AI and no automatic catalog rate edits.',
      summary:{
        plansChecked:values.length,
        headlineMatches:values.filter(x=>x.state==='headline_matched').length,
        priceMismatches:values.filter(x=>x.state==='headline_mismatch').length,
        missingOrAmbiguous:values.filter(x=>['not_found','ambiguous'].includes(x.state)).length,
        sourceUnavailable:values.filter(x=>x.state==='source_unavailable').length,
        observationsRecorded:Object.keys(observations).length,
        needReview:alerts.length,
      },
      offers:evidence,alerts,
    },
    history:historyFrom(previousHistory,observations,day),
  };
}
