// Browser-only correction assistant. Does not submit, log or retain visitor data.
import {localDay} from './value-core.mjs';
import {REPORT_TYPES,ISSUE_URL,buildReport,findReportOffer} from './report-core.mjs';
const $=id=>document.getElementById(id);
const notice=(message,error=false)=>{
 $('fb-report-status').textContent=message;$('fb-report-status').dataset.error=String(error);
};
const option=(value,label)=>{
 const el=document.createElement('option');el.value=value;el.textContent=label;return el;
};
$('fb-issue-open').href=ISSUE_URL;
$('fb-report-observed').value=localDay();
const selected=new URLSearchParams(location.search).get('offer');
let catalog=null;
for(const [kind,label] of REPORT_TYPES)$('fb-report-category').append(option(kind,label));
async function load(){
 try{
  const response=await fetch('data/deals.json',{cache:'no-store'});
  if(!response.ok)throw Error('Unable to load the latest offer list');
  catalog=await response.json();
  if(!Array.isArray(catalog.plans)||!Array.isArray(catalog.phones))throw Error('Invalid catalog');
  const el=$('fb-report-offer');
  el.append(option('','Choose a carrier offer'),option('site','General Five Bars website issue'));
  const rows=[...catalog.plans.map(x=>({...x,label:x.plan,kind:'plan'})),
   ...catalog.phones.map(x=>({...x,label:x.phone,kind:'phone'}))];
  rows.sort((a,b)=>a.carrier.localeCompare(b.carrier)||a.label.localeCompare(b.label));
  for(const row of rows)el.append(option(row.id,row.carrier+' — '+row.label+' ('+row.kind+')'));
  if(selected&&findReportOffer(catalog,selected))el.value=selected;
  else if(selected)notice('This offer is no longer available in the catalog. Choose a current listing.',true);
  $('fb-report-form').hidden=false;
  if(!selected)notice('Choose an offer to prepare a report. No information is submitted from this page.');
 }catch(error){notice(error.message+'. You can open the public GitHub issue form directly.',true);}
}
load();
$('fb-report-form').addEventListener('submit',event=>{
 event.preventDefault();
 $('fb-report-result').hidden=true;
 try{
  if(!catalog)throw Error('Offer catalog has not loaded');
  const result=buildReport(catalog,{
   offerId:$('fb-report-offer').value,category:$('fb-report-category').value,
   observedAt:$('fb-report-observed').value,sourceUrl:$('fb-report-source').value,
   details:$('fb-report-details').value,publicAcknowledged:$('fb-report-public').checked
  },localDay());
  $('fb-report-draft').value=result.draft;
  $('fb-report-result').hidden=false;
  notice('Draft prepared locally. Review and copy it, then choose whether to submit a public GitHub issue.');
 }catch(error){notice(error.message,true);}
});
for(const e of ['input','change'])$('fb-report-form').addEventListener(e,()=>{$('fb-report-result').hidden=true;});
$('fb-report-copy').addEventListener('click',async()=>{
 const draft=$('fb-report-draft').value;
 if(!draft){notice('Prepare a report first.',true);return;}
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
  await navigator.clipboard.writeText(draft);
  notice('Draft copied. Paste it into the GitHub issue description. Nothing has been submitted yet.');
 }catch{
  $('fb-report-draft').focus();$('fb-report-draft').select();
  notice('Automatic copy unavailable. Manually copy the selected text, then open the GitHub form.');
 }
});
