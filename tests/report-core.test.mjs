import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ISSUE_URL,REPORT_TYPES,reportLink,findReportOffer,reportSource,buildReport}
  from '../site/report-core.mjs';
const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const today='2026-11-02';
const params={offerId:'usm-starter',category:'price',observedAt:today,
 sourceUrl:'https://www.usmobile.com/plans',
 details:'The publicly shown first service month seems higher than the old advertised comparison price.',
 publicAcknowledged:true};
const report=(changes={})=>buildReport(catalog,{...params,...changes},today);
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('every known plan and device has a safe stable report link with no customer data in URL',()=>{
 assert.equal(catalog.plans.length+catalog.phones.length,78);
 for(const offer of [...catalog.plans,...catalog.phones]){
  const route=reportLink(offer.id);
  assert.equal(route,'report.html?offer='+encodeURIComponent(offer.id));
  assert.ok(findReportOffer(catalog,offer.id));
  assert.doesNotMatch(route,/issues\/new|body=|title=|email=|phone=/i);
 }
 for(const id of ['',undefined,'../../private','id&body=secret','<script>','%23'])
  assert.equal(reportLink(id),'report.html');
 assert.equal(findReportOffer(catalog,'site').kind,'site');
 assert.equal(findReportOffer(catalog,'not-in-catalog'),null);
});
test('a reader report is a local draft, not a verified checkout or a GitHub submission',()=>{
 const result=report();
 assert.equal(result.offer.carrier,'US Mobile');
 assert.match(result.draft,/Offer ID:\*\* usm-starter/);
 assert.match(result.draft,/reader report.*NOT verified/i);
 assert.match(result.draft,/independent.*official|independently check/i);
 assert.equal(result.issueUrl,ISSUE_URL);
 assert.equal(new URL(result.issueUrl).searchParams.get('template'),'offer-correction.yml');
 assert.equal(new URL(result.issueUrl).searchParams.get('body'),null);
 assert.equal(new URL(result.issueUrl).searchParams.get('title'),null);
 assert.ok(!result.issueUrl.includes(params.details));
 assert.equal(report({offerId:'site',category:'site'}).offer.kind,'site');
});
test('public reports reject unknown offers, invalid categories, dates and incomplete explanations',()=>{
 const bad=[
  [{offerId:'removed'},/Choose a listed/],
  [{category:'refund now'},/problem type/],
  [{observedAt:'2026-11-03'},/future/],
  [{observedAt:'2026-02-30'},/valid observation/],
  [{details:'too short'},/20–900/],
  [{details:'x'.repeat(901)},/20–900/],
  [{details:'There is a private\0control character'},/control characters/],
  [{publicAcknowledged:false},/public/]
 ];
 for(const [change,pattern] of bad)assert.throws(()=>report(change),pattern);
});
test('privacy warning blocks obvious subscriber secrets and risky checkout links',()=>{
 for(const phrase of [
  'The provider emailed me at customer@example.com about this',
  'My private phone number is 212-555-0148 and the amount is wrong',
  'The account number ABCDEFG12345 has the wrong charge',
  'My transfer PIN 1234 is part of this problem',
  'My card digits are 4111111111111111 and the fee changed'
 ])assert.throws(()=>report({details:phrase}),/private|phone numbers|accounts/i,phrase);
 assert.throws(()=>report({sourceUrl:'https://www.usmobile.com/plans?account=12345'}),/HTTPS|query strings/);
 assert.throws(()=>report({sourceUrl:'https://someone:secret@www.usmobile.com/plans'}),/private|HTTPS/);
});
test('source URL validation accepts public HTTPS pages but excludes private session or non-HTTPS links',()=>{
 assert.equal(reportSource('https://www.usmobile.com/plans'),'https://www.usmobile.com/plans');
 assert.equal(reportSource(''),'');
 for(const bad of [
  'http://www.usmobile.com/plans','javascript:alert(1)','https://localhost/a',
  'https://www.usmobile.com/plans#secret','https://www.usmobile.com/plans?token=abcdef',
  'https://user:pw@www.usmobile.com/plans','https://www.usmobile.com:8443/a',
  'https://127.0.0.1/private'
 ])assert.throws(()=>reportSource(bad),/HTTPS|private|tracking/i,bad);
});
test('public correction form is accessible, no automatic posting or data storage',()=>{
 const html=read('../site/report.html'),ui=read('../site/report-ui.mjs');
 const yaml=read('../.github/ISSUE_TEMPLATE/offer-correction.yml');
 assert.match(html,/id="fb-report-form"/);
 assert.match(html,/role="status"/);
 assert.match(html,/id="fb-report-public"/);
 assert.match(html,/report-ui\.mjs/);
 assert.match(html,/GitHub issues are <strong>public/);
 assert.match(html,/require a GitHub account/);
 assert.match(html,/not send data/i);
 assert.match(yaml,/type: (dropdown|textarea|checkboxes)/);
 assert.match(yaml,/required: true/);
 assert.match(yaml,/transfer PIN/);
 assert.match(yaml,/Reader|reader|report/i);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|sendBeacon|fetch\([^)]*issues\/new|XMLHttpRequest/);
 assert.doesNotMatch(ui,/encodeURIComponent\(.*(?:details|body|source)/);
 assert.match(ui,/navigator\.clipboard/);
});
