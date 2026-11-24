export const GROUPS=Object.freeze({
 instant:'Instant $0 device discounts',
 credits:'$0 devices after monthly bill credits',
 device:'Other device and gift-card deals',
 plan:'Service-plan deals'
});
const DATE=/^\d{4}-\d\d-\d\d$/;
const INSTANT=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;
const validDay=(v)=>typeof v==='string'&&DATE.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const validInstant=(v)=>typeof v==='string'&&INSTANT.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().replace('.000','')===v;
export function sourceUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url.href:null;
 }catch{return null;}
}
export function validOffers(data){
 if(data?.schema!==1||!Array.isArray(data.offers))return false;
 const ids=new Set();
 return data.offers.every(row=>{
  if(!row||!Object.hasOwn(GROUPS,row.group)||!['id','carrier','title','price','cost','terms'].every(k=>typeof row[k]==='string'&&row[k].trim())||
     !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)||ids.has(row.id)||!validDay(row.checked)||!sourceUrl(row.source)||
     (row.startAt!=null&&(!validInstant(row.startAt)||typeof row.opens!=='string'||!row.opens.trim()))||
     (row.endAt!=null&&(!validInstant(row.endAt)||typeof row.deadline!=='string'||!row.deadline.trim()))||
     (row.startAt&&row.endAt&&Date.parse(row.startAt)>=Date.parse(row.endAt)))return false;
  ids.add(row.id);return true;
 });
}
export function offerState(row,now=new Date()){
 const ms=now.getTime();
 const checked=Date.parse(row.checked);
 if(!Number.isFinite(ms)||!Number.isFinite(checked)||ms<checked)return 'recheck';
 if(row.endAt&&ms>=Date.parse(row.endAt))return 'ended';
 if(row.startAt&&ms<Date.parse(row.startAt))return 'scheduled';
 // Open-ended offers need fresh evidence. A future-dated advertised deadline is
 // not proof of continued stock or eligibility, but does give a dated source window.
 return !row.endAt&&ms-checked>=7*864e5?'recheck':'published';
}
