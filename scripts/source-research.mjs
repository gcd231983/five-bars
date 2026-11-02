// Official-source research ledger. Independent from human full-terms attestation.
// A matching PUBLIC headline is not an approved checkout quote.
import {validDay,verificationState,usd,localDay} from '../site/value-core.mjs';

export const BASE='https://gcd231983.github.io/five-bars/';
export const MATCH_FIELDS=['publishedMonthly','billingMonths','billingUpfront','publishedDevicePrice','publishedPlanMonthly','publishedPortRequired','publishedPrepayMonths','publishedFirstMonthPlanPrice','publishedConditionalRebate'];
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
})[c]);
function officialUrl(s){
 try{
  const u=new URL(s);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')?u.href:null;
 }catch{return null;}
}
const href=(url,text)=>officialUrl(url)?'<a href="'+safe(officialUrl(url))+'" target="_blank" rel="noopener noreferrer">'+safe(text)+'</a>':
 '<span>Reference unavailable</span>';
const num=(x)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function dayGap(now,then){
 return Math.round((Date.parse(now+'T12:00:00Z')-Date.parse(then+'T12:00:00Z'))/86400000);
}
export function researchStatus(offer,record,{today=localDay(),maxAgeDays=21}={}){
 if(!record)return {state:'not_researched',label:'No official-source research recorded',issues:[]};
 if(!validDay(today)||!validDay(record.observedOn)||record.observedOn>today)
  return {state:'invalid',label:'Invalid research date',issues:['research date invalid or in the future']};
 const kind=record.kind||'plan';
 if(!['plan','phone'].includes(kind)||Boolean(offer?.phone)!==(kind==='phone'))
  return {state:'invalid',label:'Research offer kind mismatch',issues:['research kind does not match catalog']};
 const validFields=kind==='phone'?
  num(record.publishedDevicePrice)&&num(record.publishedPlanMonthly)&&
  typeof record.publishedPortRequired==='boolean'&&
  (record.publishedFirstMonthPlanPrice===undefined||num(record.publishedFirstMonthPlanPrice))&&
  (record.publishedConditionalRebate===undefined||num(record.publishedConditionalRebate))&&
  (record.publishedPrepayMonths===undefined||(Number.isInteger(record.publishedPrepayMonths)&&record.publishedPrepayMonths>0)):
  num(record.publishedMonthly)&&(record.publishedFirstMonthPrice===undefined||num(record.publishedFirstMonthPrice));
 if(!validFields||!Array.isArray(record.sources)||record.sources.length===0||
    record.sources.some(v=>!officialUrl(v?.url))||
    !Array.isArray(record.supportedFacts)||!Array.isArray(record.unresolved))
  return {state:'invalid',label:'Evidence structure incomplete',issues:['missing or unsafe official source facts']};
 const issues=[];
 if(kind==='phone'){
  if(!num(offer?.price)||Math.abs(offer.price-record.publishedDevicePrice)>0.0001)
   issues.push('advertised handset price differs from official conditional headline');
  if(offer.planPrice!==record.publishedPlanMonthly)
   issues.push('required monthly plan differs from official conditional headline');
  if(offer.port!==record.publishedPortRequired)
   issues.push('number-transfer requirement differs from official conditional headline');
  if(record.publishedFirstMonthPlanPrice!==undefined&&offer.firstMonthPlanPrice!==record.publishedFirstMonthPlanPrice)
   issues.push('first-month service bill differs from official conditional headline');
  if(record.publishedPrepayMonths!==undefined&&offer.prepay!==record.publishedPrepayMonths)
   issues.push('prepaid service months differ from official conditional headline');
  if(record.publishedConditionalRebate!==undefined&&offer.rebate!==record.publishedConditionalRebate)
   issues.push('conditional reward differs from official published terms');
 }else{
  if(!num(offer?.price)||Math.abs(offer.price-record.publishedMonthly)>0.0001)
   issues.push('catalog standard monthly equivalent differs from official source');
  if(record.billingMonths===12){
   if(offer.billingMonths!==12||!num(record.billingUpfront)||offer.billingUpfront!==record.billingUpfront)
    issues.push('annual prepayment or billing interval differs from official source');
  }else if(offer.billingMonths===12)
   issues.push('catalog annual billing is not supported by official record');
  if(record.publishedFirstMonthPrice!==undefined&&offer.firstMonthPrice!==record.publishedFirstMonthPrice)
   issues.push('first-month plan charge differs from official source');
 }
 if(issues.length)return {state:'conflict',label:'Published-source terms conflict with catalog',issues};
 const age=dayGap(today,record.observedOn);
 if(age>maxAgeDays)return {state:'aged',label:'Published evidence is '+age+' days old; reconfirm',issues:[]};
 return {state:'published_match',label:(kind==='phone'?'Official conditional device headline matched on ':'Official published baseline matched on ')+record.observedOn,issues:[]};
}
export function buildResearchAudit({catalog,ledger={},research,today=localDay()}){
 if(!validDay(today)||!catalog||!Array.isArray(catalog.plans)||!Array.isArray(catalog.phones)||
  !research||research.schema!==1||!validDay(research.observedOn)||
  !research.records||typeof research.records!=='object'||Array.isArray(research.records))
  throw Error('Invalid catalog or official research ledger');
 const offers=[...catalog.plans.map(p=>({...p,kind:'plan'})),...catalog.phones.map(p=>({...p,kind:'phone'}))];
 const ids=new Set(offers.map(p=>p.id));
 for(const key of Object.keys(research.records)){
  if(!ids.has(key))throw Error('Official-source research references missing offer '+key);
 }
 const entries=offers.map(o=>{
  const record=research.records[o.id]||null;
  const state=researchStatus(o,record,{today});
  const review=verificationState(o,ledger.offers?.[o.id],today);
  return {
   id:o.id,carrier:o.carrier,offer:o.plan||o.phone,kind:o.kind,
   catalogPrice:o.price,billingMonths:o.billingMonths||1,billingUpfront:o.billingUpfront||null,
   researchState:state.state,researchLabel:state.label,
   issues:state.issues,manualReview:review.status,
   researchedOn:record?.observedOn||null,
   sourceUrls:record?.sources?.map(s=>s.url)||[]
  };
 });
 const counts={
  offers:entries.length,
  researched:entries.filter(x=>x.researchState!=='not_researched').length,
  publishedPriceMatches:entries.filter(x=>x.researchState==='published_match').length,
  conflictingOrInvalid:entries.filter(x=>['conflict','invalid'].includes(x.researchState)).length,
  aged:entries.filter(x=>x.researchState==='aged').length,
  notResearched:entries.filter(x=>x.researchState==='not_researched').length,
  manuallyFullyReviewed:entries.filter(x=>x.manualReview==='verified').length,
  needingFullTerms:entries.filter(x=>x.manualReview!=='verified').length
 };
 return {
  schema:1,asOf:today,researchObservedOn:research.observedOn,
  scope:'Public official pages and consumer labels only; NOT checkout validation, actual product eligibility, complete terms or guaranteed pricing.',
  summary:counts,offers:entries
 };
}
function htmlDoc(body){
 return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="description" content="An evidence-first report on which Five Bars catalog prices have published official source references and which still need checkout review.">'+
  '<link rel="canonical" href="'+BASE+'source-research.html">'+
  '<title>Five Bars official-source evidence audit</title>'+
  '<link rel="stylesheet" href="comparison-styles.css"></head><body>'+
  '<header class="wrap"><nav aria-label="Navigation"><a href="./">Five Bars home</a>'+
  '<a href="carrier-comparisons.html">Carrier comparisons</a>'+
  '<a href="review-workbench.html">Editorial review workbench</a>'+
  '<a href="editorial.html">Review methodology</a></nav></header>'+
  body+'<footer class="wrap"><p>Five Bars — public official-source research, not a carrier checkout, independent full-terms certification or guaranteed offer.</p>'+
  '<nav><a href="disclosures.html">Commercial disclosures</a>'+
  '<a href="privacy.html">Privacy</a><a href="switching-guide.html">Switching checklist</a></nav></footer></body></html>\n';
}
export function renderResearchPage({catalog,ledger,research,today=localDay()}){
 const audit=buildResearchAudit({catalog,ledger,research,today});
 const sum=audit.summary;
 const sections=['<main class="wrap"><h1>What our official sources actually confirm</h1>',
  '<p class="lede">These are dated findings from carrier websites and broadband consumer labels. A published price match does <strong>not</strong> certify checkout eligibility, promotional availability, real taxes, network coverage or final charges.</p>',
  '<div class="caution" role="note"><strong>No invented verification.</strong> Official research observed on '+
   safe(research.observedOn)+'. Status calculated for '+safe(today)+'. Currently '+
   sum.manuallyFullyReviewed+' of '+sum.offers+
   ' listings have valid, documented human full-terms sign-offs. Actual carrier checkout must still be checked.</div>',
  '<section><h2>Evidence coverage</h2><div class="guides">'+
   '<div class="guide"><h3>'+sum.publishedPriceMatches+'</h3>Partial official plan and device headlines within 21 days (not full checkout)</div>'+
   '<div class="guide"><h3>'+sum.aged+'</h3>Published baselines over 21 days old</div>'+
   '<div class="guide"><h3>'+sum.notResearched+'</h3>Other listings without documented official-source research</div>'+
   '<div class="guide"><h3>'+sum.conflictingOrInvalid+'</h3>Conflicts or invalid evidence records</div>'+
   '</div></section>',
  '<section><h2>Official plan baselines and conditional device promotion headlines</h2>'+
   '<p>Plan-price baselines and device-promotion headlines are different evidence levels. Device prices can depend on eligible transfers, required prepayments and future rewards. A match is NOT a checkout quote. Sources and unresolved customer questions accompany every record.</p>'
 ];
 for(const [id,record] of Object.entries(research.records)){
  const item=audit.offers.find(x=>x.id===id);
  if(!item)continue;
  const status=item.researchState;
  const issues=item.issues||[];
  const isPhone=record.kind==='phone';
  const rate=status==='conflict'||status==='invalid'?'Rate WITHHELD (mismatch)':
    isPhone?usd(record.publishedDevicePrice)+' advertised conditional handset price; needs '+
      usd(record.publishedPlanMonthly)+'/mo qualifying service'+
      (record.publishedFirstMonthPlanPrice!==undefined?'; '+usd(record.publishedFirstMonthPlanPrice)+' first service bill':'')+
      (record.publishedPrepayMonths!==undefined?'; '+record.publishedPrepayMonths+' service months prepaid':'')+
      (record.publishedPortRequired?'; qualifying number transfer':'')+
      (record.publishedConditionalRebate!==undefined?'; '+usd(record.publishedConditionalRebate)+' conditional later reward NOT deducted':''):
    usd(record.publishedMonthly)+(record.billingMonths===12?
      ' per-month equivalent; '+usd(record.billingUpfront)+' due upfront for 12 months':
      ' regular per month'+(record.publishedFirstMonthPrice!==undefined?'; '+usd(record.publishedFirstMonthPrice)+' first month':''));
  sections.push('<article class="guide research-article" data-offer-id="'+safe(id)+'">'+
   '<h3>'+safe(item.carrier)+' — '+safe(item.offer)+'</h3>'+
   '<p><strong>'+safe(item.researchLabel)+'</strong> · Manual full-terms review: '+safe(item.manualReview)+'</p>'+
   '<p><strong>'+(isPhone?'Official conditional DEVICE HEADLINE (not checkout)':'Official published baseline')+':</strong> '+safe(rate)+'</p>');
  if(issues.length)sections.push('<p><strong>Material conflict:</strong> '+safe(issues.join('; '))+'</p>');
  sections.push('<h4>What carrier publications support</h4><ul>');
  for(const x of record.supportedFacts)sections.push('<li>'+safe(x)+'</li>');
  sections.push('</ul><h4>Official published sources</h4><ul>');
  for(const source of record.sources)sections.push('<li>'+href(source.url,source.supports)+'</li>');
  sections.push('</ul><h4>Not yet confirmed at checkout</h4><ul>');
  for(const question of record.unresolved)sections.push('<li>'+safe(question)+'</li>');
  sections.push('</ul></article>');
 }
 sections.push('</section><section><h2>Remaining catalog items without this source audit</h2>'+
  '<p>These listings still need dated official publication research and full-terms review; their existing prices should not be mistaken for validated offers.</p><ul>');
 for(const item of audit.offers.filter(x=>x.researchState==='not_researched')){
  sections.push('<li>'+safe(item.carrier)+' — '+safe(item.offer)+' ('+safe(item.kind)+')</li>');
 }
 sections.push('</ul></section><section><h2>How to improve this record</h2>'+
  '<p>Researchers should document the exact carrier source URL, standard price, upfront payment, promotion restrictions, included data, taxes and limitations. Never convert a successful HTTP request or copied price headline into a full-terms sign-off.</p>'+
  '<p>See the <a href="review-workbench.html">offer review workbench</a> for a human inspection checklist and the protected GitHub sign-off workflow.</p></section></main>');
 return htmlDoc(sections.join(''));
}
