import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('affiliate activation remains approval-gated and transparent',()=>{
  const register=read('AFFILIATE_ACTIVATION.md');
  const disclosure=read('site/disclosures.html');
  const homepage=read('site/index.html');
  assert.match(register,/Approval status/);
  assert.match(register,/No approval, tracking identifier, commission rate/);
  assert.match(register,/rel="sponsored noopener noreferrer"/);
  assert.match(register,/Do not install third-party tracking scripts/);
  assert.match(disclosure,/clearly and close to any compensated recommendation or link/);
  assert.match(homepage,/fb-finder-affiliate-note/);
  assert.match(homepage,/does not currently report commission-based rankings/);
});

test('catalog destinations remain HTTPS and do not include affiliate identifiers by default',()=>{
  const catalog=JSON.parse(read('site/data/deals.json'));
  const entries=[...(catalog.plans||[]),...(catalog.phones||[])];
  assert.ok(entries.length>0);
  for(const offer of entries){
    const url=offer.url||offer.link;
    if(!url)continue;
    const parsed=new URL(url);
    assert.equal(parsed.protocol,'https:',offer.id);
    for(const key of parsed.searchParams.keys()){
      assert.ok(!/^(?:aff(?:iliate)?(?:_?id)?|subid|clickid|irclickid|irgwc|utm_affiliate|referral_id)$/i.test(key),
        'Unexpected affiliate tracking parameter in '+offer.id+': '+key);
    }
  }
});
