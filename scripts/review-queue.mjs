// Generate an actionable, non-AI review queue from existing catalog evidence.
// No automated scan or HTTP 200 ever certifies complete carrier terms.
import {localDay,validDay,verificationState} from '../site/value-core.mjs';
import {researchStatus} from './source-research.mjs';

const DAY_MS=86400000;
const unsafe=['headline_mismatch','ambiguous','unresolved_mismatch'];
const uncertain=['source_unavailable','not_found'];
const DAY = d => Date.parse(d+'T12:00:00Z');
const daysBetween = (a,b) => Math.round((DAY(b)-DAY(a))/DAY_MS);
function reason(code,why,importance){return {code,why,importance};}
function safeUrl(url){
  try {
    const u=new URL(url);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port;
  }catch{return false;}
}
function sortGroup(a,b){return b.score-a.score||a.carrier.localeCompare(b.carrier)||a.id.localeCompare(b.id);}
export function buildReviewQueue({catalog,status={},mvnoEvidence={},phoneEvidence={},
  manualRecords={},researchEvidence=null,generatedAt=new Date().toISOString(),today=localDay(new Date(generatedAt))}){
  if(!catalog||!Array.isArray(catalog.plans)||!Array.isArray(catalog.phones) ||
     !validDay(today)||!Number.isFinite(Date.parse(generatedAt)))
    throw Error('Invalid review queue inputs');
  if(researchEvidence!==null && (researchEvidence?.schema!==1 ||
      !researchEvidence.records || typeof researchEvidence.records!=='object' ||
      Array.isArray(researchEvidence.records)))
    throw Error('Invalid official research evidence; no review queue was generated');
  const counts={published_match:0,published_partial:0,not_researched:0,aged:0,conflict:0,invalid:0};
  const plans=catalog.plans.map(p=>({...p,_type:'plan'}));
  const phones=catalog.phones.map(p=>({...p,_type:'phone'}));
  const all=[...plans,...phones], items=[];
  const proof=offer=>offer._type==='plan'?mvnoEvidence?.offers?.[offer.id]:phoneEvidence?.offers?.[offer.id];
  const proofDate=offer=>offer._type==='plan'?mvnoEvidence?.generatedAt:phoneEvidence?.generatedAt;
  const linkMap=status?.offers||{};
  let missingFull=0;
  for(const offer of all){
    const reasons=[];
    const review=verificationState(offer,manualRecords?.[offer.id],today);
    if(review.status!=='verified'){
      missingFull++;
      reasons.push(reason('full_terms_not_verified','Full offer terms do not have a current independent manual review.',20));
    }
    const published=researchEvidence?
      researchStatus(offer,researchEvidence.records[offer.id],{today}):null;
    if(published){
      if(Object.hasOwn(counts,published.state))counts[published.state]++;
      if(['conflict','invalid'].includes(published.state))
        reasons.push(reason('published_research_conflict',
          'Dated official publication evidence conflicts with the catalog or is invalid. Review before quoting a confident price.',100));
      else if(published.state==='published_partial')
        reasons.push(reason('published_research_partial',
          'Only partial official published terms are recorded. Required service, financing or checkout conditions remain unpriced.',76));
      else if(published.state==='not_researched')
        reasons.push(reason('published_research_missing',
          'No dated official publication research is recorded for this offer. Do not imply a carrier-approved rate.',70));
      else if(published.state==='aged')
        reasons.push(reason('published_research_aged',
          'The dated official publication research is over 21 days old; review the original carrier terms.',65));
    }
    if(offer.listingHold)
      reasons.push(reason('retailer_listing_hold',
        'This retailer-specific purchase path remains on evidence hold. Do not present a checkout quote or clear the hold automatically.',75));
    if(offer.availability==='out_of_stock')
      reasons.push(reason('documented_stock_hold',
        'This dated stock hold needs fresh inventory confirmation before the offer can be recommended.',45));
    const p=proof(offer), checkedAt=proofDate(offer);
    const proofAge=checkedAt?Date.parse(generatedAt)-Date.parse(checkedAt):null;
    const evidenceFresh=Number.isFinite(proofAge)&&proofAge>=-3600000&&proofAge<=48*3600*1000;
    if(p && unsafe.includes(p.state)){
      reasons.push(reason('official_price_conflict','Official price or plan terms conflict with the catalog, or a previous conflict remains unresolved.',100));
    }else if(p && uncertain.includes(p.state)){
      reasons.push(reason('official_evidence_missing',p.state==='source_unavailable'?
        'Scoped official price source could not be read. This is not a confirmed price change.':
        'Expected official plan price wording was not found; verify directly.',55));
    }else if(p && p.state==='headline_matched'&&!evidenceFresh){
      reasons.push(reason('official_evidence_aged','Automatic partial official-price observation is more than 48 hours old.',45));
    }
    const scan=linkMap[offer.id];
    if(scan?.state==='source_unavailable'){
      reasons.push(reason('offer_page_unavailable','The official offer or purchase page could not be checked automatically; confirm purchase details with the carrier.',60));
    }
    const sourceDate=offer.priceSourceDate;
    if(validDay(sourceDate)&&daysBetween(sourceDate,today)>21){
      reasons.push(reason('catalog_price_stale','The catalog price reference is more than 21 days old; confirm and refresh it.',65));
    }
    const ends=offer.promo?.ends||offer.ends;
    if(validDay(ends)){
      const remaining=daysBetween(today,ends);
      if(remaining>=0&&remaining<=7){
        reasons.push(reason('promotion_expiring','Promotion ends in '+remaining+' day(s); confirm that the carrier has not changed or withdrawn it.',80));
      }else if(remaining<0){
        reasons.push(reason('promotion_past_end','Listed promotion end date is in the past; ensure the old rate is no longer offered.',95));
      }
    }
    if(reasons.length===0)continue;
    reasons.sort((a,b)=>b.importance-a.importance);
    const score=reasons[0].importance;
    const link=safeUrl(offer.url)?offer.url:null;
    items.push({
      id:offer.id,carrier:offer.carrier||'Unknown provider',
      offer:offer.plan||offer.phone||offer.id,kind:offer._type,
      priority:score>=90?'critical':score>=75?'high':score>=45?'medium':'routine',
      score,reasonCodes:reasons.map(x=>x.code),reasons:reasons.map(x=>x.why),
      officialEvidenceState:p?.state||null,sourceStatus:scan?.state||'not_checked',
      officialResearchState:published?.state||null,manualReviewStatus:review.status,
      lastCatalogReference:validDay(sourceDate)?sourceDate:null,
      link,
    });
  }
  items.sort(sortGroup);
  const blockedProviders=[];
  const byCarrier=new Map();
  for(const row of items.filter(x=>x.sourceStatus==='source_unavailable')){
    if(!byCarrier.has(row.carrier))byCarrier.set(row.carrier,{carrier:row.carrier,affected:0,offerIds:[]});
    const target=byCarrier.get(row.carrier);
    target.affected++;
    target.offerIds.push(row.id);
  }
  blockedProviders.push(...[...byCarrier.values()].sort((a,b)=>b.affected-a.affected||a.carrier.localeCompare(b.carrier)));
  return {
    schema:1,generatedAt,today,
    scope:'Review priorities only. Source reachability and partial price evidence do not verify all carrier terms.',
    method:'Deterministic dated rules; no AI, no hidden prices, no user tracking, no automated manual verification.',
    summary:{
      offers:all.length,needAttention:items.length,
      critical:items.filter(x=>x.priority==='critical').length,
      high:items.filter(x=>x.priority==='high').length,
      medium:items.filter(x=>x.priority==='medium').length,
      routine:items.filter(x=>x.priority==='routine').length,
      withoutCurrentManualReview:missingFull,
      retailerHolds:all.filter(offer=>!!offer.listingHold).length,
      stockHolds:all.filter(offer=>offer.availability==='out_of_stock').length,
      publicationEvidence:researchEvidence?{
        publishedMatches:counts.published_match,
        partial:counts.published_partial,unresearched:counts.not_researched,
        aged:counts.aged,conflictsOrInvalid:counts.conflict+counts.invalid
      }:null,
      blockedProviders:blockedProviders.length,
    },
    blockedProviders,items,
  };
}
