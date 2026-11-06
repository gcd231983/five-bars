import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchPublicResponse,safeSourceUrl} from '../scripts/auto-core.mjs';

const origin='https://www.boostmobile.com/deals';
const hop=(location)=>new Response('',{status:302,headers:{location}});
const success=()=>new Response('<html><body>'+('public carrier plans '.repeat(20))+'</body></html>',{
 status:200,headers:{'content-type':'text/html'}
});

test('a redirect into localhost, cloud metadata, HTTP or account credentials is rejected BEFORE requesting it',async()=>{
 for(const target of [
  'http://127.0.0.1/internal',
  'https://127.0.0.1/internal',
  'https://169.254.169.254/latest/meta-data/',
  'http://www.boostmobile.com/deals',
  'https://user:secret@www.boostmobile.com/deals',
  'https://www.boostmobile.com:8443/private',
  'file:///etc/passwd'
 ]){
  const calls=[];
  const r=await fetchPublicResponse(origin,{fetcher:async (url,opts)=>{
   calls.push({url,redirect:opts.redirect});
   return hop(target);
  }});
  assert.equal(r.response,null,target);
  assert.match(r.error,/Unsafe redirect destination/,target);
  assert.deepEqual(calls,[{url:origin,redirect:'manual'}],target);
 }
});

test('legitimate HTTPS relative redirects are handled with a bounded, validated next request',async()=>{
 const paths=[];
 const r=await fetchPublicResponse(origin,{fetcher:async (url,opts)=>{
  assert.equal(opts.redirect,'manual');
  paths.push(url);
  if(paths.length===1)return hop('/deals/latest');
  if(paths.length===2)return hop('https://www.boostmobile.com/deals/phone');
  return success();
 }});
 assert.equal(r.error,undefined);
 assert.equal(r.response.status,200);
 assert.equal(r.finalUrl,'https://www.boostmobile.com/deals/phone');
 assert.deepEqual(paths,[origin,'https://www.boostmobile.com/deals/latest',
  'https://www.boostmobile.com/deals/phone']);
 assert.ok(safeSourceUrl(r.finalUrl));
});

test('missing Location, malformed redirects, redirect loops and excessive hops fail closed',async()=>{
 const missing=await fetchPublicResponse(origin,{fetcher:async()=>new Response('',{status:302})});
 assert.match(missing.error,/location missing/i);
 const invalid=await fetchPublicResponse(origin,{fetcher:async()=>hop('https://')});
 assert.match(invalid.error,/Invalid redirect location/);
 const calls=[];
 const loop=await fetchPublicResponse(origin,{fetcher:async url=>{
  calls.push(url);return hop(url.endsWith('/deals')?'/deals/latest':'/deals');
 }});
 assert.match(loop.error,/Redirect loop detected/);
 assert.equal(calls.length,2,'no repeated request to a looped URL');
 let n=0;
 const tooMany=await fetchPublicResponse(origin,{maxRedirects:2,fetcher:async()=>{
  n++;return hop('/next-'+n);
 }});
 assert.match(tooMany.error,/Too many redirects/);
 assert.equal(n,3,'redirect budget must be strictly bounded');
});

test('transport that follows an unchecked redirect despite manual mode is refused',async()=>{
 const r=await fetchPublicResponse(origin,{fetcher:async()=>({
  status:200,ok:true,url:'https://www.boostmobile.com/changed-without-permission',
  headers:new Headers({'content-type':'text/html'}),
 })});
 assert.equal(r.response,null);
 assert.match(r.error,/Unexpected auto-followed redirect/);
});

test('normal HTTP 403 remains a scanner failure, never proof the deal was withdrawn',async()=>{
 const r=await fetchPublicResponse(origin,{fetcher:async()=>new Response('',{status:403})});
 assert.equal(r.response.status,403);
 assert.equal(r.response.ok,false);
 const updater=readFileSync(new URL('../scripts/auto-update.mjs',import.meta.url),'utf8');
 assert.match(updater,/fetchPublicResponse\(url/);
 assert.match(updater,/status:r.status,error:'HTTP '\+r.status/);
 assert.doesNotMatch(updater,/redirect:\s*'follow'/);
});
