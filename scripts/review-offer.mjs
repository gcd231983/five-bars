#!/usr/bin/env node
// Human-reviewed evidence only. Automated link scans NEVER run this command.
// Usage:
//   node scripts/review-offer.mjs audit
//   node scripts/review-offer.mjs verify OFFER_ID https://official-carrier-url --full-terms-reviewed --checkout-json JSON --reviewer-actor GH_LOGIN
//   node scripts/review-offer.mjs invalidate OFFER_ID
import {readFile,writeFile} from 'node:fs/promises';
import {localDay,offerSignature,verificationState,validDay} from '../site/value-core.mjs';
import {validateReviewRequest,VERIFY_ATTESTATION} from './review-gate.mjs';
import {safeSourceUrl} from './auto-core.mjs';

const catalogFile=new URL('../site/data/deals.json',import.meta.url);
const recordsFile=new URL('../site/data/verifications.json',import.meta.url);
const catalog=JSON.parse(await readFile(catalogFile,'utf8'));
const records=JSON.parse(await readFile(recordsFile,'utf8'));
const all=[...(catalog.plans||[]),...(catalog.phones||[])];
if(records.schema!==1 || !records.offers || typeof records.offers!=='object' || Array.isArray(records.offers)){
  throw Error('Verification file schema is invalid');
}
const [command,id,url,...opts]=process.argv.slice(2);
const today=localDay();

function lookup(identifier){return all.find(p=>p.id===identifier);}
async function save(){await writeFile(recordsFile,JSON.stringify(records,null,2)+'\n','utf8');}
if(command==='verify'){
  if(!id || !lookup(id)) throw Error('Unknown offer ID; find the ID in site/data/deals.json');
  if(!safeSourceUrl(url)) throw Error('Use a canonical public HTTPS evidence URL');
  if(!opts.includes('--full-terms-reviewed')) {
    throw Error('You must manually inspect the exact deal, price, service requirements and exceptions before adding --full-terms-reviewed');
  }
  const ix=opts.indexOf('--checkout-json'),rx=opts.indexOf('--reviewer-actor');
  if(ix<0||rx<0||!opts[ix+1]||!opts[rx+1])
    throw Error('Anonymized checkout details and attributed reviewer are required; a URL is insufficient');
  const request=validateReviewRequest({
    operation:'verify',id,evidenceUrl:url,attestation:VERIFY_ATTESTATION,
    reviewDetails:opts[ix+1],reviewerActor:opts[rx+1],catalog,today
  });
  const p=request.offer;
  // A human-confirmed, scenario-specific quote, NOT a universal checkout promise.
  records.offers[id]={
    scope:'full_terms',verifiedAt:today,evidenceUrl:request.sourceUrl,
    signature:offerSignature(p),reviewerActor:request.reviewerActor,
    checkout:request.checkout,method:'anonymized_human_checkout_quote'
  };
  await save();
  console.log('Recorded manual full-terms review for '+id+' on '+today+'. This evidence becomes stale after 14 days.');
}else if(command==='invalidate'){
  if(!id || !records.offers[id]) throw Error('No verification record found for '+id);
  delete records.offers[id];
  await save();
  console.log('Removed review record for '+id);
}else if(command==='audit'){
  let invalid=0,stale=0,changed=0,current=0;
  for(const [key,record] of Object.entries(records.offers)){
    const offer=lookup(key);
    if(!offer || !record || record.scope!=='full_terms' || !validDay(record.verifiedAt) ||
      record.verifiedAt>today || !safeSourceUrl(record.evidenceUrl) || typeof record.signature!=='string'){
      console.error('INVALID: '+key+' has missing or malformed evidence or is not in catalog');
      invalid++;continue;
    }
    const status=verificationState(offer,record,today).status;
    if(status==='stale')stale++;
    else if(status==='changed')changed++;
    else if(status==='verified')current++;
    else invalid++;
  }
  console.log(JSON.stringify({total:Object.keys(records.offers).length,current,stale,changed,invalid,unreviewed:all.length-current},null,2));
  if(invalid)process.exitCode=1;
}else{
  console.error('Usage: node scripts/review-offer.mjs audit | verify ID URL --full-terms-reviewed --checkout-json JSON --reviewer-actor GH_LOGIN | invalidate ID');
  process.exitCode=2;
}
