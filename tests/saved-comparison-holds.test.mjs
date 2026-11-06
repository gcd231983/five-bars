import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCompare} from '../site/value-core.mjs';

const html=readFileSync(new URL('../site/value-ui.mjs',import.meta.url),'utf8');
const catalog={
 plans:[{id:'plan',carrier:'Example',plan:'Standard',price:20}],
 phones:[
  {id:'held',carrier:'Retailer',phone:'Listed phone',price:0,planPrice:40,listingHold:{reason:'conflict'}},
  {id:'sold-out',carrier:'Carrier',phone:'Out-of-stock phone',price:0,planPrice:60,
   availability:'out_of_stock',availabilityObservedOn:'2026-11-02'},
  {id:'expired',carrier:'Carrier',phone:'Expired phone',price:0,planPrice:60,ends:'2026-11-05'},
  {id:'available',carrier:'Carrier',phone:'Available phone',price:29,planPrice:40}
 ]
};

test('cached phone comparisons enforce active listing holds, stock and published expiration boundaries',()=>{
 const saved=['held','sold-out','expired','available'].map(id=>({type:'phone',id}));
 assert.deepEqual(normalizeCompare(saved,catalog,'2026-11-06'),[
  {type:'phone',id:'available'}
 ]);
 // The standard plan is not removed because another plan's promotion ended.
 assert.deepEqual(normalizeCompare([{type:'plan',id:'plan'}],catalog,'2026-11-06'),[
  {type:'plan',id:'plan'}
 ]);
 assert.deepEqual(normalizeCompare([{type:'phone',id:'expired'}],catalog,'2026-11-05'),[
  {type:'phone',id:'expired'}
 ],'offer remains listed through the final Eastern date');
});

test('a held phone cannot occupy a saved comparison slot or hide another available option',()=>{
 const saved=[{type:'phone',id:'held'},{type:'phone',id:'sold-out'},
   {type:'phone',id:'available'},{type:'phone',id:'expired'}];
 assert.deepEqual(normalizeCompare(saved,catalog,'2026-11-06'),[{type:'phone',id:'available'}]);
 const mutated=structuredClone(catalog);
 mutated.phones[3].listingHold=true;
 assert.deepEqual(normalizeCompare([{type:'phone',id:'available'}],mutated,'2026-11-06'),[]);
});

test('restored comparisons also apply current official price-conflict guard',()=>{
 const fn=html.slice(html.indexOf('function renderCompare()'),html.indexOf('/* ---------- price evidence',html.indexOf('function renderCompare()')));
 assert.match(fn,/normalizeCompare\(selected,catalog,localDay\(\)\)\.filter\(item=>/);
 assert.match(fn,/!officialHeadlineUnderReview\(offer\)/);
 assert.match(fn,/saveCompare\(\)/);
 assert.match(fn,/conflicting-price or removed saved comparisons were cleared/);
 assert.match(html,/if\(offer && officialHeadlineUnderReview\(offer\)\)/,
  'the direct Add to Compare path and saved restoration must agree');
});
