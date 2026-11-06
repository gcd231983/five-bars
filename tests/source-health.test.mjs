import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {classifySourceFailure,withSourceHistory,withOfferLinkHistory,persistentSourceFailures} from '../scripts/source-health.mjs';

const url='https://tello.com/buy/custom_plans';
const blocked=(status=403)=>({name:'Tello plans',url,ok:false,status,note:'HTTP '+status});

test('403 blocks prove scanner access restrictions, not price changes or withdrawn offers',()=>{
 assert.equal(classifySourceFailure(blocked()),'automated_access_blocked');
 assert.equal(classifySourceFailure(blocked(429)),'rate_limited');
 assert.equal(classifySourceFailure(blocked(503)),'source_server_error');
 assert.equal(classifySourceFailure({ok:false,note:'Page exceeded 1.5 MB safety limit'}),'response_too_large');
 assert.equal(classifySourceFailure({ok:false,note:'Request timed out'}),'request_timeout');
 assert.equal(classifySourceFailure({ok:false,note:'Unexpected redirect destination'}),'unexpected_redirect');
 assert.equal(classifySourceFailure({ok:true,status:200}),null);
});

test('source failure start persists across scans and resets after an actual successful fetch',()=>{
 const t0='2026-11-05T10:17:00.000Z';
 const t1='2026-11-06T10:17:00.000Z';
 const t2='2026-11-07T10:17:00.000Z';
 const t3='2026-11-08T10:17:00.000Z';
 const t4='2026-11-09T10:17:00.000Z';
 const previous={name:'Tello plans',url,ok:true,status:200};
 const first=withSourceHistory(blocked(),previous,t1,t0);
 assert.equal(first.unavailableSince,t1);
 assert.equal(first.lastReachableAt,t0);
 assert.equal(first.failureReason,'automated_access_blocked');
 const continued=withSourceHistory(blocked(),first,t2,t1);
 assert.equal(continued.unavailableSince,t1);
 assert.equal(continued.lastReachableAt,t0);
 const recovered=withSourceHistory({name:'Tello plans',url,ok:true,status:200},continued,t3,t2);
 assert.equal(recovered.unavailableSince,null);
 assert.equal(recovered.failureReason,null);
 assert.equal(recovered.lastReachableAt,t3);
 const later=withSourceHistory(blocked(),recovered,t4,t3);
 assert.equal(later.unavailableSince,t4);
 assert.equal(later.lastReachableAt,t3);
 assert.equal(previous.ok,true,'historical data is not modified');
});

test('upgraded old failed records inherit prior scan timestamp but never trust future timestamps',()=>{
 const previous={name:'Tello plans',url,ok:false,status:403};
 const prevAt='2026-11-05T10:17:00.000Z',at='2026-11-06T10:17:00.000Z';
 assert.equal(withSourceHistory(blocked(),previous,at,prevAt).unavailableSince,prevAt);
 const tampered={...previous,unavailableSince:'2030-01-01T00:00:00.000Z'};
 assert.equal(withSourceHistory(blocked(),tampered,at,prevAt).unavailableSince,prevAt);
 assert.equal(withSourceHistory(blocked(),{...previous,url:'https://other.example/'},at,prevAt).unavailableSince,at);
 assert.throws(()=>withSourceHistory(blocked(),null,'not a timestamp'),/timestamp/);
});

test('persistent-source totals count elapsed age, not repeated same-day workflow runs',()=>{
 const now='2026-11-14T10:17:00.000Z';
 const older=withSourceHistory(blocked(),null,'2026-11-06T10:17:00.000Z');
 const recent=withSourceHistory(blocked(),null,'2026-11-13T10:17:00.000Z');
 const healthy=withSourceHistory({name:'Tello plans',url,ok:true,status:200},null,'2026-11-06T10:17:00.000Z');
 assert.equal(persistentSourceFailures([older,recent,healthy],now),1);
 assert.equal(persistentSourceFailures([older,recent,healthy],now,10),0);
});

test('source panel explains blocked checks without claiming a withdrawn or verified deal',()=>{
 const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 const fn=html.match(/^function renderSources\(\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(fn,'Source panel function must exist');
 const observed=new Date().toISOString();
 const source={name:'Tello plans',url,what:'Official plan source'};
 let sources=[];
 const nodes={
  '#src-date':{textContent:''},
  '#scan-status':{textContent:''},
  '#src-list':{replaceChildren(...items){sources=items;}}
 };
 const el=(tag,props,...children)=>({tag,props,children});
 runInNewContext(fn+';renderSources();',{
  $:selector=>nodes[selector],
  CHECKED:'2026-10-29',
  SOURCES:[source],
  AUTO_STATUS:{
   generatedAt:observed,
   summary:{sourcesChecked:1,sourcesReachable:0,sourcesAccessBlocked:1,
    sourcesUnavailableFor7Days:1,priceCandidatesForReview:0,reviewAlerts:1},
   sources:[{...blocked(),failureReason:'automated_access_blocked',unavailableSince:'2026-10-28T10:17:00.000Z'}]
  },el
 });
 const rendered=JSON.stringify(sources);
 assert.match(rendered,/automated scanner access restricted/i);
 assert.match(rendered,/do not assume the offer ended/i);
 assert.match(nodes['#scan-status'].textContent,/1 sources restrict automated access/);
 assert.match(nodes['#scan-status'].textContent,/1 sources have been unavailable/);
 assert.doesNotMatch(rendered,/checkout verified|price confirmed/i);
});

test('official Tello publication remains an attributed historical fallback, not proof of a live price',()=>{
 const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 const fn=html.match(/^function renderSources\(\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(fn);
 const publication={
   url:'https://blog.tello.com/news/halloween-deal-10gb-for-10-mo-first-3-months/',
   publishedOn:'2026-10-22',
   scope:'Carrier-published terms only. Not live checkout, taxes or current eligibility verification.'
 };
 function view(ref){
   let rows=[];
   const nodes={
     '#src-date':{textContent:''},'#scan-status':{textContent:''},
     '#src-list':{replaceChildren(...items){rows=items;}}
   };
   runInNewContext(fn+';renderSources();',{
     URL,
     $:selector=>nodes[selector],
     CHECKED:'2026-10-29',
     SOURCES:[{name:'Tello plans',url:'https://tello.com/buy/custom_plans',
       what:'Official monthly tiers',officialPublication:ref}],
     AUTO_STATUS:{generatedAt:new Date().toISOString(),summary:{
       sourcesChecked:1,sourcesReachable:0,reviewAlerts:0},
       sources:[{url:'https://tello.com/buy/custom_plans',ok:false,
         failureReason:'automated_access_blocked'}]},
     el:(tag,props,...children)=>({tag,props,children})
   });
   return JSON.stringify(rows);
 }
 const result=view(publication);
 assert.match(result,/Dated official carrier publication/);
 assert.match(result,/2026-10-22/);
 assert.match(result,/https:\/\/blog\.tello\.com\/news\/halloween/);
 assert.match(result,/Not live checkout, taxes or current eligibility verification/);
 assert.match(result,/do not assume the offer ended/);
 const thirdParty=view({...publication,url:'https://example.com/claim'});
 assert.doesNotMatch(thirdParty,/read published terms/);
 const insecure=view({...publication,url:'http://blog.tello.com/news/claim'});
 assert.doesNotMatch(insecure,/read published terms/);
 const malformed=view({...publication,publishedOn:'tomorrow'});
 assert.doesNotMatch(malformed,/read published terms/);
 const impossible=view({...publication,publishedOn:'2026-02-30'});
 assert.doesNotMatch(impossible,/read published terms/);
 const future=view({...publication,publishedOn:'2099-01-01'});
 assert.doesNotMatch(future,/read published terms/);
});

test('November US Mobile first-party guide links remain dated historical alternatives when scans are blocked',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
 const names=['US Mobile family plan guide','US Mobile prepaid plan guide'];
 const refs=names.map(name=>catalog.sources.find(s=>s.name===name));
 for(const src of refs){
   assert.ok(src?.officialPublication,'Official publication entry must exist');
   assert.equal(src.officialPublication.publishedOn,'2026-11-03');
   assert.equal(new URL(src.officialPublication.url).hostname,'www.usmobile.com');
   assert.match(src.officialPublication.url,/november-2026\/$/);
   assert.match(src.officialPublication.scope,/not (current )?checkout/i);
   assert.ok(src.url.startsWith('https://www.usmobile.com/'),'Original source link stays intact');
 }
 const fn=readFileSync(new URL('../site/index.html',import.meta.url),'utf8')
   .match(/^function renderSources\(\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(fn);
 let rendered=[];
 const nodes={'#src-date':{textContent:''},'#scan-status':{textContent:''},
   '#src-list':{replaceChildren(...rows){rendered=rows;}}};
 runInNewContext(fn+';renderSources();',{
   URL,
   $:selector=>nodes[selector],
   CHECKED:'2026-10-29',SOURCES:refs,
   AUTO_STATUS:{generatedAt:new Date().toISOString(),
     summary:{sourcesChecked:2,sourcesReachable:0,reviewAlerts:2},
     sources:refs.map(x=>({url:x.url,ok:false,failureReason:'automated_access_blocked'}))},
   el:(tag,props,...children)=>({tag,props,children})
 });
 const output=JSON.stringify(rendered);
 assert.equal(rendered.length,2);
 assert.match(output,/family-phone-plans-november-2026/);
 assert.match(output,/best-prepaid-phone-plans-november-2026/);
 assert.equal((output.match(/Dated official carrier publication/g)||[]).length,2);
 assert.equal((output.match(/do not assume the offer ended/g)||[]).length,2);
 assert.doesNotMatch(output,/checkout verified|guaranteed rate/i);
});

test('per-offer link history starts fresh, preserves only matching URL failures, and resets on recovery',()=>{
 const url='https://tello.com/buy/custom_plans';
 const t0='2026-11-01T15:00:00.000Z',t1='2026-11-08T15:00:00.000Z';
 const first=withOfferLinkHistory({sourceUrl:url,state:'source_unavailable',checkedAt:t0},null);
 assert.equal(first.unavailableSince,t0);
 assert.equal(first.lastReachableAt,null);
 const next=withOfferLinkHistory({sourceUrl:url,state:'source_unavailable',checkedAt:t1},
   {state:'source_unavailable',checkedAt:t0,...first});
 assert.equal(next.unavailableSince,t0,'same purchase URL retains known outage interval');
 const changed=withOfferLinkHistory({sourceUrl:'https://tello.com/new-offer',state:'source_unavailable',checkedAt:t1},
   {state:'source_unavailable',checkedAt:t0,...first});
 assert.equal(changed.unavailableSince,t1,'different promotion URL cannot inherit unrelated 7-day outage');
 const recovered=withOfferLinkHistory({sourceUrl:url,state:'source_reachable',checkedAt:t1},
   {state:'source_unavailable',checkedAt:t0,...first});
 assert.equal(recovered.unavailableSince,null);
 assert.equal(recovered.lastReachableAt,t1);
 const failedAgain=withOfferLinkHistory({sourceUrl:url,state:'source_unavailable',checkedAt:'2026-11-09T15:00:00Z'},
   {state:'source_reachable',checkedAt:t1,...recovered});
 assert.equal(failedAgain.unavailableSince,'2026-11-09T15:00:00Z');
 assert.equal(failedAgain.lastReachableAt,t1);
 const future=withOfferLinkHistory({sourceUrl:url,state:'source_unavailable',checkedAt:t1},
   {state:'source_unavailable',checkedAt:t0,sourceUrl:url,unavailableSince:'2099-01-01T00:00:00Z'});
 assert.equal(future.unavailableSince,t0,'future-dated outage must not be trusted');
 assert.throws(()=>withOfferLinkHistory({sourceUrl:'http://example.com',state:'source_unavailable',checkedAt:t1}),/HTTPS/);
 assert.throws(()=>withOfferLinkHistory({sourceUrl:url,state:'price_verified',checkedAt:t1}),/link state/);
});
