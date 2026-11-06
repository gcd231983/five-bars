import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {releaseComparison,loadedReleaseHash,startReleaseNotice} from '../site/release-notice.mjs';

const OLD='0123456789abcdef',NEW='abcdef0123456789';
const manifest=hash=>({schema:1,revision:'a'.repeat(40),contentHash:hash});
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');

function scene(hash=OLD){
 const events={},buttonEvents={};
 let reloads=0,cleared=0,intervalMs=0,timerFn=null;
 const banner={hidden:true},button={addEventListener(type,fn){buttonEvents[type]=fn;}};
 const doc={
  baseURI:'https://fivebars.info/',hidden:false,
  querySelector:()=>({getAttribute:()=> 'value-ui.mjs?v='+hash}),
  getElementById:id=>id==='fb-release-notice'?banner:id==='fb-release-reload'?button:null,
  addEventListener(type,fn){events['doc:'+type]=fn;}
 };
 const win={
  location:{reload:()=>reloads++},
  addEventListener(type,fn){events['win:'+type]=fn;},
  setInterval(fn,ms){timerFn=fn;intervalMs=ms;return 123;},
  clearInterval(id){assert.equal(id,123);cleared++;}
 };
 return {doc,win,banner,events,buttonEvents,
  get reloads(){return reloads;},get cleared(){return cleared;},
  get intervalMs(){return intervalMs;},get tick(){return timerFn;}}
}

test('release comparison accepts only well-formed 16-character content fingerprints',()=>{
 assert.equal(releaseComparison(OLD,manifest(OLD)),'current');
 assert.equal(releaseComparison(OLD,manifest(NEW)),'newer');
 assert.equal(releaseComparison(OLD,{...manifest(NEW),schema:2}),'unavailable');
 assert.equal(releaseComparison(OLD,{schema:1,contentHash:'not-a-hash'}),'unavailable');
 assert.equal(releaseComparison('old-version',manifest(NEW)),'unavailable');
 assert.equal(releaseComparison(OLD,null),'unavailable');
});

test('only versioned production pages start a release poll; local source remains quiet',()=>{
 const original=scene();
 assert.equal(loadedReleaseHash(original.doc),OLD);
 const unbuilt=scene('20261106-phone-results');
 assert.equal(loadedReleaseHash(unbuilt.doc),null);
 assert.equal(startReleaseNotice({doc:unbuilt.doc,win:unbuilt.win,request:async()=>{throw Error('must not poll');}}),null);
 assert.equal(unbuilt.intervalMs,0);
});

test('a newer publication is shown to the shopper without auto-reloading, tracking or losing inputs',async()=>{
 const s=scene();
 let requests=0;
 const watch=startReleaseNotice({
  doc:s.doc,win:s.win,
  request:async(url,options)=>{
   requests++;assert.equal(url.href,'https://fivebars.info/release.json');
   assert.equal(options.cache,'no-store');
   return {ok:true,json:async()=>manifest(NEW)};
  }
 });
 assert.ok(watch);
 await watch.ready;
 assert.equal(requests,1);
 assert.equal(s.banner.hidden,false);
 assert.equal(s.reloads,0,'the application must never erase unsaved form input silently');
 assert.equal(s.intervalMs,15*60*1000);
 s.buttonEvents.click();
 assert.equal(s.reloads,1,'only a shopper clicking Reload triggers navigation');
 await watch.probe(true);
 assert.equal(requests,1,'once a newer release is identified, repeated checks are unnecessary');
 watch.dispose();
 assert.equal(s.cleared,1);
});

test('an offline update endpoint never claims an update; focus checks again when reachable',async()=>{
 const s=scene();
 let calls=0;
 const watch=startReleaseNotice({
  doc:s.doc,win:s.win,
  request:async()=>{
   calls++;
   if(calls===1)throw Error('network down');
   return {ok:true,json:async()=>manifest(NEW)};
  }
 });
 await watch.ready;
 assert.equal(s.banner.hidden,true);
 assert.equal(s.reloads,0);
 await watch.probe(true);
 assert.equal(calls,2);
 assert.equal(s.banner.hidden,false);
 watch.dispose();
});

test('an unchanged release remains invisible and focus/visibility checks are wired',async()=>{
 const s=scene();
 let calls=0;
 const watch=startReleaseNotice({
  doc:s.doc,win:s.win,
  request:async()=>{calls++;return {ok:true,json:async()=>manifest(OLD)};}
 });
 await watch.ready;
 assert.equal(s.banner.hidden,true);
 await watch.probe();
 assert.equal(calls,1,'short repeat checks are throttled');
 await watch.probe(true);
 assert.equal(calls,2,'returning to a tab can refresh the release check');
 assert.ok(s.events['doc:visibilitychange']);
 assert.ok(s.events['win:focus']);
 assert.ok(s.events['win:pageshow']);
 assert.equal(typeof s.tick,'function');
 watch.dispose();
});

test('notice is accessible, truthful, and does not auto-reload',()=>{
 assert.match(html,/id="fb-release-notice"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/);
 assert.match(html,/id="fb-release-reload"[^>]*type="button">Reload latest deals/);
 assert.match(html,/Unsaved form entries may be lost/);
 assert.match(html,/confirm final prices at carrier checkout/i);
 assert.match(html,/<script type="module" src="release-notice\.mjs"><\/script>/);
 const js=readFileSync(new URL('../site/release-notice.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(js,/localStorage|sendBeacon|serviceWorker/);
 assert.match(js,/button.addEventListener\('click',\(\)=>win.location.reload\(\)\)/);
});
