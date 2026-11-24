import {GROUPS,validOffers,offerState,sourceUrl} from './holiday-core.mjs';
const results=document.querySelector('#holiday-results');
const status=document.querySelector('#holiday-status');
const controls=document.querySelector('#holiday-controls');
const filter=document.querySelector('#holiday-filter');
const carrier=document.querySelector('#holiday-carrier');
const context=['scheduled','recheck','ended'];
const contextNames={scheduled:'Announced · not yet open',recheck:'Older terms · needs a fresh source check',ended:'Advertised period ended'};
const contextCopy={
 scheduled:'Price is not shown as currently available. Recheck on the announced start date.',
 recheck:'No firm end was published. We are withholding the last advertised price until the source is checked again.',
 ended:'This is not an active offer. Check the provider’s page for its latest terms.'
};
function node(tag,text,className){
 const el=document.createElement(tag);
 if(text)el.textContent=text;
 if(className)el.className=className;
 return el;
}
function card(row,state){
 const el=node('article','','holiday-card');
 el.id=row.id;
 el.append(node('p',row.carrier,'holiday-tag'),node('h3',row.title));
 if(state==='published'){
  el.append(node('p',row.price,'holiday-price'),node('p',row.cost),node('p',row.terms));
 }else{
  el.append(node('p',contextCopy[state]));
 }
 if(state==='scheduled')el.append(node('p','Announced start: '+row.opens,'holiday-state'));
 if(state!=='recheck')el.append(node('p',row.deadline?'Advertised deadline: '+row.deadline:'No firm advertised deadline found.','holiday-state'));
 el.append(node('p','Published terms checked '+row.checked+' · not checkout-verified','holiday-state'));
 const a=node('a','Read official terms');a.href=sourceUrl(row.source);el.append(a);
 return el;
}
function displaySection(title,rows,output){
 if(rows.length===0)return;
 const section=node('section','','holiday-group');
 const grid=node('div','','holiday-grid');
 for(const [row,state] of rows)grid.append(card(row,state));
 section.append(node('h2',title),grid);output.append(section);
}
let lastView;
function show(offers){
 const now=new Date();
 const rows=offers.filter(row=>(filter.value==='all'||filter.value===row.group)&&(carrier.value==='all'||carrier.value===row.carrier))
   .map(row=>[row,offerState(row,now)]);
 const fingerprint=JSON.stringify(rows.map(([row,state])=>[row.id,state]));
 if(lastView===fingerprint)return;
 lastView=fingerprint;
 const active=rows.filter(([,state])=>state==='published');
 const output=document.createDocumentFragment();
 for(const [kind,title] of Object.entries(GROUPS))displaySection(title,active.filter(([row])=>row.group===kind),output);
 for(const state of context)displaySection(contextNames[state],rows.filter(([,s])=>s===state),output);
 results.replaceChildren(output);
 status.textContent=active.length===0?'No current dated or recently checked listings match these filters.':
   active.length+' current listing'+(active.length===1?'':'s')+' in this view.';
}
try{
 const response=await fetch(new URL('./data/holiday-offers-2026.json',import.meta.url),{cache:'no-cache'});
 if(!response.ok)throw Error('Offer data not reachable');
 const data=await response.json();
 if(!validOffers(data))throw Error('Offer data failed validation');
 for(const label of [...new Set(data.offers.map(row=>row.carrier))].sort()){
  const option=node('option',label);option.value=label;
  carrier.append(option);
 }
 controls.hidden=false;
 for(const el of [filter,carrier])el.addEventListener('change',()=>show(data.offers));
 show(data.offers);
 // A page left open across a start/end boundary is refreshed without a reload.
 setInterval(()=>show(data.offers),60_000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)show(data.offers);});
}catch{
 status.textContent='Deal cards could not load. Use the official sale pages below to check current terms.';
}
