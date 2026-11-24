import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offerState,sourceUrl,validOffers} from '../site/holiday-core.mjs';
import {visiblePromoCandidates} from '../scripts/auto-core.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('site/data/holiday-offers-2026.json');
const byId=id=>data.offers.find(row=>row.id==='holiday-'+id);
const at=value=>new Date(value);
test('holiday prices and published evidence stay in the read-only tracker, outside baseline data and checkout ledger',()=>{
 assert.ok(validOffers(data));
 const regular=read('site/data/deals.json');
 const ids=new Set([...regular.plans,...regular.phones].map(row=>row.id));
 const ledger=read('site/data/verifications.json').offers;
 assert.ok(data.offers.every(row=>!ids.has(row.id)&&!Object.hasOwn(ledger,row.id)));
 assert.deepEqual(regular.plans.filter(x=>x.carrier==='Visible').map(x=>x.price),[25,35,45]);
 assert.match(byId('visible-annual').price,/\$225 upfront.*BLACKFRIDAY/);
 assert.equal(byId('cricket-free-16e').group,'instant');
 assert.match(byId('cricket-free-16e').cost,/\$180 service/);
 assert.equal(byId('metro-iphone-16e').group,'device');
 assert.equal(byId('tm-iphone-18-pro').group,'credits');
});
test('US Mobile one-day window opens and closes at exact published Eastern times',()=>{
 const promo=byId('usm-premium');
 assert.equal(offerState(promo,at('2026-11-27T15:59:59Z')),'scheduled');
 assert.equal(offerState(promo,at('2026-11-27T16:00:00Z')),'published');
 assert.equal(offerState(promo,at('2026-11-28T04:59:59Z')),'published');
 assert.equal(offerState(promo,at('2026-11-28T05:00:00Z')),'ended');
});
test('Metro remains open until midnight Central while undated promotions time out after seven days',()=>{
 assert.equal(offerState(byId('metro-free-a16'),at('2026-12-08T05:59:59Z')),'published');
 assert.equal(offerState(byId('metro-free-a16'),at('2026-12-08T06:00:00Z')),'ended');
 assert.equal(offerState(byId('visible-annual'),at('2026-11-30T23:59:59Z')),'published');
 assert.equal(offerState(byId('visible-annual'),at('2026-12-01T00:00:00Z')),'recheck');
 assert.equal(offerState(byId('visible-annual'),at('2026-11-23T23:59:59Z')),'recheck');
});
test('malformed, duplicate and non-HTTPS or credential-bearing holiday records fail closed',()=>{
 const promo=byId('usm-premium');
 assert.equal(sourceUrl('https://something:secret@www.visible.com/m/deals'),null);
 assert.equal(sourceUrl('javascript:alert(1)'),null);
 assert.equal(validOffers({schema:1,offers:[promo,promo]}),false);
 assert.equal(validOffers({schema:1,offers:[{...promo,endAt:'2026-11-31T05:00:00Z'}]}),false);
 assert.equal(validOffers({schema:1,offers:[{...promo,checked:'2026-02-29'}]}),false);
 assert.equal(validOffers({schema:1,offers:[{...promo,group:'toString'}]}),false);
});
test('Visible promo scan signals are review only and require public text on the exact carrier page',()=>{
 const sale='https://www.visible.com/m/deals';
 const match={url:sale,finalUrl:sale,ok:true,_html:'<h2>Use code <b>HOLIDAYHACK</b></h2><p>Promo code BLACKFRIDAY required</p>'};
 assert.deepEqual(visiblePromoCandidates([match]).map(({type,code})=>[type,code]),[
  ['published_promo_candidate','BLACKFRIDAY'],['published_promo_candidate','HOLIDAYHACK']]);
 assert.deepEqual(visiblePromoCandidates([{...match,finalUrl:'https://www.visible.com/buy/plans'}]),[]);
 assert.deepEqual(visiblePromoCandidates([{...match,finalUrl:'https://unrelated.test/m/deals'}]),[]);
 assert.deepEqual(visiblePromoCandidates([{...match,ok:false}]),[]);
 assert.deepEqual(visiblePromoCandidates([{...match,_html:'<!-- promo code BLACKFRIDAY --><script>use code HOLIDAYHACK</script><h3>Black Friday</h3>'}]),[]);
});
