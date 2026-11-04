import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildRelease} from '../scripts/build-release.mjs';

async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'five-bars-release-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const source=join(dir,'source'),output=join(dir,'output');
 await mkdir(join(source,'guide'),{recursive:true});await mkdir(join(source,'data'));
 const files={
  'index.html':'<link href="style.css?theme=light#top" rel="stylesheet"><script type="module" src="ui.mjs"></script><a href="guide/page.html">Guide</a>',
  'guide/page.html':'<link href="../style.css" rel="stylesheet"><a href="https://example.org/other.css">External</a>',
  'ui.mjs':"import {price} from './core.mjs'; export {price}; export const again=()=>import('./core.mjs');\n",
  'core.mjs':'export const price=30;\n',
  'style.css':'body{color:navy}\n',
  'data/verifications.json':'{"schema":1,"offers":{}}\n'
 };
 for(const [name,text] of Object.entries(files))await writeFile(join(source,name),text);
 return {source,output,files};
}
test('release versions local styles and every module import without modifying source, links or verification data',async t=>{
 const f=await fixture(t),r=await buildRelease(f);
 const html=await readFile(join(f.output,'index.html'),'utf8');
 assert.ok(html.includes('style.css?theme=light&v='+r.version+'#top'));
 assert.ok(html.includes('src="ui.mjs?v='+r.version+'"'));
 assert.ok(html.includes('href="guide/page.html"'));
 const guide=await readFile(join(f.output,'guide/page.html'),'utf8');
 assert.ok(guide.includes('../style.css?v='+r.version));
 assert.ok(guide.includes('https://example.org/other.css'));
 const ui=await readFile(join(f.output,'ui.mjs'),'utf8');
 assert.equal(ui.split('./core.mjs?v='+r.version).length-1,2);
 const module=await import(pathToFileURL(join(f.output,'ui.mjs')).href);
 assert.equal(module.price,30);assert.equal((await module.again()).price,30);
 for(const [name,text] of Object.entries(f.files))assert.equal(await readFile(join(f.source,name),'utf8'),text);
 assert.equal(await readFile(join(f.output,'data/verifications.json'),'utf8'),f.files['data/verifications.json']);
});
test('identical releases are reproducible; a dependency change invalidates the whole module graph and source output is rejected',async t=>{
 const f=await fixture(t);
 const a=await buildRelease(f),b=await buildRelease(f);
 assert.equal(a.version,b.version);
 await writeFile(join(f.source,'core.mjs'),'export const price=35;\n');
 const c=await buildRelease(f);
 assert.notEqual(c.version,a.version);
 assert.ok((await readFile(join(f.output,'index.html'),'utf8')).includes('ui.mjs?v='+c.version));
 assert.ok((await readFile(join(f.output,'ui.mjs'),'utf8')).includes('./core.mjs?v='+c.version));
 await assert.rejects(buildRelease({source:f.source,output:f.source}),/separate/);
 await assert.rejects(buildRelease({source:f.source,output:join(f.source,'nested')}),/separate/);
 await assert.rejects(buildRelease({source:f.source,output:join(f.source,'..')}),/separate/);
});
