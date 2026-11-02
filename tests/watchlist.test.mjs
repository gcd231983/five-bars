import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWatchlist,watchKey,addWatch,removeWatch,checkWatchlist,markAlertsSeen,
  MAX_WATCHES,WATCHLIST_STORAGE_KEY
} from '../site/watchlist-core.mjs';

const catalog={
  plans:[
    {id:'tello',carrier:'Tello',plan:'Everyday 10GB',price:15,net:'tmo'},
    {id:'tello-starter',carrier:'Tello',plan:'Starter',price:10,net:'tmo'},
    {id:'helium-air',carrier:'Helium Mobile',plan:'Air',price:15,net:'tmo'},
    {id:'good2go-annual1',carrier:'Good2Go Mobile',plan:'1GB Annual',price:5,billingMonths:12,billingUpfront:60,net:'multi'}
  ],
  phones:[
    {id:'metro-a17',carrier:'Metro by T-Mobile',phone:'Galaxy A17',price:0,planPrice:40},
    {id:'tello-phone',carrier:'Tello',phone:'Model X',price:80,planPrice:25},
    {id:'expired-phone',carrier:'Tello',phone:'Old phone',price:0,ends:'2026-11-01'}
  ]
};
const now=new Date('2026-11-02T16:00:00Z');
const feeds={catalog,
  phoneEvidence:{offers:{}},mvnoEvidence:{offers:{}},
  siteAlerts:{events:[],summary:{active:0}},
  status:{generatedAt:'2026-11-02T15:50:00Z'},
  today:'2026-11-02',now};
const check=(state,extras={})=>checkWatchlist(state,{...feeds,...extras});
test('local versioned watchlist stores only known catalog plan, phone and carrier selectors',()=>{
 const parsed=normalizeWatchlist({schema:1,watches:[
  {kind:'plan',id:'tello',target:15},
  {kind:'phone',id:'metro-a17',target:0},
  {kind:'carrier',id:'Tello',target:null},
  {kind:'plan',id:'missing',target:1},
  {kind:'carrier',id:'not real',target:1},
  {kind:'plan',id:'tello',target:5}
 ]},catalog);
 assert.equal(parsed.watches.length,3);
 assert.deepEqual(parsed.watches.map(w=>watchKey(w)),['plan:tello','phone:metro-a17','carrier:Tello']);
 assert.equal(parsed.watches[1].target,0);
 assert.equal(WATCHLIST_STORAGE_KEY,'fivebars-watchlist-v1');
});
test('add/remove and threshold updates work without accounts or server state',()=>{
 let state=normalizeWatchlist(null,catalog);
 state=addWatch(state,{kind:'plan',id:'tello',target:''},catalog);
 assert.equal(state.watches[0].target,null);
 state=addWatch(state,{kind:'plan',id:'tello',target:'12.159'},catalog);
 assert.equal(state.watches.length,1);
 assert.equal(state.watches[0].target,12.16);
 state=addWatch(state,{kind:'phone',id:'metro-a17',target:0},catalog);
 assert.equal(state.watches.length,2);
 state=removeWatch(state,'plan:tello',catalog);
 assert.deepEqual(state.watches.map(w=>w.id),['metro-a17']);
});
test('strict price bounds prevent malformed and negative saved targets',()=>{
 for(const target of [-1,2001,'oops',Infinity,'NaN']){
  assert.throws(()=>addWatch({watches:[]},{kind:'phone',id:'metro-a17',target},catalog));
 }
 for(const id of ['missing','<img src=x>','../../../danger']){
  assert.throws(()=>addWatch({watches:[]},{kind:'phone',id,target:0},catalog));
 }
 const many={plans:Array.from({length:MAX_WATCHES+5},(_,i)=>({id:'p'+i,carrier:'Tello',plan:'Plan '+i,price:10})),phones:[]};
 const payload={watches:many.plans.map(p=>({kind:'plan',id:p.id,target:null}))};
 assert.equal(normalizeWatchlist(payload,many).watches.length,MAX_WATCHES);
 assert.throws(()=>addWatch(normalizeWatchlist(payload,many),{kind:'plan',id:'p30',target:5},many),/full/);
});
test('standard plan threshold is separate from introductory rates and annual prepaid cash',()=>{
 const watches={watches:[
  {kind:'plan',id:'tello',target:14},
  {kind:'plan',id:'good2go-annual1',target:5},
 ]};
 const result=check(watches);
 assert.equal(result.targetMatches.length,1);
 assert.equal(result.targetMatches[0].id,'good2go-annual1');
 assert.equal(result.targetMatches[0].annual,true);
 assert.equal(result.targetMatches[0].upfront,60);
 assert.match(result.targetMatches[0].caution,/NOT independently confirmed/);
});
test('phone target measures advertised handset sticker price only',()=>{
 const r=check({watches:[{kind:'phone',id:'metro-a17',target:0}]});
 assert.equal(r.targetMatches.length,1);
 assert.equal(r.targetMatches[0].rate,0);
 assert.equal(r.targetMatches[0].kind,'phone');
 assert.equal(r.targetMatches[0].carrier,'Metro by T-Mobile');
});
test('provider watches match relevant events; targets apply to PLAN rates, not handset prices',()=>{
 const watch={watches:[{kind:'carrier',id:'Tello',target:15}]};
 const result=check(watch,{siteAlerts:{events:[
  {active:true,key:'deadline:plan:tello:2026-11-09',type:'deadline',kind:'plan',offerId:'tello',carrier:'Tello',title:'Tello deadline',description:'Check the deal',severity:'high'},
  {active:true,key:'conflict:phone:metro-a17:2026-11-02',type:'conflict',kind:'phone',offerId:'metro-a17',carrier:'Metro by T-Mobile',title:'Metro conflict',severity:'critical'},
  {active:false,key:'rate-change:plan:tello:2026-11-01',type:'rate-change',kind:'plan',offerId:'tello',carrier:'Tello',title:'Old rate'}
 ]}});
 assert.equal(result.targetMatches.length,2);
 assert.ok(result.targetMatches.every(m=>m.kind==='plan'));
 assert.equal(result.alerts.filter(a=>a.type==='deadline').length,1);
 assert.equal(result.alerts.filter(a=>a.type==='conflict').length,0);
});
test('price disputes are never presented as target matches even when advertised under budget',()=>{
 const r=check({watches:[{kind:'phone',id:'metro-a17',target:5},{kind:'plan',id:'tello-starter',target:15}]},
  {phoneEvidence:{offers:{'metro-a17':{state:'headline_mismatch'}}},
   mvnoEvidence:{offers:{'tello-starter':{state:'unresolved_mismatch'}}}});
 assert.equal(r.targetMatches.length,0);
});
test('manual review holds and malformed annual billing never trigger personal target matches',()=>{
 const flagged=check({watches:[{kind:'phone',id:'metro-a17',target:5}]},{
   status:{generatedAt:'2026-11-02T15:50:00Z',offers:{'metro-a17':{reviewRequired:true}}}
 });
 assert.equal(flagged.targetMatches.length,0);
 const broken=structuredClone(catalog);
 delete broken.plans.find(p=>p.id==='good2go-annual1').billingUpfront;
 const plan=check({watches:[{kind:'plan',id:'good2go-annual1',target:5}]},{catalog:broken});
 assert.equal(plan.targetMatches.length,0);
});
test('stale or absent source scan pauses target matches, not genuine saved watch entries',()=>{
 const r=check({watches:[{kind:'plan',id:'tello',target:20}]},{status:{generatedAt:'2026-10-25T15:00:00Z'}});
 assert.equal(r.fresh,false);
 assert.equal(r.targetMatches.length,0);
 assert.equal(r.watches.length,1);
 assert.match(r.note,/paused/);
});
test('explicitly expired handset deals never meet target conditions',()=>{
 const r=check({watches:[{kind:'phone',id:'expired-phone',target:1}]});
 assert.deepEqual(r.targetMatches,[]);
});
test('overlapping provider and offer watches show one event; reviewed status survives local JSON export',()=>{
 const state={watches:[{kind:'carrier',id:'Tello',target:20},{kind:'plan',id:'tello',target:20}]};
 const event={active:true,key:'deadline:plan:tello:2026-11-09',type:'deadline',kind:'plan',offerId:'tello',carrier:'Tello',title:'Tello deadline'};
 const result=check(state,{siteAlerts:{events:[event]}});
 assert.equal(result.alerts.filter(a=>a.type==='deadline').length,1);
 const after=markAlertsSeen(state,result.unread.map(x=>x.key),catalog);
 const exported=JSON.parse(JSON.stringify(after));
 assert.equal(check(exported,{siteAlerts:{events:[event]}}).unread.length,0);
});
test('empty watchlist generates no targeted or carrier event notifications',()=>{
 const result=check({watches:[]},{siteAlerts:{events:[
  {active:true,key:'deadline:plan:tello:2026-11-09',type:'deadline',kind:'plan',offerId:'tello',carrier:'Tello',title:'Tello deadline'}
 ]}});
 assert.equal(result.alerts.length,0);
});
