import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {normalizeCompare,pastEnd} from '../site/value-core.mjs';

const catalog={
 plans:[{id:'regular-plan',price:15,promo:{price:10,ends:'2026-11-09'}}],
 phones:[
  {id:'expired-phone',phone:'Test phone',price:0,planPrice:60,ends:'2026-11-09'},
  {id:'live-phone',phone:'Other phone',price:29,planPrice:50,ends:'2026-12-31'}
 ]
};

test('saved phone comparisons expire after last advertised Eastern date without deleting the regular plan',()=>{
 const phoneOnly=[{type:'phone',id:'expired-phone'},{type:'phone',id:'live-phone'}];
 assert.deepEqual(normalizeCompare(phoneOnly,catalog,'2026-11-09'),phoneOnly,
   'published last day remains eligible');
 assert.deepEqual(normalizeCompare(phoneOnly,catalog,'2026-11-10'),[
  {type:'phone',id:'live-phone'}
 ],'expired handset is removed from saved comparisons');
 assert.deepEqual(normalizeCompare([{type:'plan',id:'regular-plan'}],catalog,'2026-11-10'),
  [{type:'plan',id:'regular-plan'}],'only intro promo expires, standard service stays');
 assert.equal(pastEnd('2026-11-09','2026-11-09'),false);
 assert.equal(pastEnd('2026-11-09','2026-11-10'),true);
});

test('expired saved phones never consume slots in a new comparison or revive a removed listing',()=>{
 const selected=[{type:'phone',id:'expired-phone'},{type:'phone',id:'live-phone'},
  {type:'phone',id:'missing-phone'}];
 assert.deepEqual(normalizeCompare(selected,catalog,'2026-11-10'),
  [{type:'phone',id:'live-phone'}]);
 const mixed=[{type:'plan',id:'regular-plan'},{type:'phone',id:'expired-phone'}];
 assert.deepEqual(normalizeCompare(mixed,catalog,'2026-11-10'),
  [{type:'plan',id:'regular-plan'}]);
});

test('a comparison opened across midnight withholds expired handset cash and renewal figures',()=>{
 const src=readFileSync(new URL('../site/value-ui.mjs',import.meta.url),'utf8');
 const fn=src.match(/^function fieldValue\(type,offer,key\) \{[\s\S]*?^\}/m)?.[0];
 assert.ok(fn,'test real browser comparison formatting, not a copied formula');
 const fieldValue=runInNewContext(fn+'\nfieldValue',{
  pastEnd,localDay:()=> '2026-11-10'
 });
 const offer=catalog.phones[0];
 for(const key of ['monthly','year','data','hotspot','eligibility'])
  assert.equal(fieldValue('phone',offer,key),'Promotion ended — no current cost quote');
 assert.match(src,/if\(type==='phone'&&offer&&pastEnd\(offer\.ends,localDay\(\)\)\)/);
 assert.match(src,/Expired, held, out-of-stock, conflicting-price or removed saved comparisons were cleared/);
 assert.match(src,/const valid=normalizeCompare\(selected,catalog,localDay\(\)\)/);
});
