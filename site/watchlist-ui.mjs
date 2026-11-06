// Five Bars: device-local, no-account, opt-in personal watchlist.
// No service worker, push messages, email collection, or remote preference sync.
import {
  WATCHLIST_STORAGE_KEY,MAX_WATCHES,normalizeWatchlist,watchKey,addWatch,
  removeWatch,checkWatchlist,markAlertsSeen,watchPrice
} from './watchlist-core.mjs';
import {usd,localDay} from './value-core.mjs';

const root=document.querySelector('#fb-watchlist-root');
if(!root)throw Error('Missing personal watchlist panel');
let data={schema:1,watches:[],seen:[]};
let feeds=null,storageWarning='';
const el=(tag,text,cls)=>{
  const n=document.createElement(tag);
  if(text!=null)n.textContent=String(text);
  if(cls)n.className=cls;
  return n;
};
function button(title,fn,cls='fb-compare-btn'){
  const b=el('button',title,cls);b.type='button';b.addEventListener('click',fn);return b;
}
function note(txt,cls='fb-subtle'){return el('p',txt,cls);}
function link(url,label){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:' || u.username || u.password)return null;
    const a=el('a',label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;
  }catch{return null;}
}
function persist(){
  try{
    localStorage.setItem(WATCHLIST_STORAGE_KEY,JSON.stringify(data));
    storageWarning='';
    return true;
  }catch{
    storageWarning='This browser blocked local storage. Your watchlist will work only until this page is closed. Export a backup before leaving.';
    return false;
  }
}
function load(){
  if(!feeds)return;
  try{
    const raw=localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if(raw)data=normalizeWatchlist(JSON.parse(raw),feeds.catalog);
  }catch{storageWarning='Unable to read the saved watchlist in this browser. You can create a fresh list or import a backup.';}
}
function watchOffer(kind,id){
  if(!feeds){window.alert('The watchlist is loading. Try again shortly.');return;}
  try{
    const key=kind+':'+id;
    if(!data.watches.some(x=>watchKey(x)===key)){
      data=addWatch(data,{kind,id,target:null},feeds.catalog);
      persist();
    }
    render();
    refreshButtons();
    window.showTab?.('watchlist');
    document.querySelector('#p-watchlist')?.scrollIntoView({block:'start',behavior:'smooth'});
  }catch(e){window.alert(e?.message||'Could not save this watch');}
}
window.fiveBarsWatch=watchOffer;
function refreshButtons(){
  if(!feeds)return;
  const selected=new Set(data.watches.map(watchKey));
  for(const [kind,offers] of [['plan',feeds.catalog.plans],['phone',feeds.catalog.phones]]){
    for(const offer of offers){
      const row=document.getElementById('r-'+offer.id);
      const foot=row?.querySelector('.foot');
      if(!foot)continue;
      let b=foot.querySelector('.fb-watch-toggle');
      if(!b){
        b=button('Watch',()=>watchOffer(kind,offer.id),'fb-compare-btn fb-watch-toggle');
        foot.append(b);
      }
      const watching=selected.has(kind+':'+offer.id);
      b.textContent=watching?'Watching · view':'Watch';
      b.setAttribute('aria-label',(watching?'View saved watch':'Save watch for ')+(kind==='plan'?offer.plan:offer.phone)+' at '+offer.carrier);
      b.setAttribute('aria-pressed',String(watching));
    }
  }
}
window.addEventListener('fivebars:render',refreshButtons);
function titleOf(w){
  if(w.kind==='carrier')return w.id+' — provider watch';
  const offer=(w.kind==='plan'?feeds.catalog.plans:feeds.catalog.phones).find(p=>p.id===w.id);
  return offer ? (w.kind==='plan'?offer.plan:offer.phone)+' — '+offer.carrier : w.id+' (not found)';
}
function detailsOf(w){
  if(w.kind==='carrier'){
    const plans=feeds.catalog.plans.filter(p=>p.carrier===w.id).length;
    const phones=feeds.catalog.phones.filter(p=>p.carrier===w.id).length;
    return plans+' plan(s), '+phones+' phone deal(s) listed. Provider watches show relevant site alerts; a target limits standard plan monthly-equivalent rates ONLY.';
  }
  const offer=(w.kind==='plan'?feeds.catalog.plans:feeds.catalog.phones).find(p=>p.id===w.id);
  if(!offer)return 'This listing is unavailable; you can remove this watch.';
  const price=watchPrice(offer,w.kind,feeds,localDay());
  if(price===null)return 'Price unavailable for target matching. This offer is held, unavailable, expired, financed, or awaiting price review. Your saved watch can still show relevant review alerts.';
  if(w.kind==='phone')return 'Advertised device price: '+usd(price)+'. Required plan, taxes and rebates are NOT included in this target; activation eligibility still requires confirmation.';
  if(offer.billingMonths===12)return 'Monthly equivalent: '+usd(price)+'; full annual prepayment: '+usd(offer.billingUpfront)+'. Your target applies to the monthly equivalent, not the upfront cash requirement.';
  return 'Standard catalog monthly price: '+usd(price)+'. Conditional payment discounts are excluded. Intro discounts, family lines, tax and eligibility may differ.';
}
function attachFeedback(text){
  const slot=document.getElementById('fb-watch-feedback');
  if(slot)slot.textContent=text;
}
function render(){
  root.replaceChildren();
  if(!feeds){root.append(note('Loading catalog and latest price evidence…'));return;}
  const check=checkWatchlist(data,{...feeds});
  const heading=el('div',null,'fb-watch-intro');
  heading.append(el('h3','Saved watches ('+data.watches.length+'/'+MAX_WATCHES+')'));
  heading.append(note('Stored on this device only. When you visit Five Bars, it compares your watches with the latest available catalog and posted official-headline alerts. No account, remote tracking or background push notifications.'));
  heading.append(note(check.note,'fb-watch-hint'));
  if(storageWarning)heading.append(note(storageWarning,'fb-watch-warning'));
  root.append(heading);
  const addPanel=el('form',null,'fb-watch-carrier-form');
  const carrierLabel=el('label','Watch a provider','fb-watch-field');
  const carrierSelect=el('select');
  carrierSelect.id='fb-watch-carrier';
  carrierSelect.setAttribute('aria-label','Provider to watch');
  const blank=el('option','Choose a provider…');blank.value='';carrierSelect.append(blank);
  const providers=[...new Set([...feeds.catalog.plans,...feeds.catalog.phones].map(o=>o.carrier))].sort((a,b)=>a.localeCompare(b));
  for(const name of providers){const opt=el('option',name);opt.value=name;carrierSelect.append(opt);}
  carrierLabel.append(carrierSelect);addPanel.append(carrierLabel);
  const targetLabel=el('label','Optional standard plan monthly target ($)','fb-watch-field');
  const targetInput=el('input');targetInput.type='number';targetInput.min='0';targetInput.max='2000';targetInput.step='.01';targetInput.placeholder='Any rate';
  targetInput.setAttribute('aria-label','Provider plan monthly target price');
  targetLabel.append(targetInput);addPanel.append(targetLabel);
  const submit=el('button','Add provider watch','btn');submit.type='submit';addPanel.append(submit);
  addPanel.addEventListener('submit',event=>{
    event.preventDefault();
    if(!carrierSelect.value){attachFeedback('Choose a provider first.');carrierSelect.focus();return;}
    try{
      data=addWatch(data,{kind:'carrier',id:carrierSelect.value,target:targetInput.value},feeds.catalog);
      persist();render();refreshButtons();attachFeedback('Provider watch saved on this device.');
    }catch(e){attachFeedback(e.message);}
  });
  root.append(addPanel);
  const feedback=el('p','', 'fb-watch-feedback');feedback.id='fb-watch-feedback';feedback.setAttribute('role','status');root.append(feedback);
  const saved=el('section',null,'fb-watch-section');
  saved.append(el('h3','My phones, plans & providers'));
  if(!data.watches.length)saved.append(note('Save a plan or phone from its listing using “Watch”, or choose a provider above. Then add a target price if desired.'));
  const list=el('div',null,'fb-watch-saved');
  for(const w of data.watches){
    const card=el('article',null,'fb-watch-saved-card');
    card.setAttribute('data-watch-key',watchKey(w));
    card.append(el('h4',titleOf(w)));
    card.append(note(detailsOf(w)));
    const row=el('div',null,'fb-watch-saved-actions');
    const label=el('label','Target price ($) · optional','fb-watch-target-label');
    const input=el('input');
    input.type='number';input.min='0';input.max='2000';input.step='.01';input.placeholder='Any price';
    input.value=w.target===null?'':String(w.target);
    input.setAttribute('aria-label','Target price for '+titleOf(w));
    label.append(input);row.append(label);
    row.append(button('Save target',()=>{
      try{
        data=addWatch(data,{kind:w.kind,id:w.id,target:input.value},feeds.catalog);
        persist();render();refreshButtons();attachFeedback('Target saved. Catalog matches update when you visit or refresh the page.');
      }catch(e){attachFeedback(e.message);}
    }));
    row.append(button('Remove',()=>{
      data=removeWatch(data,watchKey(w),feeds.catalog);
      persist();render();refreshButtons();attachFeedback('Watch removed.');
    }));
    card.append(row);list.append(card);
  }
  saved.append(list);root.append(saved);
  const alertsSection=el('section',null,'fb-watch-section');
  alertsSection.append(el('h3','My matching prices & alerts'));
  alertsSection.append(note(check.unread.length+' new or unreviewed item(s); '+check.targetMatches.length+' catalog target match(es). Saved watches do not guarantee that offers remain available.'));
  if(!check.alerts.length)alertsSection.append(note('No matching prices or related site alerts right now. Watchlist targets are paused if the daily source scan is too old.'));
  const messages=el('div',null,'fb-watch-events');
  const seen=new Set(data.seen);
  for(const a of check.alerts.slice(0,40)){
    const card=el('article',null,'fb-watch-event');
    card.setAttribute('data-watch-event',a.key);
    card.append(el('h4',(seen.has(a.key)?'Reviewed · ':'New · ')+a.title));
    if(a.type==='target'){
      card.append(note('Catalog '+(a.kind==='phone'?'advertised device price':'standard monthly-equivalent rate')+
        ': '+usd(a.rate)+' (watch target '+usd(a.threshold)+').'));
      if(a.annual)card.append(note('Annual prepaid: '+usd(a.upfront)+' payable upfront; this is not a monthly bill.'));
    }
    card.append(note(a.description));
    const actions=el('div',null,'fb-card-actions');
    const off=link(a.url,'Check official offer');
    if(off)actions.append(off);
    if(!seen.has(a.key))actions.append(button('Mark reviewed',()=>{
      data=markAlertsSeen(data,[a.key],feeds.catalog);
      persist();render();
    }));
    card.append(actions);messages.append(card);
  }
  if(check.alerts.length>40)messages.append(note('Showing first 40 matches. Narrow your watchlist to focus on priority offers.'));
  alertsSection.append(messages);
  if(check.unread.length)alertsSection.append(button('Mark all current alerts reviewed',()=>{
    data=markAlertsSeen(data,check.unread.map(x=>x.key),feeds.catalog);
    persist();render();
  }));
  root.append(alertsSection);
  const back=el('section',null,'fb-watch-section');
  back.append(el('h3','Backup or transfer my watchlist'));
  back.append(note('Use Export to show a JSON backup; copy it to another browser and paste it below to Import. This data never leaves your device through Five Bars. Import replaces your current watches.'));
  const tools=el('div',null,'fb-card-actions');
  const textarea=el('textarea');textarea.id='fb-watch-backup';textarea.rows=4;textarea.placeholder='Export your JSON or paste a watchlist backup here';
  textarea.setAttribute('aria-label','Watchlist import or export JSON');
  tools.append(button('Export JSON',async()=>{
    textarea.value=JSON.stringify(data,null,2);
    textarea.focus();textarea.select();
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(textarea.value);
      attachFeedback('Backup shown below. Copy it to another device or browser; no data was uploaded.');
    }catch{attachFeedback('Backup shown below; select and copy the text manually.');}
  }));
  tools.append(button('Import JSON',()=>{
    try{
      if(textarea.value.length>25000)throw Error('Backup exceeds the 25 KB import limit.');
      const obj=JSON.parse(textarea.value);
      if(!obj || obj.schema!==1 || !Array.isArray(obj.watches))throw Error('Expected a Five Bars version 1 watchlist JSON backup.');
      data=normalizeWatchlist(obj,feeds.catalog);
      persist();render();refreshButtons();attachFeedback('Imported '+data.watches.length+' watches. Existing watches were replaced on this device.');
    }catch(e){attachFeedback('Import not completed: '+e.message);}
  }));
  back.append(tools,textarea);
  back.append(note('Private browsing, clearing site storage, or changing devices can erase this watchlist. There are no alerts when Five Bars is closed, and no email, SMS, or push notifications are sent.'));
  root.append(back);
  const tabCount=document.getElementById('c-watchlist');
  if(tabCount)tabCount.textContent=data.watches.length?' '+data.watches.length:'';
}
window.addEventListener('fivebars:calendar-day-change',()=>{
  // A stored price target is not proof the offer is still active; re-check
  // current Eastern-date eligibility before showing local watch results.
  if(feeds){render();refreshButtons();}
});
window.addEventListener('fivebars:watch-data',()=>{
  const newFeeds=window.fiveBarsWatchData;
  if(!newFeeds?.catalog)return;
  feeds=newFeeds;
  if(!data.watches.length)load();
  render();refreshButtons();
});
if(window.fiveBarsWatchData){
  feeds=window.fiveBarsWatchData;load();render();refreshButtons();
}else render();
