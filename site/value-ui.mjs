// Five Bars guided decisions and side-by-side comparison.
// UI never makes unverified offer claims. All inputs remain in this browser.
import {
  MAX_COMPARE, localDay, usd, verificationState, planCost, phoneCost,
  rankMatches, normalizeCompare
} from './value-core.mjs';

const finderRoot = document.querySelector('#fb-finder-root');
const compareRoot = document.querySelector('#fb-compare-root');
if (!finderRoot || !compareRoot) throw new Error('Five Bars comparison panels were not found');
const STORAGE_KEY = 'fivebars-compare-v1';
const COMPARE_PREFS_KEY = 'fivebars-household-compare-v1';
let comparePrefs = {lines:1,cannotPort:false,fromFinder:false};
let catalog = {plans:[],phones:[]};
let reviews = {};
let selected = [];

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
function statusNode(offer) {
  const s = verificationState(offer,reviews[offer.id]);
  const n = element('span',s.label,'fb-status fb-' + s.status);
  n.title = s.status==='verified' ? 'Evidence of a recent manual review; recheck before purchase' :
    'The automated link scan does not verify the promotional price or restrictions';
  return n;
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
function addToCompare(type,id) {
  if (!comparePrefs.fromFinder) {
    const selectedLines=Number(document.querySelector('#lines')?.value);
    if(Number.isInteger(selectedLines) && selectedLines>=1 && selectedLines<=5) comparePrefs.lines=selectedLines;
  }
  const next = normalizeCompare([...selected,{type,id}],catalog);
  if (selected.length && selected[0].type!==type) {
    selected = [{type,id}];
  } else if (!next.some(x=>x.type===type && x.id===id) && selected.length>=MAX_COMPARE) {
    window.alert('Compare up to '+MAX_COMPARE+' items at once. Remove an item first.');
    return;
  } else selected = next;
  saveCompare();
  renderCompare();
  if (typeof window.showTab === 'function') window.showTab('compare');
  document.getElementById('p-compare')?.scrollIntoView({block:'start',behavior:'smooth'});
}
window.fiveBarsCompare = addToCompare;
window.addEventListener('fivebars:render', decorateCards);

function renderFinder() {
  finderRoot.innerHTML = `
    <form id="fb-finder-form" class="fb-form">
      <p class="fb-subtle">Answer a few questions. Your choices stay on this device; no account or AI is needed.</p>\n      <p class="fb-subtle">Not sure which network works where you live? <a href="https://broadbandmap.fcc.gov/" target="_blank" rel="noopener noreferrer">Check the FCC mobile coverage map</a>. Its modeled outdoor coverage is not a guarantee of indoor reception. Always confirm device IMEI/eSIM compatibility with the carrier.</p>
      <div class="fb-fields">
        <label for="fb-net">Network preference
          <select id="fb-net" name="net"><option value="any">Help me compare all</option><option value="att">AT&amp;T</option><option value="vzw">Verizon</option><option value="tmo">T-Mobile</option></select>
        </label>
        <label for="fb-lines">How many lines?
          <select id="fb-lines" name="lines"><option value="1">1 line</option><option value="2">2 lines</option><option value="3">3 lines</option><option value="4">4 lines</option><option value="5">5 lines</option></select>
        </label>
        <label for="fb-budget">Monthly service budget (all lines)
          <input id="fb-budget" name="budget" type="number" min="0" max="2000" step="5" placeholder="No maximum"/>
        </label>
        <label for="fb-device">Phone preference
          <select id="fb-device" name="device"><option value="either">Show plans and phone deals</option><option value="byop">Keep my current phone</option><option value="phone">I need a new phone</option></select>
        </label>
      </div>
      <div class="fb-checks">
        <label><input name="cannotPort" type="checkbox"/> I cannot move my existing number</label>
        <label><input name="hotspot" type="checkbox"/> I need hotspot data</label>
        <label><input name="priority" type="checkbox"/> I want priority network data</label>
      </div>
      <button type="submit" class="btn">Find matching options</button>
    </form>
    <div id="fb-finder-results" aria-live="polite" aria-atomic="false"></div>`;
  finderRoot.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    const prefs = {
      network:data.get('net'),lines:Number(data.get('lines')),budget:data.get('budget'),
      cannotPort:data.has('cannotPort'),priority:data.has('priority'),hotspot:data.has('hotspot'),
    };
    comparePrefs={lines:prefs.lines,cannotPort:prefs.cannotPort,fromFinder:true};
    saveCompare();
    renderCompare();
    const ranked = rankMatches(catalog,prefs,localDay());
    const root = document.querySelector('#fb-finder-results');
    root.replaceChildren();
    root.append(element('h3','Matching options'));
    root.append(note('Estimated costs only, not a coverage guarantee or verified carrier quote. Promotions may have additional requirements.'));
    for(const msg of ranked.messages) root.append(note(msg));
    root.append(note(ranked.lines>1 ?
      'Plan results show known family prices first, then estimates; within each group the lowest 12-month cost ranks first.' :
      'Plan results are ordered by the estimated first-year service cost.'));
    const showPlans = data.get('device')!=='phone';
    const showPhones = data.get('device')!=='byop';
    if(showPlans) {
      root.append(element('h4','Plan options ('+ranked.planMatches+' match the selected filters)'));
      if(!ranked.plans.length) root.append(note('No matching plans. Try a larger budget or fewer must-haves.'));
      for(const [i,item] of ranked.plans.slice(0,3).entries()) {
        const p=item.offer;const c=item.cost;
        const card = element('article',null,'fb-result');
        card.append(element('strong',(i+1)+'. '+p.carrier+' — '+p.plan));
        card.append(element('p',usd(c.year)+' estimated over 12 months for '+c.lines+' line(s); '+
          usd(c.monthTotal)+'/mo at the modeled current rate.'));
        card.append(statusNode(p));
        if (c.promoFamilyUnconfirmed) card.append(note('Intro promo was NOT assumed for multiple lines; eligibility is unconfirmed.'));
        if (c.estimatedFamilyPrice) card.append(note('Multi-line price was not published in our catalog; this is a single-line extrapolation.'));
        const actions=element('div',null,'fb-card-actions');
        actions.append(button('Compare',()=>addToCompare('plan',p.id)));
        actions.append(button('See in plan list',()=>goToRow(p.id,'plan')));
        actions.append(linkTo(p.url,'Carrier details'));
        card.append(actions);
        root.append(card);
      }
    }
    if(showPhones) {
      root.append(element('h4',ranked.lines>1 ? 'Phone leads ('+ranked.phoneMatches+' options; household cost unconfirmed)' : 'Phone offers ('+ranked.phoneMatches+' match the selected filters)'));
      if(!ranked.phones.length) root.append(note('No matching offers. Consider keeping your phone or changing the network filter.'));
      for(const item of ranked.phones.slice(0,3)) {
        const p=item.offer,c=item.cost;
        const card=element('article',null,'fb-result');
        card.append(element('strong',p.phone+' — '+p.carrier));
        card.append(element('p','Estimated upfront '+usd(c.due)+'; first year '+usd(c.year)+' (one device).'));
        card.append(statusNode(p));
        if(item.uncertain) card.append(note('Financing, per-device or incomplete service terms prevent a complete household quote.'));
        const actions=element('div',null,'fb-card-actions');
        actions.append(button('Compare',()=>addToCompare('phone',p.id)));
        actions.append(button('See offer',()=>goToRow(p.id,'phone')));
        actions.append(linkTo(p.url,'Carrier details'));
        card.append(actions);
        root.append(card);
      }
    }
  });
}
function fieldValue(type,offer,key) {
  if(type==='plan') {
    const c=planCost(offer,comparePrefs.lines,{cannotPort:comparePrefs.cannotPort});
    switch(key) {
      case 'network':return offer.net==='multi'?'Choice of networks':offer.net==='att'?'AT&T':offer.net==='vzw'?'Verizon':'T-Mobile';
      case 'monthly':return usd(c?.monthTotal)+' total'+(c?.estimatedFamilyPrice?' (estimate)':'');
      case 'year':return usd(c?.year)+' total'+(c?.estimatedFamilyPrice?' (estimate)':'');
      case 'data':return offer.unl?'Unlimited (check limits)':(offer.data||'Not specified');
      case 'hotspot':return offer.hot||'Not specified';
      case 'priority':return offer.pri===true?'Listed priority':offer.pri===false?'Lower priority or variable':'Not specified';
      case 'taxes':return offer.tax?'Included':'Check carrier';
      case 'eligibility':return c?.promoFamilyUnconfirmed?'Multi-line intro not confirmed; excluded' :
        c?.promoSuppressedForNoPort?'Port-in promo excluded as requested' :
        offer.promo?.req==='port'?'Intro rate requires port-in':'Check current promo terms';
      default:return '—';
    }
  }
  const c=phoneCost(offer);
  switch(key) {
    case 'network':return offer.net==='multi'?'Network varies':offer.net==='att'?'AT&T':offer.net==='vzw'?'Verizon':'T-Mobile';
    case 'monthly':return c?.planPrice===null?'Variable':usd(c?.planPrice)+'/mo';
    case 'year':return usd(c?.year);
    case 'data':return usd(c?.due);
    case 'hotspot':return usd(c?.commitment);
    case 'priority':return offer.lock ? offer.lock+' months listed' : 'Unspecified; check carrier';
    case 'taxes':return offer.postpaid?'Postpaid/financing may apply':'Prepaid or bundled';
    case 'eligibility':return offer.port?'Number transfer required':'No transfer listed';
    default:return '—';
  }
}
function renderCompare() {
  compareRoot.replaceChildren();
  compareRoot.append(note('Choose up to '+MAX_COMPARE+' plans or phone offers. Comparisons use catalog estimates; data is not independently price-verified.'));
  if(!selected.length) {compareRoot.append(note('Select Compare on any plan or phone offer to start.'));return;}
  const toolbar=element('div',null,'fb-card-actions');
  toolbar.append(button('Clear comparison',()=>{selected=[];saveCompare();renderCompare();}));
  compareRoot.append(toolbar);
  const type=selected[0].type;
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
      comparePrefs.fromFinder=true;
      saveCompare();
      renderCompare();
    });
    label.append(select);
    toolbar.append(label);
  }
  const records=selected.map(s=>(type==='plan'?catalog.plans:catalog.phones).find(p=>p.id===s.id)).filter(Boolean);
  const labels=type==='plan'
    ? [['network','Network'],['monthly','Current rate ('+comparePrefs.lines+' lines)'],['year','12-month total ('+comparePrefs.lines+' lines)'],['data','Data'],['hotspot','Hotspot'],['priority','Data priority'],['taxes','Taxes'],['eligibility','Promo requirements']]
    : [['network','Network'],['monthly','Required plan'],['year','Estimated 12-month cost'],['data','Due today (est.)'],['hotspot','Minimum commitment (est.)'],['priority','Carrier lock'],['taxes','Plan type'],['eligibility','Transfer requirement']];
  compareRoot.append(note('On a phone, swipe the table sideways to see every comparison.')).classList.add('fb-swipe-hint');
  const wrap=element('div',null,'fb-table-wrap');
  const table=element('table',null,'fb-table');
  const head=element('thead'),header=element('tr');
  header.append(element('th','Compare '+(type==='plan'?'plans':'phone deals')));
  records.forEach((p,i)=>{
    const cell=element('th');
    cell.scope='col';
    cell.append(element('strong',type==='plan'?p.carrier+' — '+p.plan:p.phone+' — '+p.carrier));
    cell.append(document.createElement('br'));
    cell.append(statusNode(p));
    cell.append(document.createElement('br'));
    cell.append(button('Remove',()=>{selected.splice(i,1);saveCompare();renderCompare();},'fb-remove'));
    header.append(cell);
  });
  head.append(header);table.append(head);
  const body=element('tbody');
  for (const [key,label] of labels) {
    const tr=element('tr');const th=element('th',label);th.scope='row';tr.append(th);
    for(const item of records) tr.append(element('td',fieldValue(type,item,key)));
    body.append(tr);
  }
  const links=element('tr'); const source=element('th','Carrier website');source.scope='row';links.append(source);
  for(const item of records){const cell=element('td');cell.append(linkTo(item.url,'View published offer'));links.append(cell);}
  body.append(links);table.append(body);wrap.append(table);compareRoot.append(wrap);
  compareRoot.append(note(type==='plan' ?
    'Household estimates for '+comparePrefs.lines+' '+(comparePrefs.lines===1?'line':'lines')+'. Unknown multi-line prices extrapolate one-line rates; unconfirmed family intro offers are excluded. Taxes and eligibility may change actual costs.' :
    'Device promotions are quoted per handset, NOT for the full household. Credits, delayed rebates, taxes and financing terms may alter estimated totals.'));
}
async function start() {
  renderFinder();
  try {
    const [c,v] = await Promise.all([
      fetch('data/deals.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}),
      fetch('data/verifications.json',{cache:'no-store'}).then(r=>r.ok?r.json():{offers:{}}).catch(()=>({offers:{}})),
    ]);
    catalog={plans:Array.isArray(c.plans)?c.plans:[],phones:Array.isArray(c.phones)?c.phones:[]};
    reviews=v?.offers && typeof v.offers==='object'?v.offers:{};
    try{selected=normalizeCompare(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'),catalog);}catch{selected=[];}
    try {
      const stored=JSON.parse(localStorage.getItem(COMPARE_PREFS_KEY)||'null');
      if(stored && Number.isInteger(stored.lines) && stored.lines>=1 && stored.lines<=5) {
        comparePrefs={lines:stored.lines,cannotPort:stored.cannotPort===true,fromFinder:stored.fromFinder===true};
      }
    }catch{}
    renderCompare();
    decorateCards();
  } catch (e) {
    finderRoot.querySelector('#fb-finder-results').replaceChildren(note('Could not load the catalog. Please refresh the page.'));
    compareRoot.replaceChildren(note('Could not load comparisons.'));
  }
}
start();
