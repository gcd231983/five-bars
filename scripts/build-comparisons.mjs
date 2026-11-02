#!/usr/bin/env node
// Refresh editorially curated comparison pages from the *existing* catalog.
// Does not scrape carriers or mark any offer fully verified.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {GUIDES,renderGuide,renderHub,renderSitemap} from './comparison-pages.mjs';

const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const data={
 catalog:await read('site/data/deals.json'),
 status:await read('site/data/status.json'),
 ledger:await read('site/data/verifications.json'),
 mvnoEvidence:await read('site/data/mvno-evidence.json')
};
await mkdir(new URL('site/compare/',root),{recursive:true});
for(const guide of GUIDES){
 const page=renderGuide(guide,data);
 await writeFile(new URL('site/compare/'+guide.slug+'.html',root),page,'utf8');
}
await writeFile(new URL('site/carrier-comparisons.html',root),renderHub(data),'utf8');
await writeFile(new URL('site/sitemap.xml',root),renderSitemap(data),'utf8');
console.log(JSON.stringify({
 guides:GUIDES.map(g=>g.slug),catalogDate:data.catalog.checked,sourceScan:data.status.generatedAt,
 manuallyReviewed:Object.keys(data.ledger?.offers||{}).length
},null,2));
