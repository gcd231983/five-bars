import test from 'node:test';
import assert from 'node:assert/strict';
import {probe,checkProduction} from '../scripts/production-smoke.mjs';

const request=async(url)=>({
 ok:true,
 text:async()=>url.pathname==='/data/status.json'
  ?JSON.stringify({generatedAt:'2026-11-06T11:27:58Z',summary:{sourcesChecked:18,sourcesReachable:10}})
  :url.pathname==='/sitemap.xml'?'<urlset></urlset>':'<!doctype html><html lang="en"></html>'
});

test('production probe validates public pages without checking carrier checkout',async()=>{
 for(const path of ['/','/data/status.json','/sitemap.xml'])
  assert.equal((await probe(path,{dns:async()=>{},request})).path,path);
 await assert.rejects(probe('https://evil.example/',{dns:async()=>{},request}),/Cross-origin/);
});

test('production check retries transient failure and then succeeds',async()=>{
 let n=0,waits=0;
 const result=await checkProduction({run:async(path)=>{if(++n===1)throw Error('temporary DNS failure');return {path};},wait:async()=>{waits++;},retries:3});
 assert.equal(result.length,3);
 assert.equal(waits,1);
});

test('production check fails loudly after retry exhaustion',async()=>{
 await assert.rejects(checkProduction({run:async()=>{throw Error('DNS failed');},wait:async()=>{},retries:2}),/DNS failed/);
});
