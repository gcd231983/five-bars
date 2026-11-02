// Read-only editorial review dashboard. Browser-only, no tracking or write API.
import {verificationState,localDay,usd} from './value-core.mjs';

const $=id=>document.getElementById(id);
const create=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(text!=null)node.textContent=String(text);
 if(cls)node.className=cls;
 return node;
};
const safeUrl=url=>{
 try{
  const parsed=new URL(url);
  return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port?parsed.href:null;
 }catch{return null;}
};
const link=(url,label)=>{
 const href=safeUrl(url);
 if(!href)return create('span','Official URL unavailable');
 const a=create('a',label);a.href=href;a.rel='noopener noreferrer';a.target='_blank';return a;
};
const button=(label,action)=>{
 const b=create('button',label);b.type='button';b.addEventListener('click',action);return b;
};
// Early beta review priorities chosen for coherent carrier comparisons and
// accessible consumer-plan source locations. They are NOT verified or endorsed.
export const BETA_REVIEW_IDS=[
 'usm-starter','usm-premium','usm-light',
 'visible','visible-plus','visible-pro',
 'tello','tello-starter','tello-power','tello-max',
 'mint','cricket-supreme'
];
const betaIds=new Set(BETA_REVIEW_IDS);
const workSteps=[
 'Standard recurring plan/device price and applicable date',
 'Promotional rate, eligibility and expiration requirements',
 'Taxes, regulatory fees, activation and full upfront payment',
 'Annual renewal, minimum service, financing and conditional credits',
 'Underlying network, IMEI/eSIM acceptance and activation rules',
 'Hotspot, high-speed data, roaming and usage restrictions',
 'Phone locking, unlocking and early-exit requirements (when relevant)',
 'Official carrier Broadband Facts or matching detailed plan terms'
];
let queue=[],catalog=null,status=null,ledger={offers:{}},research={records:{}},limit=16;
const notice=message=>{$('fb-editor-notice').textContent=message;};
async function load(path){
 const response=await fetch(path,{cache:'no-store'});
 if(!response.ok)throw Error('Unable to retrieve '+path+' (HTTP '+response.status+')');
 return response.json();
}
function fullStatus(item){
 const offer=(item.kind==='plan'?catalog.plans:catalog.phones).find(p=>p.id===item.id);
 return offer?verificationState(offer,ledger.offers?.[item.id],localDay()):
  {status:'unverified',label:'Listing no longer in catalog'};
}
function normalize(){
 const inCatalog=new Set([...catalog.plans,...catalog.phones].map(o=>o.id));
 queue=queue.filter(item=>item&&typeof item.id==='string'&&inCatalog.has(item.id));
 const carriers=[...new Set(queue.map(item=>item.carrier))].sort((a,b)=>a.localeCompare(b));
 const select=$('fb-review-carrier');
 for(const carrier of carriers){
  const option=create('option',carrier);option.value=carrier;select.append(option);
 }
}
function display(){
 const scope=$('fb-review-scope').value;
 const priority=$('fb-review-priority').value;
 const carrier=$('fb-review-carrier').value;
 const kind=$('fb-review-kind').value;
 const state=$('fb-review-state').value;
 const results=queue.filter(item=>
  (scope==='all'||betaIds.has(item.id))&&
  (priority==='all'||item.priority===priority)&&
  (carrier==='all'||item.carrier===carrier)&&
  (kind==='all'||item.kind===kind)&&
  (state==='all'||(state==='verified'?
    fullStatus(item).status==='verified':fullStatus(item).status!=='verified'))
 );
 const source=$('fb-review-results');source.replaceChildren();
 for(const item of results.slice(0,limit)){
  const record=(item.kind==='plan'?catalog.plans:catalog.phones).find(o=>o.id===item.id);
  if(!record)continue;
  const signed=fullStatus(item);
  const article=create('article',null,'fb-review-offer');
  article.setAttribute('data-offer-id',item.id);
  article.append(create('p',item.priority+' priority · '+item.kind+' · '+signed.label,'fb-review-priority'));
  article.append(create('h3',item.carrier+' — '+(item.offer||record.plan||record.phone)));
  article.append(create('p','Offer ID: '+item.id+' · catalog price: '+usd(record.price)+
    (item.kind==='plan'?'/mo equivalent if annual prepaid':' advertised device price')));
  if(record.billingMonths===12&&Number.isFinite(record.billingUpfront))
    article.append(create('p','Annual prepaid: '+usd(record.billingUpfront)+' due upfront; not a monthly bill.'));
  if(record.planPrice!=null)
    article.append(create('p','Required plan price in catalog: '+usd(record.planPrice)+'/mo; full service commitment not certified.'));
  if(record.promo){
    article.append(create('p','Catalog introductory offer: '+usd(record.promo.price)+' for '+
      record.promo.months+' month(s); '+
      (record.promo.ends?'recorded end '+record.promo.ends:'end date not specified')+
      '. Confirm eligibility and actual carrier price.'));
  }
  const reasons=Array.isArray(item.reasons)?item.reasons:[];
  const ul=create('ul');
  for(const reason of reasons.slice(0,6))ul.append(create('li',reason));
  article.append(ul);
  const official=research.records?.[item.id];
  if(official){
    const info=create('details',null,'fb-research-evidence');
    info.append(create('summary','Official published-price research ('+official.observedOn+'; not checkout)'));
    if(official.kind==='phone'){
      info.append(create('p','Official conditional DEVICE HEADLINE (not checkout): '+usd(official.publishedDevicePrice)+
        ' handset with '+usd(official.publishedPlanMonthly)+'/mo required service'+
        (official.publishedFirstMonthPlanPrice!==undefined?'; '+usd(official.publishedFirstMonthPlanPrice)+' initial service bill':'')+
        (official.publishedPrepayMonths?'; '+official.publishedPrepayMonths+' prepaid months':'')+
        (official.publishedConditionalRebate!==undefined?'; '+usd(official.publishedConditionalRebate)+' conditional reward not deducted':'')+
        (official.publishedCreditMonthly!==undefined?'; '+usd(official.publishedCreditMonthly)+'/mo future service credits for '+official.publishedCreditMonths+' months excluded from base totals':'')+
        (official.publishedFullRetailRequired?'; FULL RETAIL handset payment required (financing ineligible)':'')+
        (official.publishedAvailability==='out_of_stock'?'; recorded OUT OF STOCK; no purchasable quote':'')+
        '. No customer eligibility or full-terms sign-off.'));
    }else{
      const basis=official.billingMonths===12&&Number.isFinite(official.billingUpfront)?
        '/mo equivalent; '+usd(official.billingUpfront)+' due upfront for 12 months':
        '/mo standard published rate'+(official.publishedFirstMonthPrice!==undefined?
        '; '+usd(official.publishedFirstMonthPrice)+' first bill':'');
      info.append(create('p','Official published baseline: '+usd(official.publishedMonthly)+
        basis+(official.publishedPromoPrice!==undefined?'; eligible '+(official.publishedPromoRequirement==='new'?'new customers':'number transfers')+
        ' may receive '+usd(official.publishedPromoPrice)+'/mo for '+official.publishedPromoMonths+' month(s); not assumed automatically':'')+
        (official.publishedUndiscountedPrice!==undefined?'; full standard monthly rate without confirmed '+official.publishedDiscountCondition.replaceAll('_',' and ')+': '+usd(official.publishedUndiscountedPrice):'')+
        (official.publishedKnownMonthlyFee!==undefined?'; known monthly provider fees '+usd(official.publishedKnownMonthlyFee):'')+
        (official.publishedKnownActivationFee!==undefined?'; known one-time activation fee '+usd(official.publishedKnownActivationFee):'')+
        '. This is NOT a full-terms sign-off.'));
    }
    info.append(create('h4','Official published source links'));
    const sources=create('ul');
    for(const src of official.sources||[]){
      const li=create('li');
      li.append(link(src.url,src.supports||'Official carrier source'));
      sources.append(li);
    }
    info.append(sources);
    info.append(create('h4','Open questions for a full checkout review'));
    const questions=create('ul');
    for(const q of official.unresolved||[])questions.append(create('li',q));
    info.append(questions);
    article.append(info);
  }else{
    article.append(create('p','No dated official-source price research has been collected for this listing. Full verification remains outstanding.','fb-review-hint'));
  }
  const actions=create('div',null,'actions');
  const src=safeUrl(record.url)||safeUrl(item.link);
  if(src)actions.append(link(src,'Open official offer'));
  actions.append(link('https://github.com/gcd231983/five-bars/actions/workflows/human-review.yml',
    'Open sign-off workflow'));
  actions.append(button('Copy offer ID',()=>copy(item.id,'Offer ID')));
  article.append(actions);
  const details=create('details');
  details.append(create('summary','Human verification checklist (not a sign-off)'));
  details.append(create('p','Check each term on the actual carrier source. You must resolve discrepancies before recording an offer as fully reviewed.','fb-review-hint'));
  const checks=create('div',null,'fb-review-steps');
  const controls=[];
  for(const step of workSteps){
   const label=create('label');
   const box=create('input');box.type='checkbox';box.setAttribute('aria-label',step);
   controls.push(box);label.append(box,create('span',step));checks.append(label);
  }
  details.append(checks);
  const statusText=create('p','0 of '+workSteps.length+' items checked in this browser','fb-review-hint');
  const update=()=>{statusText.textContent=controls.filter(x=>x.checked).length+' of '+
    workSteps.length+' items checked in this browser. This does not create a verification record.';};
  controls.forEach(box=>box.addEventListener('change',update));
  details.append(statusText);
  details.append(button('Copy review worksheet',()=>{
   const text=['Five Bars manual review worksheet','Offer ID: '+item.id,
    'Carrier: '+item.carrier,'Catalog listing: '+(record.plan||record.phone),
    'Official source: '+(src||'unavailable'),
    'Review date: '+localDay(),
    'Remaining questions:'].concat(workSteps.map((name,i)=>'['+(controls[i].checked?'x':' ')+'] '+name))
     .concat(['Reviewer must check all carrier terms and explicitly attest in GitHub Actions.',
      'No full-terms review is recorded by this worksheet.']).join('\n');
   copy(text,'Review worksheet');
  }));
  article.append(details);source.append(article);
 }
 const more=$('fb-review-more');more.hidden=results.length<=limit;
 more.textContent='Show more items ('+(results.length-limit)+' remaining)';
 $('fb-review-summary').textContent=queue.length+' total catalog offers in the review queue; '+
  results.length+' match your filters ('+(scope==='shortlist'?'beta launch shortlist':'all offers')+'). '+
  results.filter(i=>fullStatus(i).status==='verified').length+
  ' currently signed off among filtered items. Showing '+Math.min(limit,results.length)+'.';
}
async function copy(content,description){
 try{await navigator.clipboard.writeText(content);notice(description+' copied.');}
 catch{
  let box=$('fb-review-copy');
  if(!box){
   box=create('textarea');box.id='fb-review-copy';box.rows=6;
   box.setAttribute('aria-label','Copy review content');
   $('fb-editor-notice').after(box);
  }
  box.value=content;box.focus();box.select();
  notice('Clipboard access blocked. Select and copy the text shown below.');
 }
}
for(const id of ['fb-review-scope','fb-review-priority','fb-review-carrier','fb-review-kind','fb-review-state']){
 $(id).addEventListener('change',()=>{limit=16;display();});
}
$('fb-review-more').addEventListener('click',()=>{limit+=16;display();});
try{
 const [rawQueue,rawCatalog,rawStatus,rawLedger,rawResearch]=await Promise.all([
  load('data/review-queue.json'),load('data/deals.json'),
  load('data/status.json'),load('data/verifications.json'),
  load('data/research-evidence.json')
 ]);
 if(!Array.isArray(rawQueue.items)||!Array.isArray(rawCatalog.plans)||
   !Array.isArray(rawCatalog.phones))throw Error('Offer data is incomplete');
 queue=rawQueue.items;catalog=rawCatalog;status=rawStatus;ledger=rawLedger;
 research=rawResearch?.schema===1&&rawResearch.records?rawResearch:{records:{}};
 normalize();display();
}catch(e){$('fb-review-summary').textContent='Review workbench could not load: '+e.message;}
