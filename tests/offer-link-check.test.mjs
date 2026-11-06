import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offerLinkCheck} from '../site/value-core.mjs';

const scanned='2026-11-06T12:55:34.886Z';
const now=Date.parse('2026-11-06T13:00:00.000Z');
const snapshot={
  schema:1,generatedAt:scanned,offers:{
    tello:{state:'source_unavailable',checkedAt:scanned,note:'HTTP 403'},
    visible:{state:'source_reachable',checkedAt:scanned,note:'Public page reachable; offer terms NOT verified'},
    'old-unknown':{state:'not_checked'}
  }
};

test('failed automated link checks require caution, not an invalid-deal or checkout-verification claim',()=>{
 const result=offerLinkCheck('tello',snapshot,now);
 assert.equal(result.state,'unavailable');
 assert.match(result.label,/Offer link not checked automatically/);
 assert.doesNotMatch(JSON.stringify(result),/price changed|withdrawn|checked checkout|verified price/i);
 assert.equal(offerLinkCheck('visible',snapshot,now).state,'reachable');
 assert.match(offerLinkCheck('visible',snapshot,now).label,/checkout unverified/);
 assert.equal(offerLinkCheck('old-unknown',snapshot,now).state,'unknown');
 assert.equal(offerLinkCheck('not-in-catalog',snapshot,now).state,'unknown');
 assert.equal(offerLinkCheck('__proto__',snapshot,now).state,'unknown',
   'inherited object properties must never become link observations');
});

test('missing, stale, future-dated and invalid snapshots cannot imply current evidence',()=>{
 assert.equal(offerLinkCheck('tello',null,now).state,'unknown');
 assert.equal(offerLinkCheck('tello',{generatedAt:'not-a-date'},now).state,'unknown');
 assert.equal(offerLinkCheck('visible',snapshot,now+48*3600000+1).state,'stale');
 assert.equal(offerLinkCheck('visible',snapshot,now-3600000).state,'stale');
 assert.equal(offerLinkCheck('visible',{...snapshot,generatedAt:'2026-11-06T13:04:00.000Z'},now).state,'reachable',
   'minor clock skew is tolerable');
 assert.equal(offerLinkCheck('visible',{...snapshot,generatedAt:'2026-11-06T13:06:00.000Z'},now).state,'stale',
   'future-dated data beyond five minutes is not fresh');
});

test('guided finder must show source and manual-review warnings outside collapsed plan details',()=>{
 const ui=readFileSync(new URL('../site/value-ui.mjs',import.meta.url),'utf8');
 const plan=ui.slice(ui.indexOf('if(showPlans) {'),ui.indexOf('if(showPhones) {'));
 const phone=ui.slice(ui.indexOf('if(showPhones) {'),ui.indexOf('function fieldValue',ui.indexOf('if(showPhones) {')));
 assert.match(ui,/let scanStatus = null/);
 assert.match(ui,/scanStatus=status\?\.schema===1/);
 assert.match(ui,/offerLinkCheck\(offer\.id,scanStatus\)/);
 assert.match(ui,/linkCheck\.state!=='reachable'/);
 assert.match(ui,/This does not prove the deal has ended or that its price changed/);
 assert.match(plan,/card\.append\(price\);\s*\/\/[^\n]*\n\s*card\.append\(statusNode\(p\)\);/);
 assert.doesNotMatch(plan,/info\.append\(statusNode\(p\)\)/,
  'full-review badge should not be hidden behind a details disclosure');
 assert.match(phone,/card\.append\(statusNode\(p\)\)/);
 assert.doesNotMatch(ui,/linkCheck\.state==='reachable'[\s\S]*?Checkout verified/i);
});
