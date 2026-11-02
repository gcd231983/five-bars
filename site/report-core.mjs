// Privacy-aware, local-only reader correction drafts. No automatic submissions.
import {validDay,localDay} from './value-core.mjs';
export const ISSUE_URL='https://github.com/gcd231983/five-bars/issues/new?template=offer-correction.yml';
export const REPORT_TYPES=Object.freeze([
 ['price','Incorrect advertised price or renewal'],
 ['fees','Unexpected mandatory fees or initial payment'],
 ['eligibility','Port-in, AutoPay or other eligibility requirement'],
 ['availability','Phone or promotion unavailable'],
 ['coverage','Network, compatibility or coverage statement'],
 ['terms','Data, hotspot, locking, credits or contract terms'],
 ['site','Site bug, accessibility or other issue']
]);
const types=new Map(REPORT_TYPES);
const idPattern=/^[a-z0-9][a-z0-9._-]{0,71}$/i;
const pii=/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b|\b(?:\d[\s-]?){13,19}\b|\b(?:account\s*(?:number|#|id)|transfer\s*pin|password|passcode|social security|ssn)\b/i;
export function reportLink(id){
 return typeof id==='string'&&idPattern.test(id)?'report.html?offer='+encodeURIComponent(id):'report.html';
}
export function findReportOffer(catalog,id){
 if(id==='site')return {id:'site',kind:'site',carrier:'Site-wide',offer:'Five Bars website'};
 if(!catalog||!Array.isArray(catalog.plans)||!Array.isArray(catalog.phones)||!idPattern.test(String(id||'')))return null;
 const p=catalog.plans.find(x=>x.id===id);
 if(p)return {id,kind:'plan',carrier:p.carrier,offer:p.plan};
 const d=catalog.phones.find(x=>x.id===id);
 return d?{id,kind:'phone',carrier:d.carrier,offer:d.phone}:null;
}
export function reportSource(raw){
 const str=String(raw||'').trim();
 if(!str)return '';
 if(str.length>500)throw Error('Use a shorter public source URL (maximum 500 characters).');
 let url;
 try{url=new URL(str)}catch{throw Error('Enter a complete public HTTPS source URL.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||url.search||
  !url.hostname.includes('.')||url.hostname==='localhost'||url.hostname.endsWith('.local')||
  /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname))
  throw Error('Use public HTTPS without login details, query strings, fragments or tracking tokens.');
 return url.href;
}
export function buildReport(catalog,{offerId,category,observedAt,sourceUrl,details,publicAcknowledged}={},today=localDay()){
 const offer=findReportOffer(catalog,offerId);
 if(!offer)throw Error('Choose a listed carrier offer or the general website issue option.');
 if(!types.has(category))throw Error('Choose the problem type.');
 if(!validDay(observedAt)||!validDay(today)||observedAt>today)
  throw Error('Use a valid observation date that is not in the future.');
 const cleaned=String(details||'').trim().replace(/\r\n/g,'\n');
 if(cleaned.length<20||cleaned.length>900)throw Error('Describe the discrepancy in 20–900 characters.');
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleaned))throw Error('Remove control characters.');
 if(pii.test(cleaned)||pii.test(String(sourceUrl||'')))
  throw Error('Remove possible phone numbers, emails, account numbers, PINs or other private details.');
 if(publicAcknowledged!==true)throw Error('Acknowledge that GitHub reports are public.');
 const source=reportSource(sourceUrl);
 const draft=[
 '## Five Bars listing correction (reader report — NOT verified)','',
 '**Offer ID:** '+offer.id,'**Carrier:** '+offer.carrier,
 '**Listing:** '+offer.offer+' ('+offer.kind+')',
 '**Category:** '+types.get(category),'**Observed on:** '+observedAt,
 '**Public source:** '+(source||'Not supplied; requires independent carrier research'),
 '','**What needs checking:**',cleaned,'',
 '**Editorial note:** Unverified reader feedback. Independently check the selected official offer and eligibility, document findings and test any correction. Do not imply checkout verification.'
 ].join('\n');
 return {offer,draft,category,source,issueUrl:ISSUE_URL};
}
