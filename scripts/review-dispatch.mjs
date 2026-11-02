#!/usr/bin/env node
// Only invoked from a user-initiated, GitHub-controlled workflow_dispatch on main.
// It never checks a remote offer or treats source reachability as approval.
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {validateReviewRequest} from './review-gate.mjs';

const catalog=JSON.parse(await readFile(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const request=validateReviewRequest({
 operation:process.env.REVIEW_OPERATION,
 id:process.env.REVIEW_ID,
 evidenceUrl:process.env.REVIEW_URL,
 attestation:process.env.REVIEW_ATTESTATION,
 catalog
});
console.log('Human review operation: '+request.operation);
console.log('Offer ID: '+request.id);
console.log('Carrier: '+request.offer.carrier+' / '+(request.offer.plan||request.offer.phone));
if(request.operation==='verify') {
 console.log('Evidence URL (supplied by reviewer): '+request.sourceUrl);
 console.log('Reminder: the human reviewer, not this workflow, is responsible for checking every material term.');
}
const args=['scripts/review-offer.mjs',request.operation,request.id];
if(request.operation==='verify')args.push(request.sourceUrl,'--full-terms-reviewed');
const outcome=spawnSync(process.execPath,args,{stdio:'inherit',shell:false});
if(outcome.error)throw outcome.error;
if(outcome.status!==0)throw Error('Offer review script failed with exit status '+outcome.status);
console.log('Human-requested review operation passed. Evidence is not automatically carrier-certified.');
