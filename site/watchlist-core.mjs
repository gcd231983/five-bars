// Five Bars local-only watchlists. No accounts, remote notifications, or network calls.
// Prices represent listed catalog numbers, NOT guaranteed checkout offers.
import {validDay,pastEnd} from './value-core.mjs';

export const WATCHLIST_STORAGE_KEY='fivebars-watchlist-v1';
export const MAX_WATCHES=30;
const MAX_SEEN=300;
const idPattern=/^[a-z0-9._-]{1,70}$/i;
const MAX_TARGET=2000;
const short=s=>String(s).slice(0,110);
export function watchKey(item){return item.kind+':'+item.id;}
const round=n=>Math.round(n*100)/100;
export function normalizeWatchlist(input,catalog) {
  const raw=typeof input==='string'?JSON.parse(input):input;
  const data=Array.isArray(raw)?{watches:raw}:raw;
  const result={schema:1,watches:[],seen:[]};
  if(!data || typeof data!=='object')return result;
  const plans=new Set((catalog?.plans||[]).map(x=>x.id));
  const phones=new Set((catalog?.phones||[]).map(x=>x.id));
  const carriers=new Set([...(catalog?.plans||[]),...(catalog?.phones||[])].map(x=>x.carrier));
  const haveCatalog=catalog && Array.isArray(catalog.plans) && Array.isArray(catalog.phones);
  const taken=new Set();
  for(const item of Array.isArray(data.watches)?data.watches:[]){
    if(!item || !['plan','phone','carrier'].includes(item.kind))continue;
    if(typeof item.id!=='string'||item.id.length>110)continue;
    if(item.kind==='carrier'? !carriers.has(item.id) : !idPattern.test(item.id))continue;
    if(haveCatalog && item.kind==='plan' && !plans.has(item.id))continue;
    if(haveCatalog && item.kind==='phone' && !phones.has(item.id))continue;
    const key=watchKey(item);
    if(taken.has(key))continue;
    const target=item.target===null||item.target===undefined||item.target===''?null:Number(item.target);
    if(target!==null && (!Number.isFinite(target)||target<0||target>MAX_TARGET))continue;
    taken.add(key);
    result.watches.push({kind:item.kind,id:item.id,target:target===null?null:round(target)});
    if(result.watches.length>=MAX_WATCHES)break;
  }
  const seen=new Set();
  for(const v of Array.isArray(data.seen)?data.seen:[]){
    if(typeof v==='string'&&v.length<=220&&/^[a-z0-9:._|-]+$/i.test(v)&&!seen.has(v)){
      seen.add(v);
      result.seen.push(v);
    }
    if(result.seen.length>=MAX_SEEN)break;
  }
  return result;
}
export function addWatch(data,watch,catalog){
  const current=normalizeWatchlist(data,catalog);
  const probe=normalizeWatchlist({watches:[watch]},catalog).watches[0];
  if(!probe)throw Error('Invalid watch selection or target');
  const key=watchKey(probe),exists=current.watches.some(x=>watchKey(x)===key);
  if(!exists && current.watches.length>=MAX_WATCHES)throw Error('Watchlist is full (30 maximum)');
  return {...current,watches:exists?current.watches.map(x=>watchKey(x)===key?probe:x):[...current.watches,probe]};
}
export function removeWatch(data,key,catalog){
  const state=normalizeWatchlist(data,catalog);
  return {...state,watches:state.watches.filter(x=>watchKey(x)!==key)};
}
const disputeState=new Set(['headline_mismatch','ambiguous','unresolved_mismatch']);
function disputed(offer,kind,evidence){
  const report=kind==='plan'?evidence.mvnoEvidence:evidence.phoneEvidence;
  return disputeState.has(report?.offers?.[offer.id]?.state);
}
function scanIsFresh(status,nowMs){
  const stamp=Date.parse(status?.generatedAt);
  const age=nowMs-stamp;
  return Number.isFinite(stamp)&&age>=-60*60*1000&&age<=48*60*60*1000;
}
export function checkWatchlist(data,{catalog,phoneEvidence={},mvnoEvidence={},
  siteAlerts={},status={},today,now=new Date()}={}){
  const state=normalizeWatchlist(data,catalog);
  const day=today||new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if(!validDay(day))throw Error('Invalid watchlist check date');
  const nowMs=now instanceof Date?now.getTime():Date.parse(now);
  const fresh=scanIsFresh(status,nowMs);
  const evidence={phoneEvidence,mvnoEvidence};
  const plans=catalog?.plans||[], phones=catalog?.phones||[];
  const savedKeys=new Set(state.watches.map(watchKey));
  const seen=new Set(state.seen);
  const alerts=new Map();
  const targets=new Map();
  const offerFor=(kind,id)=>(kind==='plan'?plans:phones).find(p=>p.id===id);
  function storeTarget(offer,kind,watch){
    // Monthly service target = catalog standard monthly/equivalent, not
    // introductory, auto-pay, family pricing or final checkout price.
    // Phone target = sticker device price, excluding required plan, rebates and fees.
    if(watch.target===null)return;
    if(!fresh || disputed(offer,kind,evidence))return;
    if(kind==='phone'&&pastEnd(offer.ends,day))return;
    const price=Number(offer.price);
    if(!Number.isFinite(price)||price<0||price>watch.target)return;
    const key=kind+':'+offer.id;
    if(!targets.has(key)){
      targets.set(key,{
        key:'target|'+watchKey(watch)+'|'+key+'|'+price.toFixed(2),
        kind,id:offer.id,carrier:offer.carrier,name:kind==='plan'?offer.plan:offer.phone,
        rate:round(price),threshold:watch.target,annual:kind==='plan'&&offer.billingMonths===12,
        upfront:kind==='plan'&&offer.billingMonths===12?offer.billingUpfront:null,
        url:offer.url,
        caution:'Catalog price meets your target; taxes, eligibility and checkout terms are NOT independently confirmed.'
      });
    }
  }
  for(const w of state.watches){
    if(w.kind==='carrier'){
      const matches=[...plans.map(p=>({offer:p,kind:'plan'})),
        ...phones.map(p=>({offer:p,kind:'phone'}))].filter(x=>x.offer.carrier===w.id);
      if(w.target!==null){
        // Carrier-target means standard PLAN monthly equivalent only,
        // never a phone-price comparison against a service threshold.
        for(const m of matches.filter(x=>x.kind==='plan'))storeTarget(m.offer,m.kind,w);
      }
    }else{
      const offer=offerFor(w.kind,w.id);
      if(offer)storeTarget(offer,w.kind,w);
    }
  }
  for(const event of Array.isArray(siteAlerts.events)?siteAlerts.events:[]){
    if(!event?.active || !['deadline','conflict','rate-change'].includes(event.type))continue;
    if(typeof event.key!=='string'||event.key.length>180)continue;
    const matching=state.watches.some(w=>
      (w.kind===event.kind&&w.id===event.offerId) ||
      (w.kind==='carrier'&&w.id===event.carrier));
    if(!matching)continue;
    const key='site|'+event.key;
    if(!alerts.has(key)){
      alerts.set(key,{
        key,title:short(event.title),description:short(event.description),
        kind:event.kind,id:event.offerId,carrier:event.carrier,
        url:event.sourceUrl,priority:event.severity||'high',
        type:event.type
      });
    }
  }
  const targetMatches=[...targets.values()].sort((a,b)=>a.rate-b.rate||a.carrier.localeCompare(b.carrier));
  const allAlerts=[
    ...[...alerts.values()].sort((a,b)=>a.priority==='critical'?-1:b.priority==='critical'?1:0),
    ...targetMatches.map(t=>({...t,title:t.name+' meets target',
      description:t.caution,priority:'target',type:'target'}))
  ];
  return {
    watches:state.watches,targetMatches,alerts:allAlerts,
    unread:allAlerts.filter(x=>!seen.has(x.key)),
    fresh,checkedAt:status?.generatedAt||null,
    sourceCount:siteAlerts?.summary?.active||0,
    note:fresh?'Catalog scan is recent. Listed thresholds are not checkout guarantees.':
      'Latest catalog source scan is more than 48 hours old or unavailable; target-price matches are paused.'
  };
}
export function markAlertsSeen(data,keys,catalog){
  const state=normalizeWatchlist(data,catalog),found=new Set(state.seen);
  for(const key of Array.isArray(keys)?keys:[]){
    if(typeof key==='string'&&/^[a-z0-9:._|-]{1,220}$/i.test(key))found.add(key);
  }
  return {...state,seen:[...found].slice(-MAX_SEEN)};
}
