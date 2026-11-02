import {checkoutEvidenceIssues,localDay} from '../site/value-core.mjs';
// Human sign-off validation for the GitHub Actions manual offer review form.
// This is a guardrail, never a price crawler or auto-approval mechanism.
export const VERIFY_ATTESTATION='I_HAVE_PERSONALLY_CHECKED_ALL_OFFER_TERMS';
export const INVALIDATE_ATTESTATION='I_CONFIRM_THIS_REVIEW_MUST_BE_INVALIDATED';
export const MAX_ID_LENGTH=72;

function officialBase(hostname){
 const parts=String(hostname||'').toLowerCase().split('.');
 return parts.length>=2?parts.slice(-2).join('.'):null;
}
export function validateReviewRequest({operation,id,evidenceUrl,attestation,reviewDetails,
 reviewerActor,catalog,today=localDay()}={}){
 if(!catalog||!Array.isArray(catalog.plans)||!Array.isArray(catalog.phones))
   throw Error('Catalog is missing or invalid');
 if(!['verify','invalidate'].includes(operation))throw Error('Choose verify or invalidate');
 if(typeof id!=='string'||id.length>MAX_ID_LENGTH||!/^[a-z0-9._-]+$/i.test(id))
   throw Error('Invalid offer ID; select one from site/data/deals.json');
 const offer=[...catalog.plans,...catalog.phones].find(x=>x.id===id);
 if(!offer)throw Error('Unknown offer ID: '+id);
 if(operation==='invalidate'){
   if(attestation!==INVALIDATE_ATTESTATION)
     throw Error('To invalidate a human review, type the exact invalidation confirmation phrase');
   return {operation,id,offer,sourceUrl:null};
 }
 if(attestation!==VERIFY_ATTESTATION)
   throw Error('Full-terms attestation is required; do not attest until personally reviewing the exact carrier offer');
 let src,canonical;
 try{
   src=new URL(evidenceUrl);
   canonical=new URL(offer.url);
 }catch{throw Error('Enter a complete official https source URL');}
 if(src.protocol!=='https:'||src.username||src.password||src.port||src.hash||
   !src.hostname.includes('.')||officialBase(src.hostname)!==officialBase(canonical.hostname))
   throw Error('Evidence must be a public HTTPS URL on the same official carrier domain as the catalog offer');
 if(src.href.length>1200)throw Error('Official source URL is too long');
 if(typeof reviewerActor!=='string'||!/^[a-z0-9-]{1,39}$/i.test(reviewerActor))
   throw Error('Human reviewer GitHub actor is required for an attributable review');
 if(typeof reviewDetails!=='string'||reviewDetails.length>4096||reviewDetails.length<30)
   throw Error('Paste anonymized structured checkout evidence JSON (maximum 4096 characters)');
 let checkout;
 try{checkout=JSON.parse(reviewDetails);}
 catch{throw Error('Checkout evidence must be valid JSON; no account numbers or screenshots');}
 const issues=checkoutEvidenceIssues(offer,checkout,today);
 if(issues.length)throw Error('Checkout evidence is incomplete: '+issues.join('; '));
 return {operation,id,offer,sourceUrl:src.href,checkout,reviewerActor};
}
