import test from 'node:test';
import assert from 'node:assert/strict';
import {probe,checkProduction} from '../scripts/production-smoke.mjs';

const revision='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const at=Date.parse('2026-11-06T12:00:00Z');
const response=async(url)=>({
 ok:true,
 url:String(url),
 text:async()=>url.pathname==='/data/status.json'
  ?JSON.stringify({generatedAt:'2026-11-06T11:27:58Z',summary:{sourcesChecked:18,sourcesReachable:10}})
  :url.pathname==='/release.json'
  ?JSON.stringify({schema:1,revision,contentHash:'0123456789abcdef'})
  :url.pathname==='/sitemap.xml'
  ?'<urlset><url><loc>https://fivebars.info/</loc></url></urlset>'
  :'<!doctype html><html lang="en"><title>Five Bars</title></html>'
});
const options={dns:async()=>{},request:response,expectedRevision:revision,now:()=>at};

test('production probe checks canonical homepage, fresh status, sitemap and exact deployed SHA',async()=>{
 for(const path of ['/','/data/status.json','/sitemap.xml','/release.json'])
  assert.equal((await probe(path,options)).path,path);
 await assert.rejects(probe('https://evil.example/',options),/Cross-origin/);
});

test('deployment smoke rejects a different commit SHA and malformed release manifest',async()=>{
 await assert.rejects(probe('/release.json',{...options,expectedRevision:'b'.repeat(40)}),/revision mismatch/);
 await assert.rejects(probe('/release.json',{...options,expectedRevision:null}),/Expected validated/);
});

test('deployment smoke rejects stale status and redirects away from the configured domain',async()=>{
 await assert.rejects(probe('/data/status.json',{...options,now:()=>at+50*3600000}),/stale/);
 const redirected=async()=>({ok:true,url:'https://not-fivebars.example/',text:async()=>'<html>Five Bars</html>'});
 await assert.rejects(probe('/',{...options,request:redirected}),/redirected to unexpected/);
});

test('production check retries transient failures then checks all four endpoints',async()=>{
 let n=0,waits=0;
 const result=await checkProduction({run:async(path)=>{if(++n===1)throw Error('temporary DNS failure');return {path};},wait:async()=>{waits++;},retries:3});
 assert.equal(result.length,4);
 assert.equal(waits,1);
});

test('production check fails loudly after retry exhaustion',async()=>{
 await assert.rejects(checkProduction({run:async()=>{throw Error('DNS failed');},wait:async()=>{},retries:2}),/DNS failed/);
});
