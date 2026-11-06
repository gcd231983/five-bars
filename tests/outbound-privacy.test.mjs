import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('outbound carrier link helper enforces HTTPS and prevents opener access',()=>{
 const ui=read('site/value-ui.mjs');
 const fn=ui.slice(ui.indexOf('function linkTo('),ui.indexOf('function priceProofFor('));
 assert.match(fn,/parsed\.protocol !== 'https:'/);
 assert.match(fn,/a\.target='_blank'/);
 assert.match(fn,/a\.rel='noopener noreferrer'/);
 assert.doesNotMatch(fn,/navigator\.sendBeacon|fetch\(|XMLHttpRequest|localStorage/);
});

test('privacy policy explains browser-only watchlists and absence of visitor analytics',()=>{
 const privacy=read('site/privacy.html');
 assert.match(privacy,/localStorage/);
 assert.match(privacy,/does not contain an advertising analytics SDK/);
 assert.match(privacy,/not sent to a Five Bars database/);
 const affiliate=read('AFFILIATE_ACTIVATION.md');
 assert.match(affiliate,/No analytics has been activated/);
});

test('site does not load known third-party advertising or behavioral analytics SDKs',()=>{
 const files=['site/index.html','site/value-ui.mjs','site/privacy.html'];
 for(const path of files){
  const src=read(path);
  assert.doesNotMatch(src,/https?:\/\/(?:www\.)?(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|analytics\.tiktok\.com|static\.hotjar\.com|script\.hotjar\.com)\//i,path);
 }
});
