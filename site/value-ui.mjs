// Five Bars guided decisions and side-by-side comparison.
// UI never makes unverified offer claims. All inputs remain in this browser.
import {
  MAX_COMPARE, localDay, pastEnd, usd, verificationState, planCost, phoneCost,
  rankMatches, normalizeCompare, comparisonPriceOverview, offerLinkCheck
} from './value-core.mjs';
import {reportLink} from './report-core.mjs';

const finderRoot = document.querySelector('#fb-finder-root');
const compareRoot = document.querySelector('#fb-compare-root');
if (!finderRoot || !compareRoot) throw new Error('Five Bars comparison panels were not found');
const STORAGE_KEY = 'fivebars-compare-v1';
const COMPARE_PREFS_KEY = 'fivebars-household-compare-v1';
let comparePrefs = {lines:1,cannotPort:false,canPort:false,newCustomer:false,discountQualified:false,fromFinder:false};
let catalog = {plans:[],phones:[]};
let reviews = {};
let selected = [];
let compareBrowseType='plan';
let compareQuery='';
let compareExpanded=false;
let compareNotice='';
let priceEvidence = null;
let priceHistory = {offers:{}};
let mvnoEvidence = null;
let mvnoHistory = {offers:{}};
let reviewQueue = null;
let alertFeed = null;
let researchAudit = null;
let scanStatus = null;
const EVIDENCE_FRESH_MS = 48*60*60*1000;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined && content !== null) node.textContent = String(content);
  if (className) node.className = className;
  return node;
}
function button(label, onClick, className = 'btn ghost') {
  const b = element('button', label, className);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
// Canonical carrier domains avoid affiliate, retailer and help-center icons.
const CARRIER_ICON_DOMAINS=Object.freeze({
  'AT&T':'att.com','AT&T Prepaid':'att.com',
  'Boost Mobile':'boostmobile.com','Consumer Cellular':'consumercellular.com',
  'Cricket':'cricketwireless.com','Good2Go Mobile':'good2gomobile.com',
  'Google Fi':'fi.google.com','H2O Wireless':'h2owireless.com',
  'Helium Mobile':'hellohelium.com','Metro by T-Mobile':'metrobyt-mobile.com',
  'Mint Mobile':'mintmobile.com','MobileX':'mymobilex.com',
  'Red Pocket Mobile':'redpocket.com','Simple Mobile':'simplemobile.com',
  'Straight Talk':'straighttalk.com','Straight Talk at Walmart':'straighttalk.com',
  'T-Mobile':'t-mobile.com','Tello':'tello.com',
  'Total Wireless':'totalwireless.com','Tracfone':'tracfone.com',
  'US Mobile':'usmobile.com','Ultra Mobile':'ultramobile.com',
  'Verizon':'verizon.com','Verizon Prepaid':'verizon.com',
  'Verizon Prepaid at Walmart':'verizon.com','Visible':'visible.com'
});
function providerIcon(offer) {
  const carrier=String(offer.carrier||'Carrier').trim();
  const fallback=element('span',carrier.split(/\s+/).map(word=>word[0]||'').slice(0,2).join('').toUpperCase(),'fb-provider-initials');
  fallback.setAttribute('aria-hidden','true');
  const frame=element('span',null,'fb-provider-mark');
  frame.setAttribute('aria-hidden','true');
  frame.append(fallback);
  const domain=CARRIER_ICON_DOMAINS[carrier];
  if(!domain)return frame;
  const icon=document.createElement('img');
  icon.className='fb-provider-icon';
  icon.alt='';
  icon.width=28;
  icon.height=28;
  icon.loading='lazy';
  icon.referrerPolicy='no-referrer';
  // The favicon proxy handles the inconsistent /favicon.ico paths used by carriers.
  // This is carrier website iconography, not a guarantee of an official brand logo.
  icon.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64';
  icon.addEventListener('load',()=>{if(icon.naturalWidth>0)fallback.hidden=true;});
  icon.addEventListener('error',()=>{icon.remove();});
  frame.append(icon);
  return frame;
}
function note(text) { return element('p',text,'fb-subtle'); }
function linkTo(url,text) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return element('span','Source unavailable');
    const a = element('a',text);
    a.href = parsed.href; a.target='_blank'; a.rel='noopener noreferrer';
    return a;
  } catch { return element('span','Source unavailable'); }
}
function priceProofFor(offer) {
  const forPlan=Object.hasOwn(mvnoEvidence?.offers||{},offer.id);
  const report=forPlan?mvnoEvidence:priceEvidence;
  const proof=report?.offers?.[offer.id];
  if(!proof || !report?.generatedAt) return null;
  const age=Date.now()-Date.parse(report.generatedAt);
  if(!Number.isFinite(age) || age<0 || age>EVIDENCE_FRESH_MS) {
    return {state:'outdated',note:'Last official headline scan is older than 48 hours. Refresh before trusting advertised prices.'};
  }
  // A successful headline match is NOT checkout or full-offer validation.
  return {...proof,isPlan:forPlan};
}
function officialHeadlineUnderReview(offer) {
  const state=mvnoEvidence?.offers?.[offer?.id]?.state || priceEvidence?.offers?.[offer?.id]?.state;
  const published=researchAudit?.offers?.find(x=>x.id===offer?.id)?.researchState;
  return ['headline_mismatch','ambiguous','unresolved_mismatch'].includes(state)||
    ['conflict','invalid'].includes(published);
}
function statusNode(offer) {
  const s=verificationState(offer,reviews[offer.id]);
  const wrapper=element('span',null,'fb-badges');
  const manual=element('span',s.label,'fb-status fb-'+s.status);
  manual.title=s.status==='verified'?
    'An attributed human checked one specific carrier checkout scenario, NOT a guaranteed price or eligibility for other visitors. Confirm your own checkout.':
    'The catalog price and all promotion terms have not been fully verified';
  wrapper.append(manual);
  const linkCheck=offerLinkCheck(offer.id,scanStatus);
  // A 403, timeout, invalid response, or stale scan is NOT proof the carrier
  // withdrew an offer; nor is HTTP 200 proof that advertised terms still apply.
  if(linkCheck.state!=='reachable'){
    const badge=element('span',linkCheck.label,'fb-status fb-evidence-neutral');
    badge.title=linkCheck.state==='unavailable'?
      'Latest automated request could not read this offer link. This does not prove the deal has ended or that its price changed. Confirm current terms directly with the carrier.':
      'No recent, valid automated link check is available. Confirm price, eligibility, taxes and all terms with the carrier.';
    wrapper.append(badge);
  }
  if(offer.listingHold){
    const held=element('span','Retail price under review','fb-status fb-evidence-warning');
    held.title='Selected retailer channel and qualifying plan are not independently supported; no purchasable cash quote.';
    wrapper.append(held);
  }
  if(offer.availability==='out_of_stock'){
    const missing=element('span','Out of stock on '+(offer.availabilityObservedOn||'recorded date'),'fb-status fb-evidence-warning');
    missing.title='Carrier stock was unavailable on this observed date. Prices remain historic advertised headlines, NOT purchasable checkout quotes.';
    wrapper.append(missing);
  }
  const proof=priceProofFor(offer);
  if(proof){
    const labels={
      headline_matched:[proof.isPlan?'Official plan rate matches · partial':'Official headline matches · partial','fb-evidence-match'],
      headline_mismatch:[proof.isPlan?'Official plan rate differs':'Official headline differs','fb-evidence-warning'],
      not_found:[proof.isPlan?'Official plan price not found':'Official headline not found','fb-evidence-warning'],
      ambiguous:['Conflicting official prices','fb-evidence-warning'],
      unresolved_mismatch:['Previous price conflict unresolved','fb-evidence-warning'],
      source_unavailable:['Official price source unavailable','fb-evidence-neutral'],
      outdated:['Price evidence scan is outdated','fb-evidence-neutral']
    };
    const [label,cls]=labels[proof.state]||['Official evidence requires review','fb-evidence-neutral'];
    const badge=element('span',label,'fb-status '+cls);
    badge.title=proof.note || 'Only selected public rate and billing headline fields were checked; full offer terms are not independently verified';
    wrapper.append(badge);
  }
  const record=researchAudit?.offers?.find(x=>x.id===offer.id);
  if(record && record.researchState!=='not_researched'){
    const days=Math.round((Date.parse(localDay()+'T12:00:00Z')-Date.parse(record.researchedOn+'T12:00:00Z'))/86400000);
    const status=record.researchState==='published_match'&&days>21?'aged':record.researchState;
    const checked=status==='published_match';
    const label=checked?'Dated carrier source · partial':status==='published_partial'?'Carrier facts · service price unknown':status==='aged'?'Carrier source outdated':
      status==='conflict'||status==='invalid'?'Official source conflict':'Research needs review';
    const link=element('a',label,'fb-status '+(checked?'fb-evidence-match':status==='published_partial'?'fb-evidence-neutral':'fb-evidence-warning'));
    link.href='source-research.html#research-'+encodeURIComponent(offer.id);
    link.title='Dated official published-price evidence; NOT independent checkout validation. Open the carrier-source audit.';
    wrapper.append(link);
  }
  return wrapper;
}
function decorateCards() {
  for (const item of [...catalog.plans,...catalog.phones]) {
    const slot = document.querySelector('#r-'+CSS.escape(item.id)+' [data-verification]');
    if (slot) slot.replaceChildren(statusNode(item));
  }
}
function goToRow(id,type) {
  if (typeof window.showTab === 'function') window.showTab(type==='plan'?'plans':'phones');
  const row = document.getElementById('r-'+id);
  if (row) { row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.add('hl'); setTimeout(()=>row.classList.remove('hl'),1800); }
}
function saveCompare() {
  try {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(selected));
    localStorage.setItem(COMPARE_PREFS_KEY,JSON.stringify(comparePrefs));
  } catch {}
}
const compareTray=element('aside',null,'fb-compare-tray');
compareTray.id='fb-compare-tray';
compareTray.setAttribute('aria-label','Your comparison selections');
compareTray.hidden=true;
document.body.append(compareTray);
function compareName(type,p){
  return type==='plan' ? p.carrier+' — '+p.plan : p.phone+' — '+p.carrier;
}
function selectedCompare(type,id){
  return selected.some(item=>item.type===type&&item.id===id);
}
function syncCompareButtons(){
  for(const node of document.querySelectorAll('button[data-compare-type][data-compare-id]')){
    const active=selectedCompare(node.dataset.compareType,node.dataset.compareId);
    node.textContent=active?'✓ Added':'＋ Add to compare';
    node.setAttribute('aria-pressed',String(active));
    node.title=active?'Remove this offer from your comparison':'Add this offer to your comparison without leaving this page';
  }
}
function renderCompareTray(){
  const viewingCompare=document.getElementById('p-compare')?.hidden===false;
  const visible=selected.length>0&&!viewingCompare;
  compareTray.hidden=!visible;
  document.body.classList.toggle('fb-has-compare-tray',visible);
  compareTray.replaceChildren();
  if(!visible)return;
  const info=element('div',null,'fb-tray-info');
  info.append(element('strong',selected.length+' of '+MAX_COMPARE+' chosen','fb-tray-title'));
  const names=selected.map(item=>{
    const offer=(item.type==='phone'?catalog.phones:catalog.plans).find(p=>p.id===item.id);
    return offer?offer.carrier:'Offer';
  }).join(' · ');
  info.append(element('span',names+(selected.length===1?' · Choose one more to compare':''),'fb-tray-names'));
  if(compareNotice)info.append(element('span',compareNotice,'fb-compare-notice'));
  const actions=element('div',null,'fb-tray-actions');
  actions.append(button(selected.length===1?'Add another / Compare': 'Compare '+selected.length+' offers',()=>{
    compareNotice='';
    window.showTab?.('compare');
    renderCompareTray();
    document.getElementById('p-compare')?.scrollIntoView({block:'start',behavior:'smooth'});
    document.getElementById('fb-compare-search')?.focus({preventScroll:true});
  },'btn fb-tray-open'));
  actions.append(button('Clear',()=>{
    selected=[];compareNotice='';compareQuery='';compareExpanded=false;saveCompare();renderCompare();
  },'btn ghost fb-tray-clear'));
  compareTray.append(info,actions);
}
function removeFromCompare(type,id){
  selected=selected.filter(item=>!(item.type===type&&item.id===id));
  compareNotice='';saveCompare();renderCompare();
}
function addToCompare(type,id) {
  const offer=(type==='phone'?catalog.phones:catalog.plans).find(p=>p.id===id);
  if(!offer)return;
  if(selectedCompare(type,id)){removeFromCompare(type,id);return;}
  if(type==='phone'&&pastEnd(offer.ends,localDay())){
    window.alert('This device promotion has passed its published end date and cannot be compared as a current offer.');
    return;
  }
  if(type==='phone'&&offer.listingHold){
    window.alert('This retailer-specific phone headline is under evidence review. Price comparisons remain paused.');
    return;
  }
  if(type==='phone'&&offer.availability==='out_of_stock'){
    window.alert('This phone was observed out of stock. Cost comparisons are paused until the carrier confirms inventory.');
    return;
  }
  if(officialHeadlineUnderReview(offer)){
    window.alert('This offer has conflicting official price evidence and is temporarily excluded from cost comparisons. Check Price watch.');
    return;
  }
  if(selected.length&&selected[0].type!==type){
    compareNotice='You are comparing '+(selected[0].type==='plan'?'plans':'phones')+
      '. Clear the selection first to compare '+(type==='plan'?'plans':'phones')+'.';
    renderCompare();return;
  }
  if(selected.length>=MAX_COMPARE){
    compareNotice='Three offers already selected. Remove one before adding another.';
    renderCompare();return;
  }
  if(!comparePrefs.fromFinder){
    const lines=Number(document.querySelector('#lines')?.value);
    if(Number.isInteger(lines)&&lines>=1&&lines<=5)comparePrefs.lines=lines;
  }
  const next=normalizeCompare([...selected,{type,id}],catalog,localDay());
  if(next.length!==selected.length+1){
    compareNotice='This offer cannot be compared at its current evidence or availability status.';
    renderCompare();return;
  }
  if(compareBrowseType!==type){
    compareQuery='';
    compareExpanded=false;
  }
  selected=next;
  compareBrowseType=type;
  compareNotice='';
  saveCompare();
  renderCompare();
  // Stay in the catalog: the visible selection tray takes shoppers to results
  // only when they choose to compare, rather than stranding them at one column.
}
window.fiveBarsCompare = addToCompare;
window.addEventListener('fivebars:render',()=>{
  decorateCards();syncCompareButtons();renderCompareTray();
});
// A browser tab can stay open past the Eastern day a promotion ends.
// Re-run only comparisons that the shopper already requested, using their
// unchanged filters; do not invent fresh carrier prices or checkout evidence.
window.addEventListener('fivebars:calendar-day-change',()=>{
  if(!catalog.plans.length&&!catalog.phones.length)return;
  renderCompare();
  const root=document.querySelector('#fb-finder-results');
  if(root?.querySelector('h3')){
    finderRoot.querySelector('#fb-finder-form')?.dispatchEvent(
      new Event('submit',{bubbles:true,cancelable:true}));
  }
});

function renderFinder() {
  finderRoot.innerHTML = `
    <form id="fb-finder-form" class="fb-form">
      <p class="fb-subtle">Choose what matters most. Your answers stay on this device.</p>
      <details class="fb-finder-help"><summary>Need help choosing a network?</summary><p>Compare coverage with the <a href="https://broadbandmap.fcc.gov/" target="_blank" rel="noopener noreferrer">FCC mobile coverage map</a>. Outdoor coverage predictions do not guarantee indoor reception. Confirm phone IMEI/eSIM compatibility with the carrier.</p></details>
      <div class="fb-fields">
        <label for="fb-net">Network preference
          <select id="fb-net" name="net"><option value="any">Help me compare all</option><option value="att">AT&amp;T</option><option value="vzw">Verizon</option><option value="tmo">T-Mobile</option></select>
        </label>
        <label for="fb-provider">Preferred provider
          <select id="fb-provider" name="provider"><option value="any">Any provider</option></select>
        </label>
        <label for="fb-lines">How many lines?
          <select id="fb-lines" name="lines"><option value="1">1 line</option><option value="2">2 lines</option><option value="3">3 lines</option><option value="4">4 lines</option><option value="5">5 lines</option></select>
        </label>
        <label for="fb-data-preference">How much data do you want?
          <select id="fb-data-preference" name="dataPreference">
            <option value="unlimited" selected>Unlimited plans only</option>
            <option value="any">All plans, including limited data</option>
            <option value="limited">Limited-data plans only</option>
          </select>
        </label>
        <label for="fb-budget">Monthly service budget (all lines)
          <input id="fb-budget" name="budget" type="number" min="0" max="2000" step="5" placeholder="No maximum"/>
        </label>
        <label for="fb-device">Phone preference
          <select id="fb-device" name="device"><option value="either">Show plans and phone deals</option><option value="byop">Keep my current phone</option><option value="phone">I need a new phone</option></select>
        </label>
      </div>
      <div class="fb-checks">
        <label>Can you transfer an eligible phone number?
          <select name="portStatus" id="fb-port-status"><option value="unknown">Not sure / unconfirmed</option><option value="yes">Yes, I confirm I can transfer</option><option value="no">No, I cannot transfer</option></select>
        </label>
        <label><input name="newCustomer" type="checkbox"/> I qualify for this carrier’s new-customer or eligible new-line promotion</label>
        <label><input name="discountQualified" id="fb-discount-qualified" type="checkbox"/> I meet the carrier’s AutoPay, Auto-Refill and/or eBilling conditions</label>
        <label><input name="hotspot" type="checkbox"/> I need hotspot data</label>
        <label><input name="priority" type="checkbox"/> I want priority network data</label>
      </div>
      <button type="submit" class="btn" disabled aria-busy="true">Loading deals...</button>
    </form>
    <div id="fb-finder-results" aria-live="polite" aria-atomic="false"></div>`;
  // Mobile-first progressive form. Keep every original input and its name intact.
  // Desktop remains a single form; no price or eligibility logic is duplicated.
  const finderForm=finderRoot.querySelector('#fb-finder-form');
  const fields=[...finderForm.querySelector('.fb-fields').children];
  const checks=[...finderForm.querySelector('.fb-checks').children];
  const steps=[
    {title:'Your service',description:'Network, lines and data allowance',items:fields.slice(0,4)},
    {title:'Your budget and phone',description:'Set a budget and choose whether to keep your phone',items:fields.slice(4)},
    {title:'Deal eligibility',description:'Confirm only conditions you know you meet',items:checks}
  ];
  const wizard=document.createElement('div');
  wizard.className='fb-wizard';
  wizard.innerHTML='<p class="fb-wizard-progress" aria-live="polite"></p><div class="fb-wizard-steps"></div><div class="fb-wizard-nav"><button type="button" class="btn ghost fb-wizard-back">Back</button><button type="button" class="btn fb-wizard-next">Continue</button></div>';
  const stepRoot=wizard.querySelector('.fb-wizard-steps');
  for(const [index,step] of steps.entries()){
    const panel=document.createElement('section');
    panel.className='fb-wizard-step';
    panel.dataset.step=String(index);
    panel.innerHTML='<h3></h3><p class="fb-subtle"></p>';
    panel.querySelector('h3').textContent=step.title;
    panel.querySelector('p').textContent=step.description;
    for(const item of step.items)panel.append(item);
    stepRoot.append(panel);
  }
  finderForm.querySelector('.fb-fields').remove();
  finderForm.querySelector('.fb-checks').remove();
  finderForm.insertBefore(wizard,finderForm.querySelector('button[type="submit"]'));
  let currentStep=0;
  const mobileWizard=window.matchMedia('(max-width:620px)');
  function showWizardStep(){
    const active=mobileWizard.matches;
    wizard.classList.toggle('fb-wizard-mobile',active);
    for(const panel of stepRoot.children)panel.hidden=active && Number(panel.dataset.step)!==currentStep;
    wizard.querySelector('.fb-wizard-progress').textContent=active?'Step '+(currentStep+1)+' of '+steps.length:'';
    wizard.querySelector('.fb-wizard-back').hidden=!active||currentStep===0;
    wizard.querySelector('.fb-wizard-next').hidden=!active||currentStep===steps.length-1;
    finderForm.querySelector('button[type="submit"]').hidden=active&&currentStep!==steps.length-1;
  }
  wizard.querySelector('.fb-wizard-back').addEventListener('click',()=>{
    currentStep=Math.max(0,currentStep-1);showWizardStep();
    wizard.scrollIntoView({block:'start',behavior:'smooth'});
  });
  wizard.querySelector('.fb-wizard-next').addEventListener('click',()=>{
    currentStep=Math.min(steps.length-1,currentStep+1);showWizardStep();
    wizard.scrollIntoView({block:'start',behavior:'smooth'});
  });
  mobileWizard.addEventListener('change',showWizardStep);
  showWizardStep();
  finderRoot.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    const prefs = {
      network:data.get('net'),provider:data.get('provider'),lines:Number(data.get('lines')),budget:data.get('budget'),
      dataPreference:data.get('dataPreference')||'unlimited',
      cannotPort:data.get('portStatus')==='no',canPort:data.get('portStatus')==='yes',
      newCustomer:data.has('newCustomer'),discountQualified:data.has('discountQualified'),
      priority:data.has('priority'),hotspot:data.has('hotspot'),
    };
    comparePrefs={lines:prefs.lines,cannotPort:prefs.cannotPort,canPort:prefs.canPort,
      newCustomer:prefs.newCustomer,discountQualified:prefs.discountQualified,fromFinder:true};
    saveCompare();
    renderCompare();
    const recommendationCatalog={
      ...catalog,
      plans:catalog.plans.filter(plan=>!officialHeadlineUnderReview(plan)),
      phones:catalog.phones.filter(phone=>!officialHeadlineUnderReview(phone))
    };
    const suppressedPhones=catalog.phones.length-recommendationCatalog.phones.length;
    const suppressedPlans=catalog.plans.length-recommendationCatalog.plans.length;
    const ranked = rankMatches(recommendationCatalog,prefs,localDay());
    const root = document.querySelector('#fb-finder-results');
    root.replaceChildren();
    root.append(element('h3','Matching options'));
    root.append(note('Matches are ranked by estimated cost. These are not checkout quotes; confirm eligibility and final carrier pricing.'));
    // Match counts reflect actual offer records, not a hard-coded five-item
    // list. The whole catalog remains explicitly accessible even if network,
    // budget or data filters result in very few matching offers.
    const browse=element('div',null,'fb-finder-browse');
    const selectedData=prefs.dataPreference==='unlimited'?'unlimited':
      prefs.dataPreference==='limited'?'limited-data':'all-data';
    const browseCount=element('p',
      'Showing all '+ranked.planMatches+' matching '+selectedData+
      ' plans from '+catalog.plans.length+
      ' catalog listings. Other plan types, budgets, networks or line counts can be explored below.',
      'fb-finder-browse-summary');
    if(data.get('device')!=='phone')browse.append(browseCount);
    const browseLinks=element('div',null,'fb-finder-browse-actions');
    const dataControls=element('div',null,'fb-finder-data-controls');
    dataControls.setAttribute('role','group');
    dataControls.setAttribute('aria-label','Choose the type of plans to show');
    for(const [value,label] of [
      ['unlimited','Unlimited data only'],
      ['any','All data allowances'],
      ['limited','Limited-data only']
    ]){
      const option=button(label,()=>{
        const select=f.querySelector('#fb-data-preference');
        if(!select)return;
        select.value=value;
        f.requestSubmit();
      },'fb-finder-data-toggle');
      option.setAttribute('aria-pressed',String(prefs.dataPreference===value));
      dataControls.append(option);
    }
    browse.append(dataControls);
    const unlimitedTotal=catalog.plans.filter(plan=>plan.unl===true).length;
    browseLinks.append(button('Browse all '+unlimitedTotal+' unlimited plans',()=>{
      window.fiveBarsBrowsePlans?.('unlimited');
    },'btn fb-browse-unlimited'));
    browseLinks.append(button('Browse full '+catalog.plans.length+'-plan catalog',()=>{
      window.fiveBarsBrowsePlans?.('all');
    },'btn ghost fb-browse-all'));
    browse.append(browseLinks);
    browse.append(element('p','Browsing the full catalog resets hidden plan filters and uses a one-line view; changing the catalog view does not verify carrier prices.','fb-subtle'));
    root.append(browse);
    const sourceHealth=scanStatus?.summary;
    if(sourceHealth?.sourceBlackout===true ||
       (Number.isInteger(sourceHealth?.sourcesChecked) && sourceHealth.sourcesChecked>0 &&
        sourceHealth.sourcesReachable===0)){
      const warning=element('p',
        'PUBLIC-SOURCE MONITORING UNAVAILABLE: No monitored source responded during the last scan. Listed prices and eligibility remain unconfirmed. Known published promotion deadlines are still enforced; check the current carrier checkout before buying.',
        'fb-result-warning');
      warning.setAttribute('role','status');
      root.append(warning);
    }
    const caveats=[
      'Estimated costs include recorded fixed carrier fees and one-time activation charges where known. Unknown taxes and fees are not estimated.',
      ...(suppressedPhones || suppressedPlans ? [suppressedPlans+' plan(s) and '+suppressedPhones+' phone offer(s) excluded due to conflicting official price evidence. See Price watch.'] : []),
      ...ranked.messages,
      ranked.lines>1 ?
        'Known family rates rank before extrapolated multi-line estimates; first-year cost determines order within each group.' :
        'Plans are ranked by estimated first-year service cost.'
    ];
    const details=element('details',null,'fb-finder-caveats');
    const summary=element('summary','Why some deals are excluded · Pricing details');
    details.append(summary);
    for(const msg of caveats)details.append(note(msg));
    root.append(details);
    const showPlans = data.get('device')!=='phone';
    const showPhones = data.get('device')!=='byop';
    if(showPlans) {
      root.append(element('h4','Plan options ('+ranked.planMatches+' match the selected filters)'));
      if(ranked.plans.length){
        root.append(note('All '+ranked.plans.length+
          ' matching plans are listed below, ranked by estimated first-year cost. Use Unlimited data only or All data allowances above to change the selection. These are catalog estimates, not checkout quotes.'));
      }
      if(!ranked.plans.length) root.append(note(
        prefs.dataPreference==='unlimited'?
          'No unlimited plans match those budget, provider, network and line requirements. Increase the budget, change a filter, or browse every unlimited plan above.':
          'No matching plans. Try a larger budget, choose another data allowance or browse the catalog above.'));
      for(const [i,item] of ranked.plans.entries()) {
        const p=item.offer;const c=item.cost;
        const card = element('article',null,'fb-result');
        const heading=element('div',null,'fb-result-heading');
        const mark=providerIcon(p);
        heading.append(mark);
        heading.append(element('strong',(i+1)+'. '+p.carrier+' — '+p.plan));
        card.append(heading);
        const price=element('p',null,'fb-result-price');
        price.append(element('strong',usd(c.monthTotal)+(c.annualPrepaid?'/mo equivalent':'/mo estimated')));
        price.append(element('span',c.annualPrepaid?
          'Pay '+usd(c.upfrontDue)+' upfront for 12 months · '+usd(c.year)+' estimated first year':
          usd(c.year)+' estimated first year · '+usd(c.upfrontDue)+' estimated first payment'));
        card.append(price);
        // Trust evidence must be visible without opening the details panel.
        card.append(statusNode(p));
        if(c.annualPrepaid)card.append(element('p','Annual prepaid — not monthly billing','fb-result-warning'));
        const info=element('details',null,'fb-result-details');
        info.append(element('summary','Eligibility, evidence and full cost details'));
        if (c.annualPrepaid) info.append(note('This is a prepaid ANNUAL plan, not a monthly subscription. Pay the full '+usd(c.upfrontDue)+' before service starts.'));
        if (c.firstMonthAdjusted) info.append(note('Estimated first payment '+usd(c.upfrontDue)+'; subsequent base service plus known recurring fees '+usd(c.regularMonthTotal)+'/month. Confirm all terms.'));
        if (c.conditionalDiscountUnconfirmed) info.append(note('Payment-method discount NOT assumed. Check AutoPay, eBilling or Auto-Refill eligibility.'));
        if (c.knownMonthlyFeeTotal||c.knownActivationFeeTotal) info.append(note('Includes '+usd(c.knownMonthlyFeeTotal)+'/mo published provider fees and '+usd(c.knownActivationFeeTotal)+' activation fee where documented; excludes taxes and unrecorded fees.'));
        if (c.promoFamilyUnconfirmed) info.append(note('Intro promo was NOT assumed for multiple lines; eligibility is unconfirmed.'));
        if (c.estimatedFamilyPrice) info.append(note('Multi-line price was not published in our catalog; this is a single-line extrapolation.'));
        card.append(info);
        const actions=element('div',null,'fb-card-actions');
        const compareButton=button('＋ Add to compare',()=>addToCompare('plan',p.id),'btn ghost fb-compare-btn');
        compareButton.dataset.compareType='plan';
        compareButton.dataset.compareId=p.id;
        actions.append(compareButton);
        actions.append(linkTo(p.url,'Carrier details'));
        info.append(button('See in plan list',()=>goToRow(p.id,'plan')));
        info.append(button('Watch plan',()=>window.fiveBarsWatch?.('plan',p.id)));
        info.append(button('Calculate switch savings',()=>window.fiveBarsSwitch?.('plan',p.id)));
        card.append(actions);
        root.append(card);
      }
    }
    if(showPhones) {
      root.append(element('h4',ranked.lines>1 ? 'Phone leads ('+ranked.phoneMatches+' options; household cost unconfirmed)' : 'Phone offers ('+ranked.phoneMatches+' match the selected filters)'));
      if(!ranked.phones.length) root.append(note('No matching offers. Consider keeping your phone or changing the network filter.'));
      const phoneCards=[];
      const initiallyVisiblePhones=5;
      let phonesExpanded=false;
      for(const [i,item] of ranked.phones.entries()) {
        const p=item.offer,c=item.cost;
        const card=element('article',null,'fb-result fb-phone-result');
        if(i>=initiallyVisiblePhones)card.hidden=true;
        const heading=element('div',null,'fb-result-heading');
        heading.append(providerIcon(p));
        heading.append(element('strong',p.phone+' — '+p.carrier));
        card.append(heading);
        card.append(element('p',c.financingUncertain?
          'Financed or trade-in promotion: no reliable upfront, device payoff or first-year quote without the installment agreement.':
          'Estimated upfront '+usd(c.due)+'; first year '+usd(c.year)+' (one device).'));
        card.append(statusNode(p));
        if(item.uncertain) card.append(note('Financing, per-device or incomplete service terms prevent a complete household quote.'));
        if(p.rebate||p.credit) card.append(note('Conditional rewards and bill credits are NOT subtracted from these upfront or first-year estimates.'));
        if(c.conditionalDiscountUnconfirmed) card.append(note('Required service is '+usd(c.planPrice)+'/mo without AutoPay; the advertised '+usd(p.planPrice)+'/mo discount is not assumed.'));
        if(c.firstMonthPlanPrice!==null && c.firstMonthPlanPrice!==c.planPrice) card.append(note('First service bill '+usd(c.firstMonthPlanPrice)+'; continuing service '+usd(c.planPrice)+'/mo subject to eligibility.'));
        const actions=element('div',null,'fb-card-actions');
        const compareButton=button('＋ Add to compare',()=>addToCompare('phone',p.id),'btn ghost fb-compare-btn');
        compareButton.dataset.compareType='phone';
        compareButton.dataset.compareId=p.id;
        actions.append(compareButton);
        actions.append(button('See offer',()=>goToRow(p.id,'phone')));
        actions.append(button('Watch phone',()=>window.fiveBarsWatch?.('phone',p.id)));
        if(!p.postpaid)actions.append(button('Calculate switch savings',()=>window.fiveBarsSwitch?.('phone',p.id)));
        else card.append(note('Savings comparison unavailable until full financing and bill-credit terms are documented.'));
        actions.append(linkTo(p.url,'Carrier details'));
        card.append(actions);
        root.append(card);
        phoneCards.push(card);
      }
      if(phoneCards.length>initiallyVisiblePhones){
        const morePhones=button('Show all '+phoneCards.length+' phone offers',()=>{
          phonesExpanded=!phonesExpanded;
          for(const [index,card] of phoneCards.entries())card.hidden=!phonesExpanded&&index>=initiallyVisiblePhones;
          morePhones.textContent=phonesExpanded?'Show fewer phone offers':'Show all '+phoneCards.length+' phone offers';
          morePhones.setAttribute('aria-expanded',String(phonesExpanded));
        },'btn ghost fb-more-plans fb-more-phones');
        morePhones.setAttribute('aria-expanded','false');
        root.append(morePhones);
      }
    }
    syncCompareButtons();
  });
}
function fieldValue(type,offer,key) {
  if(type==='phone' && pastEnd(offer.ends,localDay()) &&
     ['monthly','year','data','hotspot','eligibility'].includes(key))
    return 'Promotion ended — no current cost quote';
  if(type==='plan' && offer.maxLines && comparePrefs.lines>offer.maxLines)
    return 'Not offered for '+comparePrefs.lines+' lines';
  if(type==='plan' && officialHeadlineUnderReview(offer) &&
      ['monthly','year','billing'].includes(key))return 'Price under review';
  if(type==='phone' && offer.listingHold &&
      ['monthly','year','data','hotspot','eligibility'].includes(key))return 'Retail promotion under review; cash estimates withheld';
  if(type==='phone' && offer.availability==='out_of_stock' &&
      ['monthly','year','data','hotspot','eligibility'].includes(key))return 'Out of stock — no current cost quote';
  if(type==='phone' && officialHeadlineUnderReview(offer) &&
      ['monthly','year','data','hotspot'].includes(key)) {
    return 'Price under review';
  }
  if(type==='plan') {
    const c=planCost(offer,comparePrefs.lines,{cannotPort:comparePrefs.cannotPort,
      canPort:comparePrefs.canPort,newCustomer:comparePrefs.newCustomer,
      discountQualified:comparePrefs.discountQualified});
    switch(key) {
      case 'network':return offer.net==='multi'?'Choice of networks':offer.net==='att'?'AT&T':offer.net==='vzw'?'Verizon':'T-Mobile';
      case 'monthly':return usd(c?.monthTotal)+' total'+(c?.annualPrepaid?' /mo equivalent (annual upfront)':c?.estimatedFamilyPrice?' (estimate)':'');
      case 'year':return usd(c?.year)+' total'+(c?.estimatedFamilyPrice?' (estimate)':'');
      case 'billing':return c?.annualPrepaid?usd(c.upfrontDue)+' upfront for 12 months':usd(c?.upfrontDue)+' estimated first month';
      case 'data':return offer.unl?'Unlimited (check limits)':(offer.data||'Not specified');
      case 'hotspot':return offer.hot||'Not specified';
      case 'priority':return offer.pri===true?'Listed priority':offer.pri===false?'Lower priority or variable':'Not specified';
      case 'taxes':return offer.tax?'Included':'Check carrier';
      case 'eligibility':return c?.promoFamilyUnconfirmed?'Multi-line intro not confirmed; excluded' :
        c?.promoSuppressedForNotNew?'New-customer promo excluded until eligibility confirmed' :
        c?.promoSuppressedForNoPort?'Port-in promo excluded as requested' :
        c?.promoSuppressedForUnconfirmedPort?'Port-in promotion needs confirmed eligibility' :
        offer.promo?.req==='port'?'Intro rate requires port-in':'Check current promo terms';
      default:return '—';
    }
  }
  const c=phoneCost(offer,{discountQualified:comparePrefs.discountQualified,newCustomer:comparePrefs.newCustomer});
  if(offer.postpaid&&['monthly','year','data','hotspot'].includes(key))
    return 'Financing / trade-in terms not documented';
  switch(key) {
    case 'network':return offer.net==='multi'?'Network varies':offer.net==='att'?'AT&T':offer.net==='vzw'?'Verizon':'T-Mobile';
    case 'monthly':return offer.bundleRenewalUnverified===true?usd(offer.planPrice)+'/mo equivalent INCLUDED in initial 12-month bundle; renewal UNKNOWN':
      c?.planPrice===null?'Variable':usd(c?.planPrice)+'/mo'+(c?.conditionalDiscountUnconfirmed?' (AutoPay discount not assumed)':'');
    case 'year':return usd(c?.year);
    case 'data':return usd(c?.due);
    case 'hotspot':return usd(c?.commitment);
    case 'priority':return offer.lock ? offer.lock+' months listed' : 'Unspecified; check carrier';
    case 'taxes':return offer.postpaid?'Postpaid/financing may apply':'Prepaid or bundled';
    case 'eligibility':return offer.newLineRequired===true?'Confirm qualifying NEW line; existing-line upgrade may not count':
      offer.fullRetailRequired?'Full retail payment required; financing ineligible':
      offer.port?'Number transfer required':'No transfer listed';
    default:return '—';
  }
}
function renderCompare(){
  compareRoot.replaceChildren();
  // Old browser storage never bypasses present-day holds or conflicting prices.
  const valid=normalizeCompare(selected,catalog,localDay()).filter(item=>{
    const offer=(item.type==='phone'?catalog.phones:catalog.plans).find(x=>x.id===item.id);
    return offer&&!officialHeadlineUnderReview(offer);
  });
  const dropped=valid.length!==selected.length;
  if(dropped){selected=valid;saveCompare();}
  if(selected.length)compareBrowseType=selected[0].type;
  syncCompareButtons();
  renderCompareTray();

  const workspace=element('div',null,'fb-compare-workspace');
  if(selected.length>=2)workspace.classList.add('fb-compare-workspace-ready');
  else workspace.append(element('p','Choose two or three offers to see them side by side. Add or remove items here, or browse the plan and phone lists.','fb-compare-intro'));
  if(dropped)workspace.append(note('Expired, held, out-of-stock, conflicting-price or removed saved comparisons were cleared. Confirm current carrier offers before making a decision.'));
  if(compareNotice)workspace.append(element('p',compareNotice,'fb-compare-notice'));
  const mode=selected[0]?.type||compareBrowseType;
  const modeRow=element('div',null,'fb-compare-modes');
  for(const type of ['plan','phone']){
    const toggle=button(type==='plan'?'Compare plans':'Compare phone deals',()=>{
      if(selected.length&&selected[0].type!==type){
        compareNotice='Clear your '+(selected[0].type==='plan'?'plan':'phone')+
          ' selection to compare the other offer type.';
      }else{
        compareBrowseType=type;compareQuery='';compareExpanded=false;compareNotice='';
      }
      renderCompare();
    },'fb-compare-mode');
    toggle.setAttribute('aria-pressed',String(type===mode));
    modeRow.append(toggle);
  }
  workspace.append(modeRow);
  const line=element('div',null,'fb-compare-progress');
  line.append(element('strong',selected.length+' of '+MAX_COMPARE+' selected'));
  if(selected.length){
    line.append(button('Clear all',()=>{selected=[];compareNotice='';compareQuery='';compareExpanded=false;saveCompare();renderCompare();},'fb-compare-clear'));
  }
  workspace.append(line);
  const chips=element('div',null,'fb-compare-chips');
  for(let i=0;i<MAX_COMPARE;i++){
    const slot=element('div',null,'fb-compare-chip');
    const item=selected[i];
    if(item){
      const p=(item.type==='phone'?catalog.phones:catalog.plans).find(x=>x.id===item.id);
      slot.append(element('span',p?compareName(item.type,p):'Selected offer'));
      const remove=button('×',()=>removeFromCompare(item.type,item.id),'fb-compare-chip-remove');
      remove.setAttribute('aria-label','Remove '+(p?compareName(item.type,p):'selected offer')+' from comparison');
      slot.append(remove);
    }else slot.append(element('span','＋ Choose '+(i+1),'fb-compare-chip-empty'));
    chips.append(slot);
  }
  if(selected.length>=2){
    const edit=element('details',null,'fb-compare-edit');
    edit.append(element('summary','Edit selected offers ('+selected.length+')'));
    edit.append(chips);
    workspace.append(edit);
  }else workspace.append(chips);
  compareRoot.append(workspace);

  if(selected.length<MAX_COMPARE){
    const picker=element('section',null,'fb-compare-picker');
    picker.append(element('h3',selected.length?'Add another '+(mode==='plan'?'plan':'phone deal'):
      'Start with a '+(mode==='plan'?'plan':'phone deal')));
    const searchLabel=element('label',null,'fb-compare-search-label');
    searchLabel.append(element('span','Search by carrier, '+(mode==='plan'?'plan':'phone')+' name'));
    const search=element('input');
    search.type='search';search.id='fb-compare-search';search.autocomplete='off';
    search.placeholder=mode==='plan'?'e.g. Tello, US Mobile or Mint':'e.g. Galaxy, Pixel or iPhone';
    search.value=compareQuery;
    searchLabel.append(search);
    picker.append(searchLabel);
    const options=element('div',null,'fb-compare-picks');
    picker.append(options);
    const more=button('Show more choices',()=>{compareExpanded=true;drawChoices();},'btn ghost fb-compare-more');
    picker.append(more);
    function drawChoices(){
      const query=compareQuery.trim().toLowerCase();
      const matches=(mode==='plan'?catalog.plans:catalog.phones)
        .filter(p=>!selectedCompare(mode,p.id)&&!officialHeadlineUnderReview(p)&&
          (mode==='plan'||(!p.listingHold&&p.availability!=='out_of_stock'&&!pastEnd(p.ends,localDay()))))
        .filter(p=>!query||compareName(mode,p).toLowerCase().includes(query))
        .sort((x,y)=>x.carrier.localeCompare(y.carrier)||
          (x.plan||x.phone||'').localeCompare(y.plan||y.phone||''));
      const visible=matches.slice(0,compareExpanded?matches.length:6);
      options.replaceChildren();
      for(const offer of visible){
        const item=element('article',null,'fb-compare-pick');
        const copy=element('div',null,'fb-compare-pick-copy');
        copy.append(element('strong',compareName(mode,offer)));
        const description=mode==='plan'?
          'Published regular rate: '+usd(offer.price)+'/mo per line'+
          (offer.billingUpfront?' · '+usd(offer.billingUpfront)+' annual prepay':'') :
          offer.postpaid?'Financing terms require carrier confirmation':
          'Advertised device: '+usd(offer.price)+' · required plan: '+
            (Number.isFinite(offer.planPrice)?usd(offer.planPrice)+'/mo':'check carrier');
        copy.append(element('span',description));
        const add=button('Add',()=>addToCompare(mode,offer.id),'btn fb-compare-pick-add');
        add.setAttribute('aria-label','Add '+compareName(mode,offer)+' to comparison');
        item.append(copy,add);
        options.append(item);
      }
      if(!matches.length)options.append(note('No eligible offers match that search. Try a carrier or device name, or clear your search.'));
      more.hidden=compareExpanded||matches.length<=visible.length;
      more.textContent='Show all '+matches.length+' available choices';
    }
    search.addEventListener('input',()=>{compareQuery=search.value;compareExpanded=false;drawChoices();});
    drawChoices();
    compareRoot.append(picker);
  }

  if(selected.length<2){
    compareRoot.append(element('p',selected.length===1?
      'One chosen. Add at least one more offer above to see a side-by-side comparison.':
      'Select Compare on any plan or phone offer to start, or choose an offer above.','fb-compare-empty'));
    return;
  }
  const type=selected[0].type;
  const toolbar=element('div',null,'fb-card-actions fb-compare-toolbar');
  if(type==='plan'){
    const label=element('label','Compare household size: ','fb-compare-household');
    const select=element('select');
    select.setAttribute('aria-label','Compare household lines');
    for(let n=1;n<=5;n++){
      const option=element('option',n+' '+(n===1?'line':'lines'));
      option.value=String(n);select.append(option);
    }
    select.value=String(comparePrefs.lines);
    select.addEventListener('change',()=>{
      comparePrefs.lines=Number(select.value);
      comparePrefs.fromFinder=true;saveCompare();renderCompare();
    });
    label.append(select);toolbar.append(label);
  }
  compareRoot.append(toolbar);
  const records=selected.map(item=>
    (type==='plan'?catalog.plans:catalog.phones).find(p=>p.id===item.id)).filter(Boolean);
  const eligibility={
    cannotPort:comparePrefs.cannotPort,canPort:comparePrefs.canPort,
    newCustomer:comparePrefs.newCustomer,discountQualified:comparePrefs.discountQualified
  };
  const overview=comparisonPriceOverview(type,records,comparePrefs.lines,eligibility,localDay());
  if(overview){
    const lowest=overview.cheapestIndices.map(index=>compareName(type,records[index])).join(' and ');
    const insight=element('section',null,'fb-compare-insight');
    insight.setAttribute('aria-label','Price-only comparison insight');
    insight.append(element('span','LOWEST LISTED 12-MONTH ESTIMATE','fb-compare-insight-eyebrow'));
    insight.append(element('strong',lowest+' · '+usd(overview.lowest),'fb-compare-insight-headline'));
    insight.append(element('p',
      (overview.range>0?'Difference between the highest and lowest estimates: '+usd(overview.range)+'. ':'These selected estimates are tied. ')+
      'Lowest price does not mean best fit. Data allowances, coverage and conditions can differ; these are not checkout-verified totals.','fb-compare-insight-copy'));
    compareRoot.append(insight);
  }else{
    compareRoot.append(note('Not every selected offer has a comparable 12-month price. Financing, multi-line terms or eligibility may require a carrier quote; no cheapest option is claimed.'));
  }
  compareRoot.append(element('h3','Compare at a glance'));
  compareRoot.append(element('p','Estimated catalog totals for your selected offers. Inspect data, network and upfront charges before choosing. Taxes and conditions may change actual checkout.','fb-compare-shared-note'));
  const highlights=element('div',null,'fb-compare-highlights');
  for(const [index,p] of records.entries()){
    const card=element('article',null,'fb-compare-highlight');
    if(overview?.cheapestIndices.includes(index))card.classList.add('fb-compare-lowest');
    const header=element('div',null,'fb-compare-card-header');
    header.append(element('h4',compareName(type,p)));
    const remove=button('Remove',()=>removeFromCompare(type,p.id),'fb-compare-card-remove');
    remove.setAttribute('aria-label','Remove '+compareName(type,p)+' from comparison');
    header.append(remove);
    card.append(header);
    const c=type==='plan'?planCost(p,comparePrefs.lines,{...eligibility,today:localDay()}):
      phoneCost(p,{discountQualified:comparePrefs.discountQualified,newCustomer:comparePrefs.newCustomer});
    const highlight=element('div',null,'fb-compare-primary-price');
    highlight.append(element('span','ESTIMATED FIRST-YEAR TOTAL','fb-compare-price-label'));
    highlight.append(element('strong',c&&Number.isFinite(c.year)?usd(c.year):'Ask carrier','fb-compare-price-value'));
    if(overview?.cheapestIndices.includes(index))
      highlight.append(element('span',overview.tied?'Tied lowest listed estimate':'Lowest listed estimate · price only','fb-compare-lowest-label'));
    card.append(highlight);
    const facts=element('div',null,'fb-compare-quickfacts');
    if(type==='plan'){
      const data=fieldValue(type,p,'data');
      const network=fieldValue(type,p,'network');
      const hot=p.hot?(p.hot.length>72?'Details in full comparison':p.hot):'Not specified';
      for(const [label,value] of [['Data',data],['Network',network],['Hotspot',hot]]){
        const item=element('div',null,'fb-compare-quickfact');
        item.append(element('span',label),element('strong',value));
        facts.append(item);
      }
    }else{
      for(const [label,value] of [['Network',fieldValue(type,p,'network')],
        ['Required plan',fieldValue(type,p,'monthly')]]){
        const item=element('div',null,'fb-compare-quickfact');
        item.append(element('span',label),element('strong',value));
        facts.append(item);
      }
    }
    card.append(facts);
    const metrics=type==='plan'
      ? [['monthly','Monthly rate (est.)'],['billing','Due to start (est.)']]
      : [['data','Estimated due today'],['hotspot','Minimum service commitment']];
    const dl=element('dl',null,'fb-compare-metrics');
    for(const [key,label] of metrics){
      const box=element('div');
      const value=type==='plan'&&key==='monthly'&&c?
        usd(c.monthTotal)+(c.annualPrepaid?' equivalent/mo':'/mo')+
          (c.estimatedFamilyPrice?' · family rate unconfirmed':''):
        type==='plan'&&key==='billing'&&c?
          usd(c.upfrontDue):fieldValue(type,p,key);
      box.append(element('dt',label),element('dd',value));
      dl.append(box);
    }
    card.append(dl);
    if(type==='plan'&&c&&Number.isFinite(c.year)){
      const pieces=[];
      if(c.annualPrepaid){
        pieces.push(usd(c.upfrontDue)+' is prepaid for 12 months, not monthly billing');
      }else{
        if(c.promoUsed&&Number.isInteger(p.promo?.months)){
          const months=Math.min(p.promo.months,12);
          pieces.push(usd(c.monthTotal)+'/mo for '+months+' months, then '+
            usd(c.regularMonthTotal)+'/mo');
        }else if(c.firstMonthAdjusted){
          pieces.push('First service month '+usd(c.firstMonthDue+c.knownMonthlyFeeTotal)+
            ', then '+usd(c.monthTotal)+'/mo');
        }else{
          pieces.push(usd(c.monthTotal)+'/mo for 12 months');
        }
        if(c.knownActivationFeeTotal>0)
          pieces.push('+ '+usd(c.knownActivationFeeTotal)+' known one-time activation');
      }
      if(c.knownMonthlyFeeTotal>0)
        pieces.push(usd(c.knownMonthlyFeeTotal)+'/mo published carrier fees included');
      if(c.conditionalDiscountUnconfirmed||c.promoSuppressedForUnconfirmedAutopay)
        pieces.push('Unconfirmed AutoPay discounts excluded');
      const explanation=element('p','How estimated total is built: '+pieces.join(' · ') + '.','fb-compare-breakdown');
      card.append(explanation);
    }
    const verified=verificationState(p,reviews[p.id]).status==='verified';
    if(verified)card.append(element('p','Dated checkout scenario reviewed; your own checkout may differ','fb-compare-card-status'));
    card.append(linkTo(p.url,'See official offer'));
    highlights.append(card);
  }
  compareRoot.append(highlights);
  const full=element('details',null,'fb-compare-details');
  full.append(element('summary','See the full comparison: costs, service and eligibility'));
  const labels=type==='plan'
    ? [['network','Network'],['monthly','Current rate ('+comparePrefs.lines+' lines)'],['billing','Billing / upfront amount'],['year','12-month total ('+comparePrefs.lines+' lines)'],['data','Data'],['hotspot','Hotspot'],['priority','Data priority'],['taxes','Taxes'],['eligibility','Promo requirements']]
    : [['network','Network'],['monthly','Required plan'],['year','Estimated 12-month cost'],['data','Due today (est.)'],['hotspot','Minimum commitment (est.)'],['priority','Carrier lock'],['taxes','Plan type'],['eligibility','Transfer requirement']];
  full.append(element('p','On smaller screens, scroll the table sideways to see all selected offers.','fb-subtle fb-swipe-hint'));
  const wrap=element('div',null,'fb-table-wrap');
  const table=element('table',null,'fb-table');
  const head=element('thead'),header=element('tr');
  header.append(element('th','Compare '+(type==='plan'?'plans':'phone deals')));
  records.forEach(p=>{
    const cell=element('th');
    cell.scope='col';
    cell.append(element('strong',compareName(type,p)));
    cell.append(document.createElement('br'));
    cell.append(statusNode(p));
    cell.append(document.createElement('br'));
    cell.append(button('Remove',()=>removeFromCompare(type,p.id),'fb-remove'));
    header.append(cell);
  });
  head.append(header);table.append(head);
  const body=element('tbody');
  for(const [key,label] of labels){
    const tr=element('tr');const th=element('th',label);th.scope='row';tr.append(th);
    for(const item of records)tr.append(element('td',fieldValue(type,item,key)));
    body.append(tr);
  }
  const links=element('tr');const source=element('th','Carrier website');source.scope='row';links.append(source);
  for(const p of records){const cell=element('td');cell.append(linkTo(p.url,'View published offer'));links.append(cell);}
  body.append(links);table.append(body);wrap.append(table);full.append(wrap);
  compareRoot.append(full);
  compareRoot.append(note(type==='plan'?
    'Estimates for '+comparePrefs.lines+' '+(comparePrefs.lines===1?'line':'lines')+
    '. Annual plans must be paid upfront; unconfirmed family discounts are excluded. Taxes and eligibility can change your bill.':
    'Phone offers are per handset. Unknown financing, delayed credits, taxes and rebates are not treated as guaranteed savings.'));
}
/* ---------- price evidence and observation history ---------- */
function priceSparkline(rows,kind='advertised device') {
  const values=rows.filter(r=>Number.isFinite(r.price)).map(r=>r.price);
  if (!values.length)return null;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 300 72');
  svg.setAttribute('height','72');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Official '+kind+' rate history, '+values.length+' observation days. Values are NOT verified checkout amounts.');
  svg.classList.add('fb-watch-chart');
  const lo=Math.min(...values),hi=Math.max(...values);
  const xy=values.map((v,i)=>{
    const x=values.length===1?150:8+i*284/(values.length-1);
    const y=hi===lo?36:62-(v-lo)*52/(hi-lo);
    return {x,y};
  });
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('fill','none');
  line.setAttribute('stroke','currentColor');
  line.setAttribute('stroke-width','2.5');
  line.setAttribute('stroke-linecap','round');
  line.setAttribute('stroke-linejoin','round');
  line.setAttribute('points',xy.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '));
  svg.append(line);
  for(const p of [xy[0],xy[xy.length-1]]) {
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',p.x);
    dot.setAttribute('cy',p.y);
    dot.setAttribute('r','3.2');
    dot.setAttribute('fill','currentColor');
    svg.append(dot);
  }
  return svg;
}
function reportOfferLink(id){
  // Put only curated public offer ID into our URL, never free-text in GitHub
  // query parameters, browser history or hosting logs.
  const a=element('a','Report a correction');
  a.href=reportLink(id);
  return a;
}

function appendMvnoWatch(root){
  const section=element('section',null,'fb-mvno-watch');
  const heading=element('h3','MVNO service-plan rate monitoring');
  heading.id='fb-mvno-watch-title';
  section.append(heading);
  section.append(note('Strict partial monitoring covers selected Helium, MobileX, Good2Go and H2O Wireless monthly plans. H2O annual plans, Tello and Red Pocket still need direct manual price reviews because their plan pages block automated access. The H2O homepage shows featured monthly rates only. Carrier taxes, activation and checkout terms are not verified.'));
  const checked=mvnoEvidence?.generatedAt;
  if(!checked){
    section.append(note('The first automatic MVNO price check has not published results yet. Check carrier websites before purchasing.'));
    root.append(section);
    return;
  }
  const age=Date.now()-Date.parse(checked);
  const fresh=Number.isFinite(age)&&age>=0&&age<=EVIDENCE_FRESH_MS;
  const stats=mvnoEvidence.summary||{};
  section.append(element('p',
    'MVNO official-page scan: '+new Date(checked).toLocaleString('en-US')+'. '+
    (fresh?'Scan is recent.':'CAUTION: scan results are older than 48 hours.')+
    ' '+(stats.headlineMatches||0)+' exact rate matches, '+(stats.priceMismatches||0)+
    ' price conflicts (including unresolved), '+(stats.sourceUnavailable||0)+
    ' source-unavailable items, '+(stats.needReview||0)+' review alerts.',
    'fb-watch-meta'));
  const grid=element('div',null,'fb-watch-grid');
  const entries=Object.entries(mvnoEvidence.offers||{}).sort(([a],[b])=>a.localeCompare(b));
  for(const [id,rec] of entries){
    const original=catalog.plans.find(p=>p.id===id);
    if(!original)continue;
    const card=element('article',null,'fb-watch-card fb-mvno-card');
    card.setAttribute('data-offer-id',id);
    card.append(element('h3',original.carrier+' — '+original.plan));
    card.append(statusNode(original));
    card.append(element('p','Catalog effective rate: '+usd(original.price)+'/mo'+
      (original.billingMonths===12?' · '+usd(original.billingUpfront)+' paid upfront for 12 months':'')));
    if(Number.isFinite(rec.observedPrice)){
      card.append(element('p','Official headline observation: '+usd(rec.observedPrice)+'/mo'+
        (rec.billingMonths===12&&Number.isFinite(rec.observedUpfront) ?
        ' · '+usd(rec.observedUpfront)+' annual payment':'')+'.','fb-watch-price'));
    } else card.append(note('No trustworthy rate-and-billing headline found in this scan.'));
    if(officialHeadlineUnderReview(original))
      card.append(element('p','Do not rely on the catalog cost; this official price discrepancy remains unresolved.','fb-watch-warning'));
    if(rec.note)card.append(note(rec.note));
    const history=(mvnoHistory?.offers?.[id]||[]).filter(h=>h&&Number.isFinite(h.price))
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(history.length){
      const first=history[0],last=history[history.length-1];
      card.append(note('Observed '+history.length+' day(s), '+first.date+' to '+last.date+
        '. Latest monthly equivalent: '+usd(last.price)+
        (Number.isFinite(last.upfront)?' ('+usd(last.upfront)+' upfront for one year)':'' )+'.'));
      const chart=priceSparkline(history,'plan headline');
      if(chart)card.append(chart);
    }else card.append(note('No trustworthy price observations have been saved yet.'));
    const actions=element('div',null,'fb-card-actions');
    actions.append(linkTo(rec.sourceUrl||original.url,'Official plan source'));
    actions.append(reportOfferLink(id,{phone:original.plan,url:original.url}));
    card.append(actions);
    grid.append(card);
  }
  if(grid.childElementCount)section.append(grid);
  else section.append(note('No MVNO plan evidence is available yet.'));
  section.append(element('p','A matched headline only checks a specific advertised plan price and billing period. It does NOT verify tax, autopay, device compatibility, hotspot, coverage, throttling, or eventual checkout totals. Conflicting offers are kept visible with costs suppressed until a trustworthy new official match.','fb-watch-detail'));
  root.append(section);
}


function appendReviewQueue(root){
  const section=element('section',null,'fb-review-queue');
  section.id='fb-review-queue';
  const h=element('h3','Price & terms review queue');h.id='fb-review-queue-heading';
  section.append(h);
  section.append(note('An action list for maintaining trustworthy plan listings. These flags are NOT proof that a deal is invalid. A reachable page or a matching headline never equals full checkout verification.'));
  if(!reviewQueue?.generatedAt || !Array.isArray(reviewQueue.items)){
    section.append(note('Automated review priorities have not been published yet. Refer to the official carrier pages before purchasing.'));
    root.append(section);return;
  }
  const stats=reviewQueue.summary||{};
  section.append(element('p',
    (stats.critical||0)+' critical, '+(stats.high||0)+' high, '+(stats.medium||0)+
    ' medium and '+(stats.routine||0)+' routine reviews. '+
    (stats.withoutCurrentManualReview||0)+' listings have no recent documented full-terms review.',
    'fb-watch-meta'));
  if(stats.prolongedConditionalPromos>0)
    section.append(note(stats.prolongedConditionalPromos+
      ' conditional promotion(s) could not be checked across source scans spanning 7+ days. Manual carrier research is needed; an inaccessible page is not proof that a promotion has ended.'));
  if(stats.publicationEvidence){
    const pub=stats.publicationEvidence;
    section.append(element('p',
      'Dated public-source research: '+(pub.partial||0)+' partial, '+
      (pub.unresearched||0)+' missing, '+(pub.aged||0)+' aged, '+
      (pub.conflictsOrInvalid||0)+' conflicting or invalid. '+
      (stats.retailerHolds||0)+' retailer-channel holds and '+
      (stats.stockHolds||0)+' stock holds remain separate. Public source research is not a checkout quote.',
      'fb-watch-meta'));
  }
  const blocked=Array.isArray(reviewQueue.blockedProviders)?reviewQueue.blockedProviders:[];
  if(blocked.length){
    section.append(note('Carrier offer pages not fully accessible to the automatic scanner: '+
      blocked.slice(0,9).map(x=>x.carrier+' ('+x.affected+')').join(', ')+
      (blocked.length>9?' and others':'')+
      '. This does not mean the carrier or its offer is unavailable to customers.'));
  }
  const filterLabel=element('label','Review priority: ','fb-review-filter');
  const filter=element('select');
  filter.setAttribute('aria-label','Filter review items by priority');
  for(const key of ['all','critical','high','medium','routine']){
    const opt=element('option',key==='all'?'All priorities':key.charAt(0).toUpperCase()+key.slice(1));
    opt.value=key;filter.append(opt);
  }
  filterLabel.append(filter);section.append(filterLabel);
  const list=element('div',null,'fb-review-items');
  list.setAttribute('aria-live','polite');
  section.append(list);
  const more=button('Show more reviews',()=>{showAll=true;draw();},'fb-compare-btn');
  section.append(more);
  let showAll=false;
  function draw(){
    const arr=reviewQueue.items.filter(x=>filter.value==='all'||x.priority===filter.value);
    const visible=showAll?arr:arr.slice(0,12);
    list.replaceChildren(...visible.map(item=>{
      const card=element('article',null,'fb-review-item');
      card.setAttribute('data-review-offer-id',item.id);
      const title=element('h4',item.carrier+' — '+item.offer);
      card.append(title);
      card.append(element('p',
        item.priority.toUpperCase()+' PRIORITY · '+item.kind+
        (item.manualReviewStatus==='verified'?' · Human checkout scenario reviewed':' · Full terms not fully verified')+
        (item.officialResearchState && item.officialResearchState!=='published_match' ?
         ' · Published research: '+item.officialResearchState.replaceAll('_',' ') : ''),
        'fb-subtle'));
      for(const detail of item.reasons.slice(0,3))card.append(note(detail));
      const links=element('div',null,'fb-card-actions');
      if(item.link)links.append(linkTo(item.link,'Carrier offer page'));
      links.append(reportOfferLink(item.id,{phone:item.offer,url:item.link}));
      card.append(links);
      return card;
    }));
    if(!arr.length)list.append(note('No reviews match this priority filter.'));
    more.hidden=showAll||arr.length<=12;
    more.textContent='Show all '+arr.length+' reviews';
  }
  filter.addEventListener('change',()=>{showAll=false;draw();});
  draw();
  section.append(note('Urgent reviews include official price conflicts and already-ended promotions. Blocked pages and missing independent full-terms checks are kept separate. Reviewed corrections require human confirmation; scans never rewrite advertised prices.'));
  root.append(section);
}

function appendActionAlerts(root){
  const section=element('section',null,'fb-action-alerts');
  section.id='fb-action-alerts';
  section.append(element('h3','Actionable price & deadline alerts'));
  section.append(note('Only approaching catalog promotion deadlines, observed official headline changes and unresolved official price discrepancies trigger these alerts. HTTP errors and routine missing full-terms reviews do not create notifications.'));
  if(!alertFeed?.generatedAt || !Array.isArray(alertFeed.events)){
    section.append(note('The first daily alert check has not published results yet.'));
    root.append(section);
    return;
  }
  const active=alertFeed.events.filter(a=>a&&a.active===true);
  const summary=alertFeed.summary||{};
  const stamp=Date.parse(alertFeed.generatedAt);
  section.append(element('p',
    active.length+' currently actionable alert(s) · '+(summary.critical||0)+' critical price conflicts · '+
    (summary.high||0)+' deadline or rate-change alerts. Checked '+
    (Number.isFinite(stamp)?new Date(stamp).toLocaleString('en-US'):'date unavailable')+'.',
    'fb-watch-meta'));
  if(!active.length){
    section.append(note('No qualifying price discrepancies, headline changes or near-term catalog deadlines in the latest scan. This does NOT mean every listing has been fully verified.'));
  }else{
    const list=element('div',null,'fb-action-list');
    for(const a of active.slice(0,12)){
      const card=element('article',null,'fb-action-card');
      card.setAttribute('data-alert-key',String(a.key||'').slice(0,160));
      card.append(element('h4',String(a.title||'Offer requires review')));
      card.append(element('p',String(a.severity||'review').toUpperCase()+' · '+
        (a.type==='deadline'?'Catalog deadline':a.type==='conflict'?'Official price conflict':'Observed headline change'),
        'fb-subtle'));
      if(a.description)card.append(note(a.description));
      if(a.action)card.append(note('What to check: '+a.action));
      const actions=element('div',null,'fb-card-actions');
      if(a.sourceUrl)actions.append(linkTo(a.sourceUrl,'Official carrier source'));
      actions.append(linkTo('https://github.com/gcd231983/five-bars/issues?q=is%3Aissue+%22%5BFive+Bars%5D%22','View GitHub alerts'));
      card.append(actions);
      list.append(card);
    }
    section.append(list);
  }
  if(alertFeed.events.some(e=>e?.active===false))
    section.append(note('Past events remain in the alert record for transparency; they are not sent as new daily notifications.'));
  section.append(note('GitHub sends notifications according to your repository and assigned-issue notification settings. Closing an alert issue manually will not cause the bot to reopen it for the same event.'));
  root.append(section);
}

function renderPriceWatch(){
  const root=document.querySelector('#fb-price-watch-root');
  if(!root)return;
  root.replaceChildren();
  appendActionAlerts(root);
  const checked=priceEvidence?.generatedAt;
  if(!checked){
    root.append(note('The first strict Boost device-price scan has not published any observations yet. Listed prices still require carrier confirmation.'));
    appendMvnoWatch(root);
    appendReviewQueue(root);
    return;
  }
  root.append(element('h3','Boost Mobile device promotions'));
  const age=Date.now()-Date.parse(checked);
  const current=Number.isFinite(age)&&age>=0&&age<=EVIDENCE_FRESH_MS;
  root.append(element('p',
    'Official source: Boost Mobile. Last check: '+new Date(checked).toLocaleString('en-US')+
    '. '+(current?'Evidence scan is recent.':'CAUTION: scan is more than 48 hours old.')+
    ' Checks cover ONLY three models and three advertised headline conditions.','fb-watch-meta'));
  const summary=priceEvidence.summary||{};
  root.append(element('p',
    (summary.headlineMatches||0)+' official headline matches, '+
    (summary.priceMismatches||0)+' mismatches, '+
    (summary.needReview||0)+' items requiring review. A match never proves full eligibility, carrier locking, fees or checkout totals.',
    'fb-subtle'));
  const group=element('div',null,'fb-watch-grid');
  const all=(catalog.phones||[]);
  const entries=Object.entries(priceEvidence.offers||{}).sort(([id1],[id2])=>id1.localeCompare(id2));
  for(const [id,record] of entries){
    const original=all.find(x=>x.id===id);
    if(!original)continue;
    const card=element('article',null,'fb-watch-card');
    card.setAttribute('data-offer-id',id);
    card.append(element('h3',original.phone));
    card.append(statusNode(original));
    const catalogPrice=element('div',null,'fb-watch-pair');
    catalogPrice.append(element('span','Catalog device: '+usd(original.price)));
    catalogPrice.append(element('span','Catalog plan: '+usd(original.planPrice)+'/mo'));
    card.append(catalogPrice);
    if(record.observedPrice!==null && Number.isFinite(record.observedPrice)){
      const observed=element('p','Official headline observed: '+usd(record.observedPrice)+
        ' device with '+usd(record.observedPlanPrice)+'/mo plan.','fb-watch-price');
      card.append(observed);
    } else card.append(note('No matching official headline extracted on the latest scan.'));
    if(record.state==='headline_mismatch'||record.state==='ambiguous'){
      card.append(element('p','Needs review: catalog and official evidence do not agree.','fb-watch-warning'));
    }
    if(record.note)card.append(note(record.note));
    const entries=(priceHistory?.offers?.[id]||[]).filter(x=>x&&Number.isFinite(x.price));
    if(entries.length){
      const sorted=[...entries].sort((a,b)=>a.date.localeCompare(b.date));
      const earliest=sorted[0],latest=sorted[sorted.length-1];
      card.append(element('p','Observed '+sorted.length+' day(s), '+earliest.date+' to '+latest.date+
        '. Latest: '+usd(latest.price)+'.','fb-subtle'));
      card.append(priceSparkline(sorted));
    } else card.append(note('No historical price observations yet.'));
    const actions=element('div',null,'fb-card-actions');
    actions.append(linkTo('https://www.boostmobile.com/deals','Official advertised offers'));
    actions.append(reportOfferLink(id,original));
    card.append(actions);
    group.append(card);
  }
  if(group.childElementCount)root.append(group);
  else root.append(note('There are no scoped price observations in the latest report.'));
  root.append(element('p','History tracks selected device and required-plan headline prices from the official source. It is not a checkout receipt, price guarantee, or an assertion that every condition still applies. Prices on this website will not change automatically from these observations.','fb-watch-detail'));
  appendMvnoWatch(root);
  appendReviewQueue(root);
}

async function start() {
  renderFinder();
  try {
    const [c,v,proof,history,mvnoProof,mvnoRecords,queue,alerts,status,research,audit] = await Promise.all([
      fetch('data/deals.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}),
      fetch('data/verifications.json',{cache:'no-store'}).then(r=>r.ok?r.json():{offers:{}}).catch(()=>({offers:{}})),
      fetch('data/price-evidence.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/price-history.json',{cache:'no-store'}).then(r=>r.ok?r.json():{offers:{}}).catch(()=>({offers:{}})),
      fetch('data/mvno-evidence.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/mvno-history.json',{cache:'no-store'}).then(r=>r.ok?r.json():{offers:{}}).catch(()=>({offers:{}})),
      fetch('data/review-queue.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/alerts.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/status.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/research-evidence.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/research-audit.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    ]);
    catalog={plans:Array.isArray(c.plans)?c.plans:[],phones:Array.isArray(c.phones)?c.phones:[]};
    const providerSelect=finderRoot.querySelector('#fb-provider');
    if(providerSelect) {
      const options=[...new Set(catalog.plans.map(p=>p.carrier))].sort((a,b)=>a.localeCompare(b));
      providerSelect.replaceChildren(
        (()=>{const opt=element('option','Any provider');opt.value='any';return opt;})(),
        ...options.map(name=>{const opt=element('option',name);opt.value=name;return opt;})
      );
    }
    reviews=v?.offers && typeof v.offers==='object'?v.offers:{};
    priceEvidence=proof?.schema===1 && typeof proof.offers==='object'?proof:null;
    priceHistory=history?.schema===1 && typeof history.offers==='object'?history:{offers:{}};
    mvnoEvidence=mvnoProof?.schema===1 && typeof mvnoProof.offers==='object'?mvnoProof:null;
    mvnoHistory=mvnoRecords?.schema===1 && typeof mvnoRecords.offers==='object'?mvnoRecords:{offers:{}};
    scanStatus=status?.schema===1 && status.offers && typeof status.offers==='object'?status:null;
    reviewQueue=queue?.schema===1 && Array.isArray(queue.items)?queue:null;
    alertFeed=alerts?.schema===1 && Array.isArray(alerts.events)?alerts:null;
    researchAudit=audit?.schema===1 && Array.isArray(audit.offers)?audit:null;
    window.fiveBarsWatchData={
      catalog,phoneEvidence:priceEvidence||{offers:{}},
      mvnoEvidence:mvnoEvidence||{offers:{}},siteAlerts:alertFeed||{events:[]},
      status:scanStatus||{},verifications:reviews,
      researchEvidence:research?.schema===1?research:null,researchAudit
    };
    window.dispatchEvent(new Event('fivebars:watch-data'));
    const submit=finderRoot.querySelector('#fb-finder-form button[type="submit"]');
    if(submit){submit.disabled=false;submit.removeAttribute('aria-busy');submit.textContent='Find matching options';}
    renderPriceWatch();
    try{selected=normalizeCompare(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'),catalog);}catch{selected=[];}
    try {
      const stored=JSON.parse(localStorage.getItem(COMPARE_PREFS_KEY)||'null');
      if(stored && Number.isInteger(stored.lines) && stored.lines>=1 && stored.lines<=5) {
        comparePrefs={lines:stored.lines,cannotPort:stored.cannotPort===true,
          canPort:stored.canPort===true&&stored.cannotPort!==true,
          newCustomer:stored.newCustomer===true,discountQualified:stored.discountQualified===true,
          fromFinder:stored.fromFinder===true};
      }
    }catch{}
    renderCompare();
    decorateCards();
  } catch (e) {
    finderRoot.querySelector('#fb-finder-results').replaceChildren(note('Could not load the catalog. Please refresh the page.'));
    compareRoot.replaceChildren(note('Could not load comparisons.'));
    document.querySelector('#fb-price-watch-root')?.replaceChildren(note('Price evidence is currently unavailable.'));
  }
}
start();
