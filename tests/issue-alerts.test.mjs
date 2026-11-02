import test from 'node:test';
import assert from 'node:assert/strict';
import {syncIssueAlerts,issueBody,marker} from '../scripts/issue-alerts.mjs';

const evt={
 key:'deadline:plan:tello:2026-11-09',type:'deadline',severity:'high',active:true,notify:true,
 offerId:'tello',offer:'Everyday 10GB',carrier:'Tello',
 title:'Tello Everyday 10GB — catalog promotion end date 2026-11-09',
 description:'Catalog promotion expires 2026-11-09; carrier terms not independently verified.',
 action:'Inspect official source before changing the catalog.',
 evidenceScope:'catalog_end_date_not_carrier_reconfirmed',dueDate:'2026-11-09',
 sourceUrl:'https://tello.com/buy/custom_plans',
};
const data=(events=[evt])=>({schema:1,generatedAt:'2026-11-02T14:00:00Z',events});
function mockApi(initial=[]){
 const issues=structuredClone(initial),requests=[];
 const fake=async(url,init)=>{
  requests.push({url,init});
  if(init.method==='GET')return new Response(JSON.stringify(issues),{status:200,headers:{'content-type':'application/json'}});
  if(init.method==='POST'){
   const payload=JSON.parse(init.body);
   const item={...payload,number:issues.length+1,state:'open',
     html_url:'https://github.com/gcd231983/five-bars/issues/'+(issues.length+1)};
   issues.push(item);
   return new Response(JSON.stringify(item),{status:201,headers:{'content-type':'application/json'}});
  }
  throw Error('Unexpected request '+init.method);
 };
 return {issues,requests,fake};
}
const config=(fake,extra={})=>({repository:'gcd231983/five-bars',token:'mock-token',owner:'gcd231983',fetchImpl:fake,...extra});

test('first actionable deadline creates one Github issue assigned to the owner',async()=>{
 const {issues,requests,fake}=mockApi();
 const result=await syncIssueAlerts(data(),config(fake));
 assert.equal(result.created,1);
 assert.equal(issues.length,1);
 assert.deepEqual(issues[0].assignees,['gcd231983']);
 assert.match(issues[0].body,/<!-- five-bars-event:deadline:plan:tello:2026-11-09 -->/);
 assert.match(issues[0].body,/partial official headline observations/);
 assert.equal(requests.filter(x=>x.init.method==='POST').length,1);
 assert.ok(requests.every(r=>r.init.headers.authorization==='Bearer mock-token'));
});
test('following scans never repost unchanged events, even if user manually closed an issue',async()=>{
 const api=mockApi();
 const first=await syncIssueAlerts(data(),config(api.fake));
 assert.equal(first.created,1);
 const twice=await syncIssueAlerts(data(),config(api.fake));
 assert.equal(twice.created,0);
 assert.equal(twice.deduplicated,1);
 api.issues[0].state='closed';
 const closed=await syncIssueAlerts(data(),config(api.fake));
 assert.equal(closed.created,0);
 assert.equal(closed.manualClosed,1);
 assert.equal(api.requests.filter(x=>x.init.method==='POST').length,1);
 assert.equal(api.requests.filter(x=>x.init.method==='PATCH').length,0);
});
test('different scoped alert types or a future deadline legitimately create distinct issue keys',async()=>{
 const api=mockApi();
 const next={...evt,key:'deadline:plan:tello:2026-12-09',dueDate:'2026-12-09'};
 const conflict={...evt,key:'conflict:plan:tello:2026-11-02',type:'conflict'};
 const result=await syncIssueAlerts(data([evt,next,conflict]),config(api.fake));
 assert.equal(result.created,3);
 assert.equal(new Set(api.issues.map(i=>i.body.match(/<!-- five-bars-event:(.*?) -->/)[1])).size,3);
});
test('pull requests cannot spoof event markers to suppress a real issue',async()=>{
 const pr={body:issueBody(evt),pull_request:{url:'https://api.github.com/pulls/7'},state:'open'};
 const api=mockApi([pr]);
 const result=await syncIssueAlerts(data(),config(api.fake));
 assert.equal(result.created,1);
});
test('dry-run previews safe summaries but does not mutate GitHub issues',async()=>{
 const api=mockApi();
 const result=await syncIssueAlerts(data(),config(api.fake,{dryRun:true}));
 assert.equal(result.created,0);
 assert.equal(result.preview,true);
 assert.equal(result.issueUrls.length,1);
 assert.equal(api.requests.filter(x=>x.init.method==='POST').length,0);
});
test('notifier rejects missing permission, unsafe repository names and malformed events',async()=>{
 const api=mockApi();
 await assert.rejects(syncIssueAlerts(data(),config(api.fake,{token:''})),/Missing GITHUB_TOKEN/);
 await assert.rejects(syncIssueAlerts(data(),config(api.fake,{repository:'http://malicious.example/' })),/owner\/repo/);
 await assert.rejects(syncIssueAlerts(data([{...evt,key:'deadline:plan:<script>'}]),config(api.fake)),/Invalid event key/);
 assert.throws(()=>marker('bad-key'),/Invalid/);
});
test('issue bodies never embed arbitrary HTML or raw carrier markdown input',()=>{
 const strange={...evt,offer:'[prize](https://fake.example)<script>',carrier:'@everyone',
  description:'**surprise** <img src=x> [click here](https://evil.example)'};
 const body=issueBody(strange);
 assert.doesNotMatch(body,/<script>|<img/);
 assert.ok(body.includes('\\*\\*surprise\\*\\*'), 'carrier-marketing markdown must be escaped');
 assert.doesNotMatch(body,/https:\/\/evil\.example\)/);
 assert.match(body,/https:\/\/tello.com\/buy\/custom_plans/);
});
