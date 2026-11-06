import {simulateSwitch,formatSwitchSummary,switchShareParams,parseSwitchShare} from './switch-core.mjs';
import {localDay,pastEnd} from './value-core.mjs';
const root=document.getElementById('fb-switch-root');
if(!root)throw Error('Missing Switch & Save root');
const make=(tag,text,cls)=>{
  const x=document.createElement(tag);if(text!=null)x.textContent=String(text);
  if(cls)x.className=cls;return x;
};
const fmt=n=>'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const notice=(msg)=>{const x=document.getElementById('fb-switch-message');if(x)x.textContent=msg;};
const button=(label,act)=>{
  const b=make('button',label,'fb-compare-btn');b.type='button';b.addEventListener('click',act);return b;
};
const pageParts=[
'<p class="fb-subtle">Compare what you pay now with estimated carrier service and phone-promotion costs. Every input stays on your device; no account or paid AI service is involved.</p>',
'<form id="fb-switch-form" class="fb-form"><div class="fb-switch-fields">',
'<label>Compare<select name="type" id="fb-switch-type"><option value="plan">Keep my phone / switch plans</option><option value="phone">Get a promotional phone</option></select></label>',
'<label>Carrier offer<select name="id" id="fb-switch-offer" required><option value="">Choose an offer</option></select></label>',
'<label>Wireless lines<select name="lines" id="fb-switch-lines"><option value="1">1 line</option><option value="2">2 lines</option><option value="3">3 lines</option><option value="4">4 lines</option><option value="5">5 lines</option></select></label>',
'<label>Compare over<select name="horizon" id="fb-switch-horizon"><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option></select></label>',
'<label>My current total monthly wireless bill ($)<input name="currentMonthly" id="fb-switch-current" type="number" min="0" max="5000" step=".01" required placeholder="e.g. 95.00"></label>',
'<label>Current phone payoff ($)<input name="payoff" type="number" min="0" max="100000" step=".01" value="0" required></label>',
'<label>Other one-time switching expenses ($)<input name="switchFees" type="number" min="0" max="100000" step=".01" value="0" required></label>',
'<label>Other monthly fees NOT already listed by the carrier ($)<input name="extraMonthly" type="number" min="0" max="1000" step=".01" value="0" required></label>',
'</div><label class="fb-switch-check"><input type="checkbox" name="canPort" id="fb-switch-canport"> I confirm I can transfer an eligible number to the new carrier</label>',
'<label class="fb-switch-check"><input type="checkbox" name="newCustomer" id="fb-switch-newcustomer"> I qualify for this carrier’s new-customer or eligible new-line promotion</label>',
'<label class="fb-switch-check"><input type="checkbox" name="discountQualified" id="fb-switch-discountqualified"> I meet all required AutoPay, Auto-Refill or eBilling conditions</label>',
'<p class="fb-subtle">Conservative model: conditional credits, rebates, and hypothetical trade-in values are NOT counted as savings.</p>',
'<button type="submit" class="btn" id="fb-switch-submit" disabled>Loading deals…</button></form>',
'<p id="fb-switch-message" role="status" aria-live="polite"></p>',
'<div id="fb-switch-results" aria-live="polite"></div>',
'<section class="fb-switch-steps"><h3>Verify before changing carriers</h3><ol>',
'<li>Check your home and travel areas on the <a href="https://broadbandmap.fcc.gov/" target="_blank" rel="noopener noreferrer">FCC mobile coverage map</a> (modeled outdoor, not guaranteed indoor coverage).</li>',
'<li>Check carrier IMEI/eSIM acceptance, number-transfer PIN requirements, and phone-unlock status.</li>',
'<li>Confirm taxes, activation fees, first-month charges, cancellation penalties, financing and the exact promotion at checkout.</li>',
'<li>Keep your old service active until your phone number has successfully transferred.</li>',
'</ol></section>'
];
root.innerHTML=pageParts.join('');
const form=document.getElementById('fb-switch-form'),results=document.getElementById('fb-switch-results');
const choose=(field)=>document.getElementById('fb-switch-'+field);
let catalog=null,phoneEvidence={},mvnoEvidence={},status={},verifications={},researchEvidence=null,selected=null;
let pending=null;
function listOffers(){
  if(!catalog)return [];
  return choose('type').value==='phone'?catalog.phones.filter(x=>x.availability!=='out_of_stock'&&!pastEnd(x.ends,localDay())):catalog.plans;
}
function updateOptions(){
  const existing=choose('offer').value;
  const list=listOffers().slice().sort((a,b)=>a.carrier.localeCompare(b.carrier));
  const select=choose('offer');select.replaceChildren();
  const blank=make('option','Choose an offer…');blank.value='';select.append(blank);
  for(const p of list){
    const opt=make('option',p.carrier+' — '+(p.plan||p.phone));opt.value=p.id;select.append(opt);
  }
  select.value=list.some(x=>x.id===existing)?existing:
    pending?.type===choose('type').value && list.some(x=>x.id===pending.id)?pending.id:'';
  choose('lines').disabled=choose('type').value==='phone';
  if(choose('type').value==='phone')choose('lines').value='1';
  results.replaceChildren();
}
function pick(type,id,open=true){
  if(!catalog){pending={type,id};return;}
  const found=(type==='plan'?catalog.plans:catalog.phones.filter(x=>x.availability!=='out_of_stock')).some(x=>x.id===id);
  if(!found){notice('Offer not available in the catalog.');return;}
  pending={type,id};choose('type').value=type;updateOptions();choose('offer').value=id;
  if(open){
    window.showTab?.('switch');
    document.getElementById('p-switch')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  notice('Offer selected. Enter your current total monthly bill to estimate savings.');
}
window.fiveBarsSwitch=pick;
function addCardActions(){
  if(!catalog)return;
  for(const [type,items] of [['plan',catalog.plans],['phone',catalog.phones]]){
    for(const p of items){
      const foot=document.getElementById('r-'+p.id)?.querySelector('.foot');
      if(!foot||(type==='phone'&&p.availability==='out_of_stock')||foot.querySelector('.fb-switch-button'))continue;
      const btn=button('Switch & save',()=>pick(type,p.id));
      btn.classList.add('fb-switch-button');
      btn.setAttribute('aria-label','Estimate switch savings for '+p.carrier+' '+(p.plan||p.phone));
      foot.append(btn);
    }
  }
}
window.addEventListener('fivebars:render',addCardActions);
function metric(label,value){
  const row=make('div',null,'fb-switch-metric');
  row.append(make('span',label),make('strong',value));return row;
}
function showCopy(text){
  let input=document.getElementById('fb-switch-copy');
  if(!input){input=make('textarea');input.id='fb-switch-copy';input.rows=5;
    input.setAttribute('aria-label','Copyable switching report');results.after(input);}
  input.value=text;input.focus();input.select();
}
async function copy(text,description){
  try{await navigator.clipboard.writeText(text);notice(description+' copied to clipboard.');}
  catch{showCopy(text);notice('Clipboard blocked. Select the text in the box below to copy.');}
}
function render(report){
  results.replaceChildren();
  const section=make('section',null,'fb-switch-results');
  section.append(make('h3',report.offer.carrier+' — '+report.offer.name));
  const cards=make('div',null,'fb-switch-metrics');
  cards.append(
    metric('Current '+report.scenario.horizon+'-month spending',fmt(report.chosen.currentTotal)),
    metric('Switched cost estimate',fmt(report.chosen.newTotal)),
    metric(report.chosen.savings>=0?'Potential savings':'Potential extra spending',fmt(Math.abs(report.chosen.savings))),
    metric('Estimated initial payment',fmt(report.chosen.upfrontDue))
  );
  section.append(cards);
  section.append(make('p','Break even: '+(report.breakEven==null?
    'Not within '+report.scenario.horizon+' months':'Month '+report.breakEven),'fb-switch-highlight'));
  const table=make('table',null,'fb-switch-table');
  const header=make('thead'),head=make('tr');
  for(const title of ['Horizon','Keep service','Switch','Difference'])head.append(make('th',title));
  header.append(head);table.append(header);
  const tbody=make('tbody');
  for(const months of [12,24,36]){
    const r=report.results[months],row=make('tr');
    for(const value of [months+' months',fmt(r.currentTotal),fmt(r.newTotal),
      (r.savings>=0?'+':'−')+fmt(Math.abs(r.savings))])row.append(make('td',value));
    if(months===report.scenario.horizon)row.className='fb-switch-active';
    tbody.append(row);
  }
  table.append(tbody);section.append(table);
  const details=make('details');details.append(make('summary','How the estimated cost is built'));
  const breakdown=make('div',null,'fb-switch-breakdown');
  breakdown.append(
    metric('Carrier service',fmt(report.chosen.serviceTotal)),
    metric('Additional recurring fees',fmt(report.chosen.additionalMonthlyFeeTotal)),
    metric('Device, payoff, one-time costs',fmt(report.chosen.oneTimeCost))
  );
  details.append(breakdown);section.append(details);
  section.append(make('h4','Important assumptions'));
  const list=make('ul',null,'fb-switch-warnings');
  for(const text of report.warnings)list.append(make('li',text));
  section.append(list);
  const actions=make('div',null,'fb-card-actions');
  try{
    const carrierURL=new URL(report.offer.url);
    if(carrierURL.protocol==='https:'&&!carrierURL.username&&!carrierURL.password&&!carrierURL.port){
      const link=make('a','View carrier offer');link.href=carrierURL.href;
      link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
    }
  }catch{}
  actions.append(button('Copy full report',()=>copy(formatSwitchSummary(report,{includeInputs:true}),'Full report (including your financial inputs)')));
  actions.append(button('Print / save PDF',()=>window.print()));
  actions.append(button('Share private-safe link',()=>{
    const url=new URL(window.location.href);
    url.search=switchShareParams(report.offer.kind,report.offer.id,report.scenario).toString();
    url.hash='switch-save';
    copy(url.href,'Offer-only link without your bill or payoff');
  }));
  section.append(actions);results.append(section);
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  const f=new FormData(form);
  try{
    const report=simulateSwitch({
      catalog,type:f.get('type'),id:f.get('id'),
      scenario:{
        lines:Number(f.get('lines')||1),horizon:Number(f.get('horizon')||12),
        currentMonthly:f.get('currentMonthly'),payoff:f.get('payoff'),
        switchFees:f.get('switchFees'),extraMonthly:f.get('extraMonthly'),
        cannotPort:!f.has('canPort'),canPort:f.has('canPort'),newCustomer:f.has('newCustomer'),
        discountQualified:f.has('discountQualified')
      },phoneEvidence,mvnoEvidence,status,verifications,researchEvidence
    });
    render(report);notice('Estimated locally. Please review all assumptions and verify checkout terms with the carrier.');
  }catch(e){results.replaceChildren();notice(e.message||'Could not calculate this offer.');}
});
choose('type').addEventListener('change',updateOptions);
function updateData(){
  const data=window.fiveBarsWatchData;
  if(!data?.catalog)return;
  const first=!catalog;
  catalog=data.catalog;phoneEvidence=data.phoneEvidence||{};
  mvnoEvidence=data.mvnoEvidence||{};status=data.status||{};
  verifications=data.verifications||{};researchEvidence=data.researchEvidence||null;
  choose('submit').disabled=false;choose('submit').textContent='Calculate switching savings';
  if(first){
    const share=parseSwitchShare(window.location.search,catalog);
    if(share){
      pending={type:share.type,id:share.id};choose('type').value=share.type;
      choose('lines').value=String(share.scenario.lines);
      choose('horizon').value=String(share.scenario.horizon);
      choose('canport').checked=share.scenario.canPort;
      choose('newcustomer').checked=share.scenario.newCustomer;
      choose('discountqualified').checked=share.scenario.discountQualified;
      if(share.hasFinancials)for(const [key,field] of [
        ['currentMonthly','fb-switch-current'],['payoff','payoff'],
        ['switchFees','switchFees'],['extraMonthly','extraMonthly']
      ]){
        const input=form.elements.namedItem(field)||document.getElementById(field);
        if(input&&Number.isFinite(share.scenario[key]))input.value=share.scenario[key];
      }
      window.showTab?.('switch');
    }else if(window.location.hash==='#switch-save')window.showTab?.('switch');
  }
  updateOptions();addCardActions();
}
window.addEventListener('fivebars:calendar-day-change',()=>{
  // Previous savings calculations refer to yesterday's promotion/eligibility.
  // Preserve form inputs, but never leave yesterday's totals on screen.
  if(results.children.length){
    results.replaceChildren();
    notice('Eastern calendar date changed. Recalculate savings using the current promotion terms and confirm checkout.');
  }
  updateOptions();
});
window.addEventListener('fivebars:watch-data',updateData);
if(window.fiveBarsWatchData)updateData();
