import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('site/index.html');
const guided=read('site/value-ui.mjs');
const watchlist=read('site/watchlist-ui.mjs');
const switching=read('site/switch-ui.mjs');

function extract(name){
 const source=html.match(new RegExp('^function '+name+'\\([^\\n]*\\)\\{[\\s\\S]*?^\\}','m'))?.[0];
 assert.ok(source,'The real homepage '+name+' function must be present');
 return source;
}

test('an Eastern midnight rollover redraws plan and phone prices exactly once',()=>{
 let day='2026-11-09',updates=0,ageChecks=0,sourceChecks=0;
 const signals=[];
 const context={
  displayedEasternDay:day,
  easternDay:()=>day,
  update:()=>updates++,
  renderCatalogFreshness:()=>ageChecks++,
  renderSources:()=>sourceChecks++,
  Event:class{constructor(type){this.type=type;}},
  window:{dispatchEvent:message=>signals.push(message.type)}
 };
 runInNewContext(extract('refreshCalendarDay')+'\nrefreshCalendarDay();',context);
 assert.deepEqual([updates,ageChecks,sourceChecks],[0,0,0]);
 day='2026-11-10';
 runInNewContext('refreshCalendarDay();',context);
 assert.deepEqual([updates,ageChecks,sourceChecks],[1,1,1]);
 assert.equal(context.displayedEasternDay,'2026-11-10');
 assert.deepEqual(signals,['fivebars:calendar-day-change']);
 runInNewContext('refreshCalendarDay();',context);
 assert.deepEqual([updates,ageChecks,sourceChecks],[1,1,1],
  'repeated focus, timer and visibility callbacks must not cause repeated redraws');
});

test('an open homepage recomputes Eastern offer deadlines for each quote',()=>{
 assert.match(html,/let displayedEasternDay = easternDay\(\);/);
 assert.doesNotMatch(html,/const today = easternDay\(\);(?![\s\S]*function endInfo)/,
  'do not cache a page-load date for later pricing calculations');
 assert.match(extract('endInfo'),/const today=easternDay\(\)/);
 let day='2026-11-09';
 const context={easternDay:()=>day,Date,Math};
 const fn=runInNewContext(extract('endInfo')+'\nendInfo',context);
 assert.equal(fn('2026-11-09').expired,false);
 assert.equal(fn('2026-11-09').text,'Ends today');
 day='2026-11-10';
 assert.equal(fn('2026-11-09').expired,true,
  'a tab opened before midnight must not retain the expired headline');
 assert.match(fn('2026-11-09').text,/Ended Nov 9/);
});

test('mobile and desktop background/restore paths recheck local Eastern day',()=>{
 assert.match(html,/document\.addEventListener\("visibilitychange",/);
 assert.match(html,/window\.addEventListener\("focus",refreshCalendarDay\)/);
 assert.match(html,/window\.addEventListener\("pageshow",refreshCalendarDay\)/);
 assert.match(html,/window\.setInterval\(refreshCalendarDay,60000\)/);
 assert.match(guided,/addEventListener\('fivebars:calendar-day-change'/);
 assert.match(guided,/renderCompare\(\)/);
 assert.match(guided,/dispatchEvent\(\s*new Event\('submit',\{bubbles:true,cancelable:true\}\)/);
 assert.match(watchlist,/addEventListener\('fivebars:calendar-day-change'/);
 assert.match(switching,/addEventListener\('fivebars:calendar-day-change'/);
 assert.match(switching,/results\.replaceChildren\(\)/);
 assert.match(switching,/updateOptions\(\)/);
 assert.match(switching,/!pastEnd\(x.ends,localDay\(\)\)/);
});
