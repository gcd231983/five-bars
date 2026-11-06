// Public production smoke check. Never reports source reachability as checkout verification.
import {lookup} from 'node:dns/promises';

const base='https://fivebars.info';
const paths=['/','/data/status.json','/sitemap.xml'];
const attempts=6;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function probe(path,{dns=lookup,request=fetch}={}){
  const url=new URL(path,base);
  if(url.origin!==base)throw Error('Cross-origin probe blocked');
  await dns(url.hostname);
  const response=await request(url,{signal:AbortSignal.timeout(12000),redirect:'follow'});
  if(!response.ok)throw Error(path+' returned HTTP '+response.status);
  const body=await response.text();
  if(path==='/data/status.json'){
    const status=JSON.parse(body);
    if(!status.generatedAt||!status.summary||!Number.isFinite(status.summary.sourcesChecked))
      throw Error('Live source-status data is malformed');
    return {path,generatedAt:status.generatedAt,checked:status.summary.sourcesChecked,reachable:status.summary.sourcesReachable};
  }
  if(path==='/sitemap.xml'&&!body.includes('<urlset'))throw Error('Live sitemap is missing urlset');
  if(path==='/'&&!/<html[\s>]/i.test(body))throw Error('Live homepage is not HTML');
  return {path,bytes:body.length};
}

export async function checkProduction({run=probe,wait=delay,retries=attempts}={}){
  let lastError;
  for(let i=1;i<=retries;i++){
    try{
      const results=[];
      for(const path of paths)results.push(await run(path));
      return results;
    }catch(error){
      lastError=error;
      if(i<retries)await wait(20000);
    }
  }
  throw Error('Production smoke check failed after '+retries+' attempts: '+lastError.message);
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  checkProduction().then(results=>{for(const r of results)console.log(JSON.stringify(r));})
    .catch(error=>{console.error(error.message);process.exitCode=1;});
}
