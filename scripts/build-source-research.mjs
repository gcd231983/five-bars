#!/usr/bin/env node
// Rebuild the transparent public official-source research register. Does NOT
// update carrier rates, crawl sources or sign a human full-terms verification.
// Observation dates remain frozen until humans research and date new records.
import {readFile,writeFile} from 'node:fs/promises';
import {buildResearchAudit,renderResearchPage} from './source-research.mjs';
const root=new URL('../',import.meta.url);
const read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const [catalog,ledger,research]=await Promise.all([
 read('site/data/deals.json'),read('site/data/verifications.json'),
 read('site/data/research-evidence.json')
]);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const audit=buildResearchAudit({catalog,ledger,research,today});
await writeFile(new URL('site/data/research-audit.json',root),JSON.stringify(audit,null,2)+'\n','utf8');
await writeFile(new URL('site/source-research.html',root),renderResearchPage({catalog,ledger,research,today}),'utf8');
console.log(JSON.stringify({researchObservedOn:research.observedOn,checkedOn:today,
  ...audit.summary},null,2));
if(audit.summary.conflictingOrInvalid){
 console.warn('CAUTION: Source-backed catalog fields disagree with dated official research; affected fields must not be quoted as current.');
}
