// Daily actionable alerts from documented source evidence and catalogue dates.
// No scrape failures, reachability checks, or missing human reviews trigger a notification.
// Observations are partial official headlines, NOT certified checkout prices.
import {validDay} from '../site/value-core.mjs';

const MAX_EVENTS=80;
const SCOPED_STATES=new Set(['headline_matched','headline_mismatch']);
const CONFLICT_STATES=new Set(['headline_mismatch','ambiguous','unresolved_mismatch']);
const shortText=(value,max=180)=>String(value??'').replace(/[\r\n\t<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const money=n=>'$'+Number(n).toFixed(2);
const dayMillis=day=>Date.parse(day+'T12:00:00Z');
const dayDiff=(a,b)=>Math.round((dayMillis(b)-dayMillis(a))/86400000);
function safeUrl(url){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    if(/^(localhost|127\.|0\.0\.0\.0$)/i.test(u.hostname))return null;
    return u.href;
  }catch{return null;}
}
function amount(n){return Number.isFinite(n)&&n>=0&&n<10000 ? money(n):null;}
function scopeLabel(kind){return kind==='plan'?'service-plan rate':'device and required-plan headline';}
function headlineObservation(kind,entry){
  if(kind==='plan'){
    const parts=[amount(entry.price)+'/mo'];
    if(Number.isFinite(entry.upfront))parts.push(amount(entry.upfront)+' annual upfront');
    return parts.join(' · ');
  }
  return [amount(entry.price)+' advertised device price',
    Number.isFinite(entry.planPrice)?amount(entry.planPrice)+'/mo required plan':null].filter(Boolean).join(' · ');
}
function historiesFor(kind,all){return kind==='plan'?all.mvnoHistory:all.phoneHistory;}
function evidenceFor(kind,all){return kind==='plan'?all.mvnoEvidence:all.phoneEvidence;}
function alertSort(a,b){
  const rank={critical:0,high:1};
  return Number(b.active)-Number(a.active) ||
    (rank[a.severity]??9)-(rank[b.severity]??9) ||
    b.lastSeen.localeCompare(a.lastSeen) || a.key.localeCompare(b.key);
}
function previousActive(prior,type,offerId,dueDate){
  return prior.find(x=>x?.active===true && x.type===type && x.offerId===offerId &&
    (!dueDate || x.dueDate===dueDate) && typeof x.key==='string');
}
export function buildAlertFeed({catalog,phoneEvidence={},mvnoEvidence={},
  phoneHistory={},mvnoHistory={},previousFeed={},generatedAt=new Date().toISOString(),
  today=generatedAt.slice(0,10)}){
  if(!catalog || !Array.isArray(catalog.plans) || !Array.isArray(catalog.phones) ||
     !validDay(today) || !Number.isFinite(Date.parse(generatedAt)))
    throw Error('Invalid actionable alert input');
  const prior=Array.isArray(previousFeed?.events)?previousFeed.events:[];
  const sources={phoneEvidence,mvnoEvidence,phoneHistory,mvnoHistory};
  const current=new Map();
  function add(alert){
    if(!/^(deadline|conflict|rate-change):(plan|phone):[a-z0-9._:-]{1,110}$/i.test(alert.key))
      throw Error('Unsafe notification event key');
    const known=prior.find(e=>e.key===alert.key);
    current.set(alert.key,{
      ...alert,active:true,firstSeen:validDay(known?.firstSeen)?known.firstSeen:today,lastSeen:today
    });
  }
  for(const [kind,offers] of [['plan',catalog.plans],['phone',catalog.phones]]){
    for(const offer of offers){
      const id=offer.id;
      if(typeof id!=='string'||!/^[a-z0-9._-]{1,64}$/i.test(id))continue;
      const name=shortText(offer.plan||offer.phone||id),carrier=shortText(offer.carrier||'Carrier');
      const offerUrl=safeUrl(offer.url);
      const data={offerId:id,kind,offer:name,carrier,sourceUrl:offerUrl};
      // A deadline comes from the curated *catalog*, NOT from a fresh checkout.
      const dueDate=offer.promo?.ends||offer.ends;
      if(validDay(dueDate)){
        const days=dayDiff(today,dueDate);
        if(days>=0&&days<=7){
          add({...data,key:'deadline:'+kind+':'+id+':'+dueDate,type:'deadline',
            severity:'high',dueDate,daysUntil:days,notify:true,
            title:carrier+' '+name+' — catalog promotion end date '+dueDate,
            description:'The catalog lists a promotion end date '+dueDate+
              ' ('+(days===0?'today':days+' day(s) away')+'). The carrier has not independently reconfirmed this deadline or checkout eligibility.',
            action:'Open the official offer page; verify end date, eligibility, required plan and checkout terms before updating the listing.',
            evidenceScope:'catalog_end_date_not_carrier_reconfirmed'});
        }
      }
      const report=evidenceFor(kind,sources);
      const proof=report?.offers?.[id];
      const state=proof?.state;
      const history=historiesFor(kind,sources)?.offers?.[id];
      if(state && CONFLICT_STATES.has(state)){
        const alive=previousActive(prior,'conflict',id);
        const key=alive?.key||'conflict:'+kind+':'+id+':'+today;
        const observed=Number.isFinite(proof.observedPrice)?proof.observedPrice:null;
        const observedPlan=Number.isFinite(proof.observedPlanPrice)?proof.observedPlanPrice:null;
        const observedUpfront=Number.isFinite(proof.observedUpfront)?proof.observedUpfront:null;
        const catalogCost=kind==='plan' ? amount(offer.price)+'/mo' :
          amount(offer.price)+' device'+(Number.isFinite(offer.planPrice)?' + '+amount(offer.planPrice)+'/mo plan':'');
        const observedCopy=state==='unresolved_mismatch'?
          'A previously detected price discrepancy is still unresolved. The latest scan cannot independently clear it.':
          state==='ambiguous'?
          'The official source has conflicting rate headlines; no single authoritative current price was selected.':
          'Strict official headline evidence does not match the catalog rate.';
        add({...data,key,type:'conflict',severity:'critical',notify:true,
          title:carrier+' '+name+' — official headline price requires review',
          description:observedCopy+' Catalog entry: '+catalogCost+
            (observed!==null?'. Observed headline: '+amount(observed)+
              (kind==='plan'?'/mo':' device')+
              (observedPlan!==null?' + '+amount(observedPlan)+'/mo plan':'')+
              (observedUpfront!==null?' · '+amount(observedUpfront)+' annual upfront':''):'')+
            '. This is a partial price comparison, NOT a verified checkout quote.',
          action:'Inspect the original carrier page, investigate the discrepancy, and update the catalog only after manual review.',
          evidenceScope:scopeLabel(kind),evidenceState:state,
          observedPrice:observed,observedPlanPrice:observedPlan,observedUpfront,
          sourceUrl:safeUrl(proof.sourceUrl||report.source)||offerUrl});
        // A single mismatch generates one actionable issue, not both "change"
        // and "conflict" issues for the same offer.
        continue;
      }
      if(!SCOPED_STATES.has(state) || state!=='headline_matched' || !Array.isArray(history))
        continue;
      const observed=history.filter(v=>v&&validDay(v.date)&&Number.isFinite(v.price))
        .sort((a,b)=>a.date.localeCompare(b.date));
      if(observed.length<2)continue;
      const latest=observed.at(-1);
      if(latest.date!==today)continue;
      const prev=observed.slice(0,-1).reverse().find(v=>v.date!==today);
      if(!prev)continue;
      const priorRate=Number(prev.price),newRate=Number(latest.price);
      const planChanged=kind==='phone' && Number.isFinite(prev.planPrice) &&
        Number.isFinite(latest.planPrice) && prev.planPrice!==latest.planPrice;
      const upChanged=kind==='plan' && Number.isFinite(prev.upfront) &&
        Number.isFinite(latest.upfront) && prev.upfront!==latest.upfront;
      if(priorRate===newRate&&!planChanged&&!upChanged)continue;
      add({...data,key:'rate-change:'+kind+':'+id+':'+today,type:'rate-change',
        severity:'high',notify:true,observedOn:today,priorObservation:prev.date,
        previousPrice:priorRate,currentPrice:newRate,
        title:carrier+' '+name+' — official advertised headline changed',
        description:'The selected official '+scopeLabel(kind)+' changed between dated observations: '+
          headlineObservation(kind,prev)+' → '+headlineObservation(kind,latest)+
          '. The new observed headline matches the current catalog fields. This is not full checkout, tax, eligibility, or device-compatibility verification.',
        action:'Review the original carrier terms and confirm whether the price change merits a site update or announcement.',
        evidenceScope:scopeLabel(kind),sourceUrl:safeUrl(proof.sourceUrl||report.source)||offerUrl});
    }
  }
  // Keep past alert history visible without re-notifying when a condition is gone.
  const archived=prior.filter(x=>x && typeof x.key==='string' && !current.has(x.key) &&
    /^[a-z0-9._:-]{1,160}$/i.test(x.key))
    .map(x=>({...x,active:false}))
    .slice(0,MAX_EVENTS);
  const events=[...current.values(),...archived].sort(alertSort).slice(0,MAX_EVENTS);
  return {schema:1,generatedAt,today,
    scope:'Alert triggers represent catalog deadlines and narrowly scoped observed official headline evidence. No full checkout guarantees.',
    summary:{active:events.filter(x=>x.active).length,critical:events.filter(x=>x.active&&x.severity==='critical').length,
      high:events.filter(x=>x.active&&x.severity==='high').length,
      historical:events.filter(x=>!x.active).length},
    events};
}
