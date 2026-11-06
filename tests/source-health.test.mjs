import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {classifySourceFailure,withSourceHistory,persistentSourceFailures} from '../scripts/source-health.mjs';

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
