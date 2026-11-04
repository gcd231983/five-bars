// Build a cache-coherent static release without changing source or evidence.
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,dirname,join,sep,posix} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function readTree(dir,prefix=''){
 const result=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=prefix+entry.name;
  if(entry.isDirectory())result.push(...await readTree(join(dir,entry.name),path+'/'));
  else if(entry.isFile())result.push([path,await readFile(join(dir,entry.name))]);
  else throw Error('Unsupported release entry: '+path);
 }
 return result.sort(([a],[b])=>a.localeCompare(b,'en'));
}
export async function buildRelease({source=join(root,'site'),output=join(root,'_site')}={}){
 source=resolve(source);output=resolve(output);
 const within=(parent,child)=>child===parent||child.startsWith(parent.endsWith(sep)?parent:parent+sep);
 if(within(output,source)||within(source,output))
  throw Error('Release output must be separate from the source tree');
 const files=await readTree(source);
 const hash=createHash('sha256');
 for(const [path,bytes] of files)hash.update(path+'\0').update(bytes).update('\0');
 const version=hash.digest('hex').slice(0,16);
 const assets=new Set(files.filter(([path])=>/\.(?:m?js|css)$/.test(path)).map(([path])=>path));
 function versioned(file,url){
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(url))return url;
  const match=url.match(/^([^?#]+)(?:\?([^#]*))?(#.*)?$/);
  if(!match||!assets.has(posix.normalize(posix.join(posix.dirname(file),match[1]))))return url;
  const query=new URLSearchParams(match[2]||'');query.set('v',version);
  return match[1]+'?'+query.toString()+(match[3]||'');
 }
 function moduleRefs(file,text){
  return text.replace(/(\b(?:from|import)\s*)(["'])([^"']+)\2/g,
   (_,prefix,quote,url)=>prefix+quote+versioned(file,url)+quote)
   .replace(/(\bimport\s*\(\s*)(["'])([^"']+)\2/g,
    (_,prefix,quote,url)=>prefix+quote+versioned(file,url)+quote);
 }
 await rm(output,{recursive:true,force:true});
 for(const [file,bytes] of files){
  let result=bytes;
  if(/\.(?:html|m?js)$/.test(file)){
   let text=moduleRefs(file,bytes.toString('utf8'));
   if(file.endsWith('.html'))text=text.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi,
    (_,attr,quote,url)=>attr+'='+quote+versioned(file,url)+quote);
   result=text;
  }
  const dest=join(output,file);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,result);
 }
 return {version,files:files.length,output};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 console.log(JSON.stringify(await buildRelease()));
