import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../site/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('main page exposes functional savings tab and the four honest public policies',()=>{
 const html=read('index.html');
 assert.match(html,/data-tab="switch"/);
 assert.match(html,/id="p-switch"/);
 assert.match(html,/id="fb-switch-root"/);
 assert.match(html,/src="switch-ui.mjs"/);
 assert.match(html,/report\.html\?offer=/);
 assert.match(html,/href="report.html"/);
 for(const file of ['editorial.html','privacy.html','disclosures.html','switching-guide.html','report.html']){
   assert.match(html,new RegExp(file.replace('.','\\.')));
   const body=read(file);
   assert.match(body,/<!doctype html>/i);
   assert.match(body,/<meta name="description"/);
   assert.match(body,/rel="canonical"/);
   assert.match(body,/Five Bars/);
   assert.match(body,/carrier|wireless/i);
 }
});
test('public editorial materials do not pretend full terms or actual affiliate deals have been verified',()=>{
 const editorial=read('editorial.html');
 assert.match(editorial,/not a guaranteed checkout quote/i);
 assert.match(editorial,/documented human checkout scenario/i);
 const disclosure=read('disclosures.html');
 assert.match(disclosure,/material connection/i);
 assert.match(disclosure,/No paid carrier placements|does not identify paid carrier placements/i);
 const privacy=read('privacy.html');
 assert.match(privacy,/localStorage/);
 assert.match(privacy,/Google Fonts/);
 assert.match(privacy,/not sent to a Five Bars database/i);
 assert.match(privacy,/Reader correction reports/);
 assert.match(read('report.html'),/no private account details|keep private information private/i);
 const guide=read('switching-guide.html');
 assert.match(guide,/transfer PIN/i);
 assert.match(guide,/Keep the current service active/i);
});
test('search discovery includes every real public page without fabricating offers',()=>{
 const sitemap=read('sitemap.xml'),robots=read('robots.txt');
 assert.match(robots,/Sitemap:/);
 for(const file of ['https://fivebars.info/','editorial.html','privacy.html','disclosures.html','switching-guide.html','report.html'])
   assert.ok(sitemap.includes(file),'Missing sitemap page '+file);
 assert.doesNotMatch(sitemap,/product-price|aggregateRating/);
});
test('switching flow keeps data local and never includes account or analytics backends',()=>{
 const core=read('switch-core.mjs'),ui=read('switch-ui.mjs');
 assert.doesNotMatch(core,/fetch\(|localStorage|navigator\.sendBeacon/);
 assert.doesNotMatch(ui,/sendBeacon|google-analytics|gtag\(|localStorage\.setItem|new WebSocket/);
 assert.match(ui,/navigator\.clipboard/);
 assert.match(core,/includeFinancials=false/);
 assert.match(core,/financing|rebates/i);
});
