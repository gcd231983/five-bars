// Validate actual public availability AND the exact source revision deployed by GitHub Pages.
// This does not validate any carrier checkout, eligibility, or promotional price.
import {lookup} from 'node:dns/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const base='https://fivebars.info';
const paths=['/','/data/status.json','/sitemap.xml','/release.json'];
const attempts=6;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function probe(path,{dns=lookup,request=fetch,expectedRevision=null,now=Date.now}={}){
  const url=new URL(path,base);
  if(url.origin!==base)throw Error('Cross-origin probe blocked');
  await dns(url.hostname);
  const response=await request(url,{signal:AbortSignal.timeout(12000),redirect:'follow'});
  if(!response.ok)throw Error(path+' returned HTTP '+response.status);
  if(response.url && new URL(response.url).origin!==base)
    throw Error(path+' redirected to unexpected domain');
  const body=await response.text();
  if(path==='/data/status.json'){
    const status=JSON.parse(body);
    if(!status.generatedAt||!status.summary||!Number.isInteger(status.summary.sourcesChecked))
      throw Error('Live source-status data is malformed');
    const age=now()-Date.parse(status.generatedAt);
    if(!Number.isFinite(age)||age< -300000||age>48*3600000)
      throw Error('Live source-status scan is stale, invalid, or future-dated');
    return {path,generatedAt:status.generatedAt,checked:status.summary.sourcesChecked,reachable:status.summary.sourcesReachable};
  }
  if(path==='/release.json'){
    const release=JSON.parse(body);
    if(!/^[0-9a-f]{40}$/.test(expectedRevision||''))
      throw Error('Expected validated deployment SHA is required');
    if(release.schema!==1||release.revision!==expectedRevision||
       !/^[0-9a-f]{16}$/.test(release.contentHash||''))
      throw Error('Public release revision mismatch or malformed manifest');
    return {path,revision:release.revision,contentHash:release.contentHash};
  }
  if(path==='/sitemap.xml'&&
     (!body.includes('<urlset')||!body.includes('<loc>https://fivebars.info/</loc>')))
     throw Error('Live sitemap is missing the canonical homepage');
  if(path==='/'&&(!/<html[\s>]/i.test(body)||!body.includes('Five Bars')))
    throw Error('Live homepage is missing Five Bars HTML');
  return {path,bytes:body.length};
}

export async function checkProduction({run=probe,wait=delay,retries=attempts,
  expectedRevision=process.env.FIVE_BARS_EXPECTED_SHA||null}={}){
  let lastError;
  for(let i=1;i<=retries;i++){
    try{
      const results=[];
      for(const path of paths)results.push(await run(path,{expectedRevision}));
      return results;
    }catch(error){
      lastError=error;
      if(i<retries)await wait(20000);
    }
  }
  throw Error('Production smoke check failed after '+retries+' attempts: '+lastError.message);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!/^[0-9a-f]{40}$/.test(process.env.FIVE_BARS_EXPECTED_SHA||'')){
    console.error('FIVE_BARS_EXPECTED_SHA must be the exact validated 40-character commit SHA');
    process.exitCode=1;
  }else{
    checkProduction().then(results=>{for(const r of results)console.log(JSON.stringify(r));})
      .catch(error=>{console.error(error.message);process.exitCode=1;});
  }
}
