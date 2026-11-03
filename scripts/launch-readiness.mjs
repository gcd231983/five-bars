// Evidence-based public-beta status, NOT a substitute for checkout or commercial approval.
// Generated from curated repository files; never invents traffic, support or affiliate terms.
import {readFile,writeFile} from 'node:fs/promises';
import {localDay,verificationState} from '../site/value-core.mjs';
import {buildResearchAudit} from './source-research.mjs';

const clean=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const n=v=>Number.isInteger(v)&&v>=0?v:0;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:'Not recorded';
const BASE='https://gcd231983.github.io/five-bars/';
export function assessReadiness({catalog,research,retailerEvidence,ledger,status={},today=localDay(),ownerEvidence={}}){
 const audit=buildResearchAudit({catalog,research,retailerEvidence,ledger,today});
 const offers=[...catalog.plans,...catalog.phones];
 const reviewed=offers.filter(p=>verificationState(p,ledger?.offers?.[p.id],today).status==='verified').length;
 const incomplete=offers.length-reviewed;
 const scanAge=status?.generatedAt&&Number.isFinite(Date.parse(status.generatedAt))?
  Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(status.generatedAt))/86400000):null;
 // Owner-required items stay pending until an actual approved evidence record exists.
 // The software cannot validate a legal contract, private support operation or user testing.
 const owner=[
  {id:'real_checkout',label:'Independent itemized checkout scenarios',state:reviewed>=10?'review_needed':'pending',note:reviewed+' current signed scenario(s); minimum ten diverse real observations recommended for launch assessment.'},
  {id:'retailer_holds',label:'Retailer activation promotions',state:audit.summary.listingHolds===0?'review_needed':'pending',note:audit.summary.listingHolds+' retailer-specific price holds remain; never infer a free device from a product page.'},
  {id:'private_support',label:'Private consumer support, moderation and retention approval',state:'pending',note:'No approved private support channel or operating evidence is recorded here. Public GitHub reports are not private support.'},
  {id:'legal_privacy',label:'Business identity, privacy and advertising compliance sign-off',state:'pending',note:'Legal identity and independent privacy/advertising review require owner confirmation.'},
  {id:'partner_contracts',label:'Executed affiliate approvals and permitted disclosures',state:'pending',note:'Prospective network listings are not signed contracts. No paid referral launch is authorized.'},
  {id:'user_validation',label:'Real user accessibility and checkout-comprehension testing',state:'pending',note:'Automated browser checks do not replace screen-reader, multi-device and nontechnical-user validation.'}
 ];
 // An arbitrary value in a supplied ownerEvidence file must never grant launch approval.
 void ownerEvidence;
 return {
  schema:1,asOf:today,scope:'Repository-derived evidence only; no independently certified shopping cart, tax quotation, traffic, legal approval or paid partnerships.',
  technicalStage:'public_beta_engineering',
  commercialStage:'blocked_pending_external_evidence',
  source:{total:audit.summary.offers,researched:audit.summary.researched,
   matched:audit.summary.publishedPriceMatches,partial:audit.summary.publishedPartial,
   unresearched:audit.summary.notResearched,conflicts:audit.summary.conflictingOrInvalid,
   retailerHolds:audit.summary.listingHolds,stockHolds:audit.summary.availabilityHolds},
  checkout:{reviewed,unverified:incomplete,coveragePercent:offers.length?Math.round(reviewed*1000/offers.length)/10:0,
   note:'Human checkout evidence is valid only for a documented customer scenario and expires or invalidates after material changes.'},
  automation:{lastScan:typeof status?.generatedAt==='string'?status.generatedAt:null,
   scanAgeDays:scanAge,scanStatus:scanAge===null?'not_reported':scanAge>2?'stale':'recent',
   note:'Automated source reachability and partial headline matching never establish full checkout terms.'},
  ownerGates:owner
 };
}
export function renderReadiness(model){
 if(model?.schema!==1||!model.source||!model.checkout||!Array.isArray(model.ownerGates))throw Error('Invalid readiness report');
 const s=model.source,c=model.checkout;
 const stat=(label,value)=>'<div class="stat"><dt>'+clean(label)+'</dt><dd>'+clean(value)+'</dd></div>';
 const row=o=>'<li><strong>'+clean(o.label)+'</strong><span class="pending">Owner action pending</span><p>'+clean(o.note)+'</p></li>';
 return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="description" content="Five Bars public beta progress, independent evidence coverage and outstanding launch requirements.">'+
  '<link rel="canonical" href="'+BASE+'launch-readiness.html"><title>Launch readiness and evidence status | Five Bars</title>'+
  '<style>:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:Canvas;color:CanvasText;line-height:1.6}'+
  'main,header,footer{max-width:880px;margin:auto;padding:18px}nav{display:flex;gap:14px;flex-wrap:wrap}a{color:LinkText}h1{font-size:clamp(1.75rem,5vw,2.5rem);line-height:1.2}'+
  '.notice{border:2px solid currentColor;padding:16px;border-radius:10px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:18px 0}.stat{border:1px solid #8888;border-radius:10px;padding:12px}.stat dt{font-size:.88rem}.stat dd{font-size:1.65rem;font-weight:750;margin:0}'+
  '.pending{display:inline-block;margin-left:8px;font-size:.8rem;border:1px solid #888;border-radius:8px;padding:1px 8px}li{margin-bottom:18px}li p{margin:.3em 0 0}footer{border-top:1px solid #8888}'+
  '@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important}}</style></head><body>'+
  '<header><nav aria-label="Navigation"><a href="./">Five Bars home</a><a href="source-research.html">Source research</a><a href="editorial.html">Editorial policy</a><a href="report.html">Report a correction</a></nav></header>'+
  '<main><h1>Five Bars launch readiness</h1><p class="notice"><strong>Public beta, not a certified checkout service or approved affiliate business.</strong> '+
  'The website compares attributed catalog offers, but no carrier price, tax total or customer eligibility is guaranteed. Review carrier checkout before buying.</p>'+
  '<p><strong>Readiness assessment date:</strong> '+clean(date(model.asOf))+
  '. This reflects repository evidence, not independently audited business or financial operations.</p>'+
  '<h2>Evidence coverage</h2><dl class="stats">'+stat('Catalog listings',s.total)+stat('Published source records',s.researched)+
  stat('Published rate matches',s.matched)+stat('Partial source only',s.partial)+stat('Unresearched offers',s.unresearched)+
  stat('Held retailer offers',s.retailerHolds)+stat('Stock holds',s.stockHolds)+
  stat('Current human checkout scenarios',c.reviewed)+'</dl>'+
  '<p>'+clean(c.note)+' <a href="source-research.html">Read exact sources and unresolved conditions.</a></p>'+
  '<h2>Automated monitoring</h2><p><strong>Last recorded scan:</strong> '+clean(model.automation.lastScan||'not reported')+
  '. <strong>Scan freshness:</strong> '+clean(model.automation.scanStatus)+'. '+clean(model.automation.note)+'</p>'+
  '<h2>Required before commercial launch</h2><p>These gates require evidence outside the source scanner. A successful code deployment cannot approve them.</p>'+
  '<ol>'+model.ownerGates.map(row).join('')+'</ol>'+
  '<h2>Safe next steps</h2><p>Use the <a href="review-workbench.html">read-only evidence workbench</a> and '+
  '<a href="source-research.html">source audit</a> to prioritize genuine quotes, with no personal data in public GitHub issues. '+
  'A test fixture or product-page price never counts as a human checkout. See <a href="disclosures.html">commercial disclosures</a>.</p>'+
  '</main><footer>Five Bars — published source evidence is not complete carrier checkout verification. '+
  '<a href="privacy.html">Privacy</a></footer></body></html>\n';
}
const isMain=process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href;
if(isMain){
 const root=new URL('../',import.meta.url);
 const read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
 const [catalog,research,retailerEvidence,ledger,status]=await Promise.all([
  read('site/data/deals.json'),read('site/data/research-evidence.json'),
  read('site/data/retailer-evidence.json'),read('site/data/verifications.json'),read('site/data/status.json')]);
 const model=assessReadiness({catalog,research,retailerEvidence,ledger,status});
 await writeFile(new URL('site/data/launch-readiness.json',root),JSON.stringify(model,null,2)+'\n');
 await writeFile(new URL('site/launch-readiness.html',root),renderReadiness(model));
 console.log(JSON.stringify({stage:model.commercialStage,source:model.source,checkout:model.checkout}));
}
