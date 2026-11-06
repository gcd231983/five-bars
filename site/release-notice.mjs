// Let shoppers know when a newer public release exists. No tracking, local
// storage, user inputs, or background service. Never silently reload a form.
// GitHub Pages release.json is generated from the complete published site tree.
const HASH=/^[0-9a-f]{16}$/;
const PROBE_GAP_MS=120000;
const PERIOD_MS=15*60*1000;

export function releaseComparison(loadedHash,manifest){
 if(!HASH.test(loadedHash||''))return 'unavailable';
 if(manifest?.schema!==1||!HASH.test(manifest?.contentHash||''))return 'unavailable';
 return manifest.contentHash===loadedHash?'current':'newer';
}

export function loadedReleaseHash(doc=document){
 const url=doc.querySelector('script[src*="value-ui.mjs"]')?.getAttribute('src');
 if(!url)return null;
 try{
  const hash=new URL(url,doc.baseURI).searchParams.get('v');
  return HASH.test(hash||'')?hash:null;
 }catch{return null;}
}

export function startReleaseNotice({
 doc=document,win=window,request=fetch,clock=()=>Date.now()
}={}){
 const banner=doc.getElementById('fb-release-notice');
 const button=doc.getElementById('fb-release-reload');
 const hash=loadedReleaseHash(doc);
 if(!banner||!button||!hash)return null; // Raw local source does not have a release manifest.
 let lastProbe=-Infinity,running=false,newRelease=false;
 async function probe(force=false){
  if(newRelease||running||doc.hidden)return;
  const now=clock();
  if(!force&&now-lastProbe<PROBE_GAP_MS)return;
  lastProbe=now;running=true;
  try{
   const response=await request(new URL('release.json',doc.baseURI),{
    cache:'no-store',signal:AbortSignal.timeout(8000)
   });
   if(response.ok&&releaseComparison(hash,await response.json())==='newer'){
    newRelease=true;banner.hidden=false;
   }
  }catch{
   // An offline or blocked manifest is NOT proof that a new release exists.
  }finally{running=false;}
 }
 button.addEventListener('click',()=>win.location.reload());
 win.addEventListener('focus',()=>{void probe(true);});
 win.addEventListener('pageshow',()=>{void probe(true);});
 doc.addEventListener('visibilitychange',()=>{
  if(!doc.hidden)void probe(true);
 });
 const timer=win.setInterval(()=>{void probe();},PERIOD_MS);
 void probe(true);
 return {probe,dispose:()=>win.clearInterval(timer)};
}

if(typeof document!=='undefined')startReleaseNotice();
