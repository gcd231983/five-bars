// Static, crawlable SEO pages built from the existing catalog: "best of" guides,
// one page per carrier and two hub pages. Deterministic for a given catalog,
// status, evidence and day. No scraping, AI, tracking or third-party scripts.
// Rankings are by estimated 12-month cost and are never affected by affiliate
// status: an approved affiliate URL only changes the outbound button.
import {planCost,phoneCost,validDay,pastEnd,localDay} from '../site/value-core.mjs';
import {escapeHtml,safeHttps,statusFor,GUIDES as COMPARISONS} from './comparison-pages.mjs';
import {SEO_GUIDES,CARRIER_NOTES,GUIDE_DIR,CARRIER_DIR,BEST_HUB,CARRIER_HUB,
 carrierSlug,catalogYear,catalogCarriers} from './seo-guides.mjs';

const BASE='https://fivebars.info/';
const OG_IMAGE=BASE+'og-card.jpg';
const LOGO=BASE+'five-bars-logo.png';
const e=escapeHtml;
const NET={vzw:'Verizon network',att:'AT&T network',tmo:'T-Mobile network',multi:'Choice of networks'};
const NET_POSSESSIVE={vzw:'Verizon’s network',att:'AT&T’s network',tmo:'T-Mobile’s network',multi:'more than one network'};
const DISCOUNT={autopay:'AutoPay',auto_refill:'Auto-Refill',autopay_ebilling:'AutoPay and paperless billing'};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function money(value){
 if(!Number.isFinite(value))return '—';
 const whole=Math.abs(value-Math.round(value))<.005;
 return '$'+value.toLocaleString('en-US',{minimumFractionDigits:whole?0:2,maximumFractionDigits:whole?0:2});
}
function prettyDay(day){
 if(!validDay(day))return 'Unknown';
 const [y,m,d]=day.split('-').map(Number);
 return MONTHS[m-1]+' '+d+', '+y;
}
function dates(data){
 const checked=validDay(data.catalog?.checked)?data.catalog.checked:null;
 const scan=typeof data.status?.generatedAt==='string'&&Number.isFinite(Date.parse(data.status.generatedAt))?
  data.status.generatedAt.slice(0,10):null;
 return {checked,scan};
}
const jsonLd=obj=>'<script type="application/ld+json">'+JSON.stringify(obj).replace(/</g,'\\u003c')+'</script>';
const netChip=net=>'<span class="net net-'+e(NET[net]?net:'multi')+'">'+e(NET[net]||'Network varies')+'</span>';
const carrierHref=(name,prefix)=>prefix+CARRIER_DIR+carrierSlug(name)+'.html';
const hasPlans=(data,name)=>(data.catalog?.plans||[]).some(p=>p.carrier===name);

// ---------- affiliate links (inactive until the owner records an approval) ----------
export function affiliateFor(carrier,affiliates){
 const entry=affiliates?.programs?.[carrier];
 if(!entry||entry.status!=='active'||!validDay(entry.approvedOn))return null;
 const url=safeHttps(entry.url);
 return url?{url,network:String(entry.network||'')}:null;
}
function outbound(carrier,officialUrl,label,ctx,{small=false}={}){
 const aff=affiliateFor(carrier,ctx.affiliates);
 const cls='cta'+(small?' cta-small':'');
 if(aff){
  ctx.usedAffiliate=true;
  return '<a class="'+cls+'" href="'+e(aff.url)+'" target="_blank" rel="sponsored noopener noreferrer">'+e(label)+
   '</a><span class="aff-note">Affiliate link</span>';
 }
 const url=safeHttps(officialUrl);
 if(!url)return '<span class="muted">Official link unavailable</span>';
 return '<a class="'+cls+' cta-ghost" href="'+e(url)+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>';
}

// ---------- plan math (same engine as the finder) ----------
function dataLabel(plan){
 if(plan.unl){
  const cap=String(plan.plan||'').match(/(\d+\s*GB)\s+high-speed/i);
  return cap?'Unlimited ('+cap[1].replace(/\s+/,'')+' high-speed)':'Unlimited';
 }
 return plan.data?String(plan.data):'See carrier';
}
function priorityLabel(plan){
 if(plan.pri===true)return 'Premium (priority) data';
 if(plan.pri===false)return 'Standard data, may slow when busy';
 return 'Data priority not stated';
}
function hotspotLabel(plan){
 const hot=String(plan.hot||'').trim();
 if(!hot||/^none$/i.test(hot))return 'No hotspot listed';
 return /hotspot/i.test(hot)?hot:'Hotspot: '+hot;
}
export function planFacts(plan,data,today){
 const info=statusFor(plan,data,today);
 const annual=plan.billingMonths===12;
 const base=planCost({...plan,promo:null},1,{today,discountQualified:true,cannotPort:true});
 const held=info.hold||!base||(annual&&!(plan.billingUpfront>0));
 const monthly=held?null:annual?plan.billingUpfront/12:base.regularPerLine;
 const year=held?null:base.year;
 const condition=plan.discountCondition&&Number.isFinite(plan.undiscountedPrice)?
  (DISCOUNT[plan.discountCondition]||'a carrier discount'):null;
 let deal=null;
 if(!held&&plan.promo&&!pastEnd(plan.promo.ends,today)&&plan.promo.text){
  const best=planCost(plan,1,{today,discountQualified:true,canPort:true,newCustomer:true});
  deal={text:String(plan.promo.text),year:best&&best.promoUsed&&best.year<year?best.year:null};
 }
 return {plan,info,held,annual,monthly,year,condition,deal,
  upfront:annual?plan.billingUpfront:null,
  data:dataLabel(plan),priority:priorityLabel(plan),hotspot:hotspotLabel(plan),
  taxes:plan.tax?'Taxes and fees included':'Plus taxes and fees'};
}
function rankPlans(plans,data,today){
 return plans.map(p=>planFacts(p,data,today)).sort((a,b)=>
  (a.held-b.held)||((a.year??Infinity)-(b.year??Infinity))||a.plan.id.localeCompare(b.plan.id));
}
function familyFacts(plan,data,today){
 const info=statusFor(plan,data,today);
 const totals={};
 let known=true;
 for(const lines of [1,2,3,4]){
  const c=planCost({...plan,promo:null},lines,{today,discountQualified:true,cannotPort:true});
  if(!c){totals[lines]=null;continue;}
  totals[lines]={month:c.regularMonthTotal,year:c.year,known:c.familyKnown};
  if(lines>1&&!c.familyKnown)known=false;
 }
 const held=info.hold||!totals[4];
 return {plan,info,held,totals,known,data:dataLabel(plan),priority:priorityLabel(plan)};
}
function rankFamily(plans,data,today,lines=4){
 return plans.map(p=>familyFacts(p,data,today)).sort((a,b)=>
  (a.held-b.held)||((b.totals[lines]?.known?1:0)-(a.totals[lines]?.known?1:0))||
  ((a.totals[lines]?.month??Infinity)-(b.totals[lines]?.month??Infinity))||a.plan.id.localeCompare(b.plan.id));
}
function phoneConditions(phone){
 const out=[];
 if(phone.port)out.push('Number transfer required');
 if(phone.newLineRequired)out.push('New line required');
 if(Number(phone.prepay)>1)out.push(phone.prepay+' months of service paid upfront');
 if(Number(phone.stay)>0)out.push('Keep service '+phone.stay+' months');
 if(Number(phone.lock)>0)out.push(phone.lock>=12?'Locked to carrier '+phone.lock+' months':'Unlocks after about '+(phone.lock*30)+' days');
 else out.push('Unlock terms: check carrier');
 return out;
}
export function phoneFacts(phone){
 const cost=phoneCost(phone,{newCustomer:true});
 let excluded=null;
 if(phone.listingHold)excluded='Price on hold while we confirm the offer';
 else if(phone.availability==='out_of_stock')excluded='Out of stock when last checked';
 else if(phone.postpaid===true||cost?.financingUncertain)excluded='Postpaid bill-credit deal, not comparable to prepaid prices';
 else if(!cost||!Number.isFinite(cost.year))excluded='Required plan price not confirmed';
 return {phone,cost,excluded,conditions:phoneConditions(phone)};
}
function rankPhones(phones){
 return phones.map(phoneFacts).sort((a,b)=>(!!a.excluded-!!b.excluded)||
  ((a.cost?.year??Infinity)-(b.cost?.year??Infinity))||a.phone.id.localeCompare(b.phone.id));
}
// ---------- shared page chrome ----------
function head({title,description,canonical,prefix,type='article',schema=[]}){
 const t=e(title),d=e(description),u=e(canonical);
 return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>'+t+' | Five Bars</title>'+
  '<meta name="description" content="'+d+'">'+
  '<meta name="robots" content="index,follow,max-image-preview:large">'+
  '<link rel="canonical" href="'+u+'">'+
  '<meta name="theme-color" content="#09141d">'+
  '<meta property="og:type" content="'+e(type)+'"><meta property="og:site_name" content="Five Bars">'+
  '<meta property="og:title" content="'+t+'"><meta property="og:description" content="'+d+'">'+
  '<meta property="og:url" content="'+u+'"><meta property="og:image" content="'+OG_IMAGE+'">'+
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'+
  '<meta property="og:image:alt" content="Five Bars: compare phone plans by true cost">'+
  '<meta name="twitter:card" content="summary_large_image">'+
  '<link rel="icon" type="image/svg+xml" href="'+prefix+'five-bars-mark.svg">'+
  schema.map(jsonLd).join('')+
  '<link rel="stylesheet" href="'+prefix+'comparison-styles.css">'+
  '<link rel="stylesheet" href="'+prefix+'guides.css">'+
  '</head><body><a class="skip" href="#main">Skip to main content</a>'+
  '<header class="wrap"><nav aria-label="Main navigation"><a href="'+(prefix||'./')+'">Five Bars</a>'+
  '<a href="'+prefix+BEST_HUB+'">Best plans</a>'+
  '<a href="'+prefix+CARRIER_HUB+'">Carriers</a>'+
  '<a href="'+prefix+GUIDE_DIR+'free-phone-deals.html">Phone deals</a>'+
  '<a href="'+prefix+'carrier-comparisons.html">Compare</a>'+
  '<a href="'+(prefix||'./')+'#finder">Plan finder</a></nav></header>';
}
function footer(prefix,ctx){
 const affiliate=ctx.usedAffiliate?
  'Some links on this page are affiliate links: if you sign up through them, Five Bars may earn a commission at no extra cost to you. Commissions never change our rankings. ':
  '';
 return '<footer class="wrap"><p>'+affiliate+'Five Bars is an independent comparison site, not a wireless carrier. Prices are estimates from carriers’ published offers; taxes, fees, eligibility and availability are confirmed at the carrier’s checkout.</p>'+
  '<nav aria-label="Site information"><a href="'+prefix+'about.html">About</a><a href="'+prefix+'editorial.html">How we rank</a>'+
  '<a href="'+prefix+'disclosures.html">Disclosures</a><a href="'+prefix+'privacy.html">Privacy</a>'+
  '<a href="'+prefix+'switching-guide.html">Switching guide</a><a href="'+prefix+'contact.html">Contact</a>'+
  '<a href="'+prefix+'report.html">Report a correction</a></nav></footer></body></html>\n';
}
function byline(data,prefix){
 const {checked,scan}=dates(data);
 return '<p class="byline"><span>By <a href="'+prefix+'editorial.html">Five Bars Editorial</a></span>'+
  (checked?'<span>Prices reviewed <time datetime="'+checked+'">'+prettyDay(checked)+'</time></span>':'')+
  (scan?'<span>Offers auto-checked <time datetime="'+scan+'">'+prettyDay(scan)+'</time></span>':'')+'</p>';
}
// Placeholder resolved after the body is built, so the notice reflects the
// links actually present on the page.
const DISCLOSURE_SLOT='<!--fb-disclosure-->';
function disclosure(ctx,prefix){
 if(ctx.usedAffiliate)return '<p class="disclosure"><strong>Advertiser disclosure:</strong> some links below are affiliate links. If you sign up through one, Five Bars may earn a commission at no extra cost to you. It never affects the order: plans are ranked by estimated cost. <a href="'+prefix+'disclosures.html">How we make money</a></p>';
 return '<p class="disclosure"><strong>Independent:</strong> no carrier pays for placement. Plans are ranked by estimated 12-month cost. <a href="'+prefix+'editorial.html">How we rank</a></p>';
}
function finish(html,ctx,prefix){
 return html.replace(DISCLOSURE_SLOT,disclosure(ctx,prefix))+footer(prefix,ctx);
}
function breadcrumbs(items){
 return {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map((it,i)=>
  ({"@type":"ListItem",position:i+1,name:it[0],item:it[1]}))};
}
function article({title,description,canonical,data}){
 const {checked}=dates(data);
 return {"@context":"https://schema.org","@type":"Article",headline:title,description,
  mainEntityOfPage:canonical,image:OG_IMAGE,inLanguage:'en-US',
  ...(checked?{dateModified:checked}:{}),
  author:{"@type":"Organization",name:'Five Bars Editorial',url:BASE+'editorial.html'},
  publisher:{"@type":"Organization",name:'Five Bars',url:BASE,logo:{"@type":"ImageObject",url:LOGO}}};
}
function faqSchema(faq){
 return {"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(([q,a])=>
  ({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))};
}
function faqHtml(faq){
 return '<section aria-labelledby="faq"><h2 id="faq">Frequently asked questions</h2><div class="faq">'+
  faq.map(([q,a])=>'<details><summary>'+e(q)+'</summary><p>'+e(a)+'</p></details>').join('')+'</div></section>';
}
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
function listNames(names){
 const list=[...new Set(names)];
 if(list.length<=1)return list.join('');
 return list.slice(0,-1).join(', ')+' and '+list.at(-1);
}
function summarize(text,max=158){
 const clean=String(text).replace(/\s+/g,' ').trim();
 if(clean.length<=max)return clean;
 return clean.slice(0,max-1).replace(/[\s,;:.]+\S*$/,'')+'…';
}

// ---------- plan blocks ----------
function priceLine(r){
 if(r.held)return '<p class="price"><strong>Price under review</strong></p>';
 if(r.annual)return '<p class="price"><strong>'+money(r.upfront)+'</strong>/year <span>≈ '+money(r.monthly)+'/mo, paid upfront</span></p>';
 const cond=r.condition?' <span>with '+e(r.condition)+'; '+money(r.plan.undiscountedPrice)+' without</span>':'';
 return '<p class="price"><strong>'+money(r.monthly)+'</strong>/mo'+cond+'</p>';
}
function planCard(r,ctx,{label,rank,prefix,own=false}){
 const p=r.plan;
 const carrierLink=hasPlans(ctx.data,p.carrier)?'<a href="'+carrierHref(p.carrier,prefix)+'">'+e(p.carrier)+'</a>':e(p.carrier);
 return '<article class="pick">'+
  (label?'<p class="pick-label"><span class="rank">'+rank+'</span>'+e(label)+'</p>':'')+
  (own?'<h3>'+e(p.plan)+'</h3>':'<h3>'+carrierLink+' <span>'+e(p.plan)+'</span></h3>')+priceLine(r)+
  (r.held?'':'<p class="year">'+money(r.year)+' over 12 months</p>')+
  '<ul class="facts"><li>'+netChip(p.net)+'</li><li>'+e(r.data)+'</li><li>'+e(r.priority)+'</li><li>'+e(r.hotspot)+'</li><li>'+e(r.taxes)+'</li></ul>'+
  (r.deal?'<p class="deal"><strong>Intro deal:</strong> '+e(r.deal.text)+(r.deal.year?' (about '+money(r.deal.year)+' for the first year if you qualify)':'')+'</p>':'')+
  '<div class="actions">'+outbound(p.carrier,p.url,'See plan at '+p.carrier,ctx)+'</div></article>';
}
function rankTable(rows,ctx,prefix,caption){
 const max=Math.max(...rows.filter(r=>!r.held).map(r=>r.year),1);
 return '<div class="table-scroll"><table class="rank-table"><caption>'+e(caption)+'</caption><thead><tr>'+
  '<th scope="col">#</th><th scope="col">Plan</th><th scope="col">Network</th><th scope="col">Data</th>'+
  '<th scope="col">Price</th><th scope="col">12-month cost</th><th scope="col"><span class="sr">Link</span></th></tr></thead><tbody>'+
  rows.map((r,i)=>{
   const p=r.plan;
   const name=(hasPlans(ctx.data,p.carrier)?'<a href="'+carrierHref(p.carrier,prefix)+'">'+e(p.carrier)+'</a>':e(p.carrier))+'<span>'+e(p.plan)+'</span>';
   const price=r.held?'Under review':r.annual?money(r.upfront)+'/yr':money(r.monthly)+'/mo'+(r.condition?'*':'');
   const year=r.held?'<span class="muted">Withheld</span>':
    '<span class="costbar" style="--w:'+Math.max(4,Math.round(r.year/max*100))+'%" aria-hidden="true"></span>'+money(r.year);
   return '<tr'+(r.held?' class="needs-review"':'')+'><td>'+(r.held?'–':i+1)+'</td><th scope="row">'+name+'</th><td>'+netChip(p.net)+
    '</td><td>'+e(r.data)+'</td><td>'+price+'</td><td class="yr">'+year+'</td><td>'+outbound(p.carrier,p.url,'View',ctx,{small:true})+'</td></tr>';
  }).join('')+'</tbody></table></div>'+
  (rows.some(r=>r.condition&&!r.held)?'<p class="note">* Price with the carrier’s AutoPay (or similar) discount, which anyone can sign up for. The 12-month cost assumes it.</p>':'');
}
function relatedGuides(current,prefix){
 const others=SEO_GUIDES.filter(g=>g.slug!==current);
 return '<section aria-labelledby="related"><h2 id="related">More guides</h2><ul class="link-grid">'+
  others.map(g=>'<li><a href="'+prefix+GUIDE_DIR+g.slug+'.html">'+e(g.short)+'</a></li>').join('')+
  '<li><a href="'+prefix+CARRIER_HUB+'">All carriers</a></li><li><a href="'+prefix+'carrier-comparisons.html">Head-to-head comparisons</a></li></ul></section>';
}
function methodSection(prefix,kind){
 const items=kind==='phones'?[
  'We add the advertised device price to the plan you are required to buy, then count 12 months of that plan at its regular price.',
  'Mail-in rebates, gift cards and bill credits are left out because they are not cash at checkout.',
  'Offers that are out of stock, on hold or paid as postpaid bill credits are listed separately, not ranked.',
  'Taxes and activation fees are not included unless the carrier publishes them.'
 ]:[
  'We estimate what one line costs over 12 months at the regular price. AutoPay-style discounts that anyone can get are included; intro deals that need a new line or number transfer are shown separately.',
  'Annual plans count their full upfront payment.',
  'Offers whose published price conflicts with our records are held for review and not ranked.',
  'No carrier pays for placement. Affiliate links, where they exist, never change the order.'
 ];
 return '<section aria-labelledby="method"><h2 id="method">How we rank</h2><ul>'+items.map(t=>'<li>'+e(t)+'</li>').join('')+
  '</ul><p>Read our full <a href="'+prefix+'editorial.html">editorial standards</a>, or use the <a href="'+(prefix||'./')+'#finder">plan finder</a> to rank plans for your number of lines and network.</p></section>';
}

// ---------- guide pages ----------
export function renderSeoGuide(guide,data,{today=localDay(),affiliates=null}={}){
 if(!SEO_GUIDES.some(g=>g.slug===guide?.slug))throw Error('SEO guide must be curated');
 const catalog=data.catalog;
 if(!Array.isArray(catalog?.plans)||!Array.isArray(catalog?.phones))throw Error('Catalog plan data is missing');
 const year=catalogYear(catalog),prefix='../';
 const canonical=BASE+GUIDE_DIR+guide.slug+'.html';
 const h1=guide.title+' ('+year+')';
 const ctx={data,affiliates,usedAffiliate:false};
 const body=[],faq=[];
 let itemList=[],quick='',topNames=[];

 if(guide.kind==='phones'){
  const ranked=rankPhones(catalog.phones.filter(guide.filter));
  const live=ranked.filter(r=>!r.excluded),out=ranked.filter(r=>r.excluded);
  if(!live.length)throw Error('No rankable phone offers for '+guide.slug);
  topNames=live.map(r=>r.phone.carrier);
  const top=live[0];
  quick='The lowest first-year cost we found is the <strong>'+e(top.phone.phone)+'</strong> from '+e(top.phone.carrier)+
   ': '+money(top.cost.netDevice)+' for the phone plus a '+money(top.cost.planPrice)+'/mo plan, about <strong>'+money(top.cost.year)+'</strong> for the first year.';
  faq.push(['What is the cheapest '+(guide.slug==='iphone-deals'?'prepaid iPhone deal':'free phone deal')+' right now?',
   'In our latest check, the '+top.phone.phone+' from '+top.phone.carrier+' costs about '+money(top.cost.year)+' in the first year, including the required '+money(top.cost.planPrice)+'/mo plan. Confirm the price and eligibility at the carrier before buying.']);
  body.push('<section aria-labelledby="top"><h2 id="top">Top picks</h2><div class="picks">');
  live.slice(0,3).forEach((r,i)=>{
   const p=r.phone;
   body.push('<article class="pick"><p class="pick-label"><span class="rank">'+(i+1)+'</span>'+(i===0?'Lowest first-year cost':'Runner-up')+'</p>'+
    '<h3>'+e(p.phone)+' <span>at '+(hasPlans(data,p.carrier)?'<a href="'+carrierHref(p.carrier,prefix)+'">'+e(p.carrier)+'</a>':e(p.carrier))+'</span></h3>'+
    '<p class="price"><strong>'+(p.price===0?'$0':money(r.cost.netDevice))+'</strong> phone <span>+ '+money(r.cost.planPrice)+'/mo plan</span></p>'+
    '<p class="year">About '+money(r.cost.year)+' for the first year · '+money(r.cost.due)+' due at signup (est.)</p>'+
    '<ul class="facts"><li>'+netChip(p.net)+'</li>'+r.conditions.map(c=>'<li>'+e(c)+'</li>').join('')+'</ul>'+
    '<div class="actions">'+outbound(p.carrier,p.url,'See deal at '+p.carrier,ctx)+'</div></article>');
  });
  body.push('</div></section>');
  body.push('<section aria-labelledby="all"><h2 id="all">All '+e(guide.short.toLowerCase())+' ranked</h2><div class="table-scroll"><table class="rank-table"><caption>Ranked by estimated first-year cost for a new customer</caption><thead><tr>'+
   '<th scope="col">#</th><th scope="col">Phone</th><th scope="col">Network</th><th scope="col">Phone price</th><th scope="col">Required plan</th><th scope="col">First year (est.)</th><th scope="col">Conditions</th><th scope="col"><span class="sr">Link</span></th></tr></thead><tbody>');
  const max=Math.max(...live.map(r=>r.cost.year),1);
  live.forEach((r,i)=>{
   const p=r.phone;
   body.push('<tr><td>'+(i+1)+'</td><th scope="row">'+e(p.phone)+'<span>'+e(p.carrier)+'</span></th><td>'+netChip(p.net)+'</td><td>'+
    (p.price===0?'Advertised $0':money(r.cost.netDevice))+'</td><td>'+money(r.cost.planPrice)+'/mo</td><td class="yr"><span class="costbar" style="--w:'+
    Math.max(4,Math.round(r.cost.year/max*100))+'%" aria-hidden="true"></span>'+money(r.cost.year)+'</td><td>'+r.conditions.map(e).join('; ')+'</td><td>'+
    outbound(p.carrier,p.url,'View',ctx,{small:true})+'</td></tr>');
  });
  body.push('</tbody></table></div></section>');
  if(out.length){
   body.push('<section aria-labelledby="unranked"><h2 id="unranked">Also advertised, but not ranked</h2><ul>');
   for(const r of out)body.push('<li><strong>'+e(r.phone.phone)+'</strong> at '+e(r.phone.carrier)+': '+e(r.excluded)+'.</li>');
   body.push('</ul></section>');
  }
  itemList=live.slice(0,10).map(r=>r.phone.phone+' at '+r.phone.carrier);
 } else if(guide.kind==='family'){
  const plans=catalog.plans.filter(guide.filter);
  const ranked=rankFamily(plans,data,today,4);
  const live=ranked.filter(r=>!r.held);
  if(!live.length)throw Error('No family plans available');
  topNames=live.map(r=>r.plan.carrier);
  const knownTop=live.find(r=>r.totals[4].known)||live[0];
  quick='For a family of four, the lowest total with a <em>published</em> family price is <strong>'+e(knownTop.plan.carrier+' '+knownTop.plan.plan)+
   '</strong> at about <strong>'+money(knownTop.totals[4].month)+'/mo</strong> for all four lines ('+money(knownTop.totals[4].month/4)+' per line).';
  faq.push(['What is the cheapest family plan for 4 lines?','Among plans with a published multi-line price, '+knownTop.plan.carrier+' '+knownTop.plan.plan+' costs about '+money(knownTop.totals[4].month)+' a month for four lines in our latest check. Carriers without a published family discount charge the single-line price for each line.']);
  body.push('<section aria-labelledby="top"><h2 id="top">Top picks</h2><div class="picks">');
  const used=new Set();let n=0;
  for(const def of guide.picks){
   const pool=rankFamily(plans,data,today,def.lines||4).filter(r=>!r.held&&!used.has(r.plan.id)&&def.test(r.plan));
   const hit=pool[0];if(!hit)continue;used.add(hit.plan.id);n++;
   const lines=def.lines||4,t=hit.totals[lines];
   body.push('<article class="pick"><p class="pick-label"><span class="rank">'+n+'</span>'+e(def.label)+'</p>'+
    '<h3><a href="'+carrierHref(hit.plan.carrier,prefix)+'">'+e(hit.plan.carrier)+'</a> <span>'+e(hit.plan.plan)+'</span></h3>'+
    '<p class="price"><strong>'+(t.known?'':'≈')+money(t.month)+'</strong>/mo for '+lines+' lines <span>'+money(t.month/lines)+' per line</span></p>'+
    '<ul class="facts"><li>'+netChip(hit.plan.net)+'</li><li>'+e(hit.data)+'</li><li>'+e(hit.priority)+'</li><li>'+(t.known?'Published multi-line price':'No published family discount (estimate)')+'</li></ul>'+
    '<div class="actions">'+outbound(hit.plan.carrier,hit.plan.url,'See plan at '+hit.plan.carrier,ctx)+'</div></article>');
  }
  body.push('</div></section>');
  body.push('<section aria-labelledby="all"><h2 id="all">Monthly totals by number of lines</h2><div class="table-scroll"><table class="rank-table"><caption>Total monthly bill before taxes, regular prices. ≈ means no published family price (single-line price × lines).</caption><thead><tr>'+
   '<th scope="col">Plan</th><th scope="col">Network</th><th scope="col">1 line</th><th scope="col">2 lines</th><th scope="col">3 lines</th><th scope="col">4 lines</th><th scope="col"><span class="sr">Link</span></th></tr></thead><tbody>');
  for(const r of ranked){
   const cell=l=>r.held||!r.totals[l]?'<td class="muted">—</td>':'<td>'+(r.totals[l].known?'':'≈')+money(r.totals[l].month)+'</td>';
   body.push('<tr'+(r.held?' class="needs-review"':'')+'><th scope="row"><a href="'+carrierHref(r.plan.carrier,prefix)+'">'+e(r.plan.carrier)+'</a><span>'+e(r.plan.plan)+'</span></th><td>'+netChip(r.plan.net)+'</td>'+
    cell(1)+cell(2)+cell(3)+cell(4)+'<td>'+outbound(r.plan.carrier,r.plan.url,'View',ctx,{small:true})+'</td></tr>');
  }
  body.push('</tbody></table></div></section>');
  itemList=live.slice(0,10).map(r=>r.plan.carrier+' '+r.plan.plan);
 } else {
  const ranked=rankPlans(catalog.plans.filter(guide.filter),data,today);
  const live=ranked.filter(r=>!r.held);
  if(!live.length)throw Error('No rankable plans for '+guide.slug);
  topNames=live.map(r=>r.plan.carrier);
  const [a,b,c]=live;
  const describe=r=>e(r.plan.carrier+' '+r.plan.plan)+(r.annual&&/upfront/i.test(r.plan.plan)?'':' ('+(r.annual?money(r.upfront)+' a year':money(r.monthly)+'/mo')+')');
  quick='The lowest 12-month cost here is <strong>'+e(a.plan.carrier+' '+a.plan.plan)+'</strong> at about <strong>'+money(a.year)+
   '</strong> for the year'+(a.annual?(/upfront/i.test(a.plan.plan)?'':' (paid upfront)'):' ('+money(a.monthly)+'/mo)')+'.'+
   (b?' Next are '+describe(b)+(c?' and '+describe(c):'')+'.':'');
  const q={
   'cheap-phone-plans':'What is the cheapest phone plan right now?','cheap-unlimited-plans':'What is the cheapest unlimited plan?',
   'verizon-network-plans':'What is the cheapest plan on Verizon’s network?','att-network-plans':'What is the cheapest plan on AT&T’s network?',
   't-mobile-network-plans':'What is the cheapest plan on T-Mobile’s network?','premium-data-plans':'What is the cheapest plan with premium data?',
   'hotspot-plans':'What is the cheapest plan with hotspot?','low-data-plans':'What is the cheapest low-data plan?','annual-phone-plans':'What is the cheapest annual phone plan?'
  }[guide.slug]||'Which plan is cheapest?';
  faq.push([q,'In our latest check, '+a.plan.carrier+' '+a.plan.plan+' has the lowest estimated 12-month cost at about '+money(a.year)+
   (a.annual?', paid upfront for the year.':' ('+money(a.monthly)+' a month).')+' Prices change often, so confirm at the carrier before you buy.']);
  if(guide.slug==='cheap-phone-plans'){
   const incl=[...new Set(live.filter(r=>r.plan.tax).map(r=>r.plan.carrier))];
   if(incl.length)faq.push(['Which carriers include taxes in the price?','Of the plans we track, '+listNames(incl)+' include taxes and fees in the advertised price. Others add them at checkout, which typically adds a few dollars a month.']);
  }
  const picks=[],used=new Set();
  for(const def of guide.picks){
   const hit=live.find(r=>!used.has(r.plan.id)&&def.test(r.plan));
   if(hit){used.add(hit.plan.id);picks.push([def.label,hit]);}
  }
  body.push('<section aria-labelledby="top"><h2 id="top">Top picks</h2><div class="picks">'+
   picks.map(([label,r],i)=>planCard(r,ctx,{label,rank:i+1,prefix})).join('')+'</div></section>');
  body.push('<section aria-labelledby="all"><h2 id="all">All '+plural(ranked.length,'plan')+' ranked</h2>'+
   rankTable(ranked,ctx,prefix,'Ranked by estimated 12-month cost for one line')+'</section>');
  if(guide.net){
   const multi=rankPlans(catalog.plans.filter(p=>p.net==='multi'),data,today).filter(r=>!r.held);
   if(multi.length)body.push('<section aria-labelledby="multi"><h2 id="multi">Also available on '+e(NET_POSSESSIVE[guide.net])+'</h2><p>These carriers let you pick a network when you sign up, so they may also run on '+e(NET_POSSESSIVE[guide.net])+'. Confirm the network offered at your address before you buy.</p>'+
    rankTable(multi,ctx,prefix,'Multi-network plans by 12-month cost')+'</section>');
  }
  itemList=live.slice(0,10).map(r=>r.plan.carrier+' '+r.plan.plan);
 }

 const shownCarriers=[...new Set(topNames)].slice(0,3);
 const description=summarize(guide.description.replace('{carriers}',listNames(shownCarriers)));
 const allFaq=[...faq,...guide.faq];
 const title=h1+(guide.titleTail?': '+guide.titleTail:'');
 const html=[head({title:title.length<=60?title:h1,description,canonical,prefix,schema:[
  article({title,description,canonical,data}),
  breadcrumbs([['Home',BASE],['Best phone plans',BASE+BEST_HUB],[guide.title,canonical]]),
  {"@context":"https://schema.org","@type":"ItemList",name:h1,itemListOrder:'https://schema.org/ItemListOrderAscending',
   itemListElement:itemList.map((name,i)=>({"@type":"ListItem",position:i+1,name}))},
  faqSchema(allFaq)
 ]})];
 html.push('<main class="wrap guide-page" id="main" tabindex="-1">');
 html.push('<p class="crumb"><a href="../">Home</a> / <a href="../'+BEST_HUB+'">Best phone plans</a> / '+e(guide.short)+'</p>');
 html.push('<h1>'+e(title)+'</h1>'+byline(data,prefix)+DISCLOSURE_SLOT);
 html.push('<p class="lede">'+e(guide.intro)+'</p>');
 html.push('<div class="answer" role="note"><p class="answer-label">Quick answer</p><p>'+quick+'</p></div>');
 html.push(...body);
 html.push('<section aria-labelledby="tips"><h2 id="tips">What to know before you switch</h2><ul class="tips">'+guide.tips.map(t=>'<li>'+e(t)+'</li>').join('')+'</ul></section>');
 html.push(methodSection(prefix,guide.kind));
 html.push(faqHtml(allFaq));
 html.push(relatedGuides(guide.slug,prefix));
 html.push('</main>');
 return finish(html.join(''),ctx,prefix);
}

// ---------- carrier pages ----------
function carrierFaq(name,rows,phones,data,today){
 const live=rows.filter(r=>!r.held);
 const nets=[...new Set(rows.map(r=>r.plan.net))];
 const netText=nets.length===1&&nets[0]!=='multi'?name+' plans in our catalog run on '+NET_POSSESSIVE[nets[0]]+'.':
  nets.includes('multi')?name+' lets you choose among more than one major network when you sign up; the network available depends on your address and phone.':
  name+' plans in our catalog use '+listNames(nets.map(n=>NET_POSSESSIVE[n]))+', depending on the plan.';
 const faq=[['What network does '+name+' use?',netText+' Check the carrier’s coverage map for your address before switching.']];
 const cheapest=[...live].sort((a,b)=>a.monthly-b.monthly)[0];
 if(cheapest)faq.push(['What is '+name+'’s cheapest plan?','The lowest-priced plan we track is '+cheapest.plan.plan+' at '+
  (cheapest.annual?money(cheapest.upfront)+' a year (about '+money(cheapest.monthly)+'/mo)':money(cheapest.monthly)+' a month')+
  (cheapest.condition?' with '+cheapest.condition:'')+'. That is about '+money(cheapest.year)+' over 12 months before any intro deals.']);
 const unlimited=live.filter(r=>r.plan.unl);
 faq.push(['Does '+name+' have unlimited data plans?',unlimited.length?
  'Yes. '+listNames(unlimited.map(r=>r.plan.plan+' ('+(r.annual?money(r.upfront)+'/yr':money(r.monthly)+'/mo')+')'))+'. Check each plan’s high-speed allowance and hotspot rules.':
  'Not among the plans we track. '+name+' focuses on plans with a fixed amount of data.']);
 const fam=rows.find(r=>r.plan.family&&!r.held);
 if(fam){
  const four=planCost({...fam.plan,promo:null},4,{today,discountQualified:true,cannotPort:true});
  faq.push(['Does '+name+' offer family or multi-line discounts?',four&&four.familyKnown?
   'Yes. For example, '+fam.plan.plan+' costs about '+money(four.regularMonthTotal)+' a month for four lines ('+money(four.regularPerLine)+' per line) at regular prices.':
   'Some '+name+' plans list multi-line pricing. Check the carrier for current rates.']);
 } else {
  faq.push(['Does '+name+' offer family or multi-line discounts?','We haven’t found a published multi-line discount on the '+name+' plans we track, so each line costs the single-line price. Some plans are limited to one line.']);
 }
 if(phones.length)faq.push(['Does '+name+' have phone deals?','We track '+plural(phones.length,'phone offer')+' from '+name+'. Most require a specific plan, and many require transferring your number. See the phone deals section for estimated first-year costs.']);
 faq.push(['Can I keep my phone number if I switch to '+name+'?','Yes. Federal number-portability rules let you keep your number. Keep your current service active, get your account number and transfer PIN from your current carrier, and enter them when you sign up with '+name+'.']);
 return faq;
}
function goodFor(rows,phones){
 const live=rows.filter(r=>!r.held),good=[],watch=[];
 const cheapest=Math.min(...live.map(r=>r.monthly));
 if(cheapest<=15)good.push('Budget shoppers: plans from '+money(cheapest)+'/mo.');
 if(live.some(r=>!r.plan.unl))good.push('Light users who mostly use Wi-Fi (low-data plans available).');
 if(live.some(r=>r.plan.unl))good.push('Heavy data users (unlimited plans available).');
 if(live.some(r=>r.plan.pri===true))good.push('People in busy areas who want premium (priority) data.');
 if(live.some(r=>r.plan.family))good.push('Families: published multi-line pricing.');
 if(live.some(r=>r.plan.net==='multi'))good.push('Choosing the network that works best at your address.');
 if(live.some(r=>r.annual))good.push('Paying once a year for a lower monthly equivalent.');
 if(live.some(r=>/unlimited hotspot|50GB|100GB/i.test(String(r.plan.hot||''))))good.push('Hotspot users who need a large allowance.');
 if(phones.some(p=>!p.excluded))good.push('Getting a discounted phone when you switch.');
 if(live.some(r=>r.deal))watch.push('Intro prices end. Budget for the regular price shown here.');
 if(live.some(r=>r.annual))watch.push('Annual plans are paid upfront and are usually non-refundable.');
 if(live.some(r=>r.condition))watch.push('The advertised price needs '+listNames([...new Set(live.filter(r=>r.condition).map(r=>r.condition))])+'.');
 if(rows.some(r=>Number.isFinite(r.plan.maxLines)&&r.plan.maxLines===1))watch.push('Some plans are limited to one line.');
 if(live.some(r=>r.plan.unl&&r.plan.pri===false))watch.push('Standard unlimited data can slow down when towers are busy.');
 if(live.some(r=>/^no hotspot/i.test(r.hotspot)))watch.push('Some plans include no hotspot.');
 if(live.some(r=>!r.plan.tax))watch.push('Some prices exclude taxes and fees.');
 if(rows.some(r=>r.held))watch.push('One or more prices are under review.');
 return {good,watch};
}
export function renderCarrierPage(name,data,{today=localDay(),affiliates=null}={}){
 const catalog=data.catalog;
 const plans=(catalog?.plans||[]).filter(p=>p.carrier===name);
 if(!plans.length)throw Error('No catalog plans for carrier '+name);
 const year=catalogYear(catalog),prefix='../',slug=carrierSlug(name);
 const canonical=BASE+CARRIER_DIR+slug+'.html';
 const ctx={data,affiliates,usedAffiliate:false};
 const rows=rankPlans(plans,data,today);
 const live=rows.filter(r=>!r.held);
 const phones=rankPhones((catalog.phones||[]).filter(p=>p.carrier===name));
 const nets=[...new Set(plans.map(p=>p.net))];
 const from=live.length?Math.min(...live.map(r=>r.monthly)):null;
 const fromAnnual=from!==null&&live.filter(r=>r.monthly===from).every(r=>r.annual);
 const unlFrom=live.filter(r=>r.plan.unl).map(r=>r.monthly);
 const h1=name+' Plans & Prices ('+year+')';
 const title=h1+': Costs, Network and Fine Print';
 const netPhrase=nets.length===1&&nets[0]!=='multi'?'on '+NET_POSSESSIVE[nets[0]]:nets.includes('multi')?'with a choice of networks':'on '+listNames(nets.map(n=>NET_POSSESSIVE[n]));
 const description=summarize(name+' plans compared by true 12-month cost'+(from!==null?', from '+money(from)+'/mo':'')+', '+netPhrase+
  '. Data, hotspot, priority, family pricing'+(phones.length?', phone deals':'')+' and fine print.');
 const faq=carrierFaq(name,rows,phones.map(p=>p.phone),data,today);
 const {good,watch}=goodFor(rows,phones);
 const html=[head({title:title.length<=60?title:h1,description,canonical,prefix,schema:[
  article({title,description,canonical,data}),
  breadcrumbs([['Home',BASE],['Carriers',BASE+CARRIER_HUB],[name,canonical]]),
  faqSchema(faq)
 ]})];
 const firstUrl=plans.map(p=>p.url).find(u=>safeHttps(u));
 html.push('<main class="wrap guide-page" id="main" tabindex="-1">');
 html.push('<p class="crumb"><a href="../">Home</a> / <a href="../'+CARRIER_HUB+'">Carriers</a> / '+e(name)+'</p>');
 html.push('<h1>'+e(title)+'</h1>'+byline(data,prefix)+DISCLOSURE_SLOT);
 html.push('<p class="lede">'+(CARRIER_NOTES[name]?e(CARRIER_NOTES[name])+' ':'')+'We track '+plural(plans.length,'plan')+' from '+e(name)+' '+e(netPhrase)+
  (from!==null?', starting at '+money(from)+' a month'+(fromAnnual?' (billed yearly)':''):'')+'. '+(plans.length===1?'Here is what it includes':'Here is what each one includes')+' and what it really costs over a year.</p>');
 html.push('<div class="facts-box"><dl>'+
  '<div><dt>Network</dt><dd>'+nets.map(netChip).join(' ')+'</dd></div>'+
  '<div><dt>Plans tracked</dt><dd>'+plans.length+'</dd></div>'+
  '<div><dt>Cheapest plan</dt><dd>'+(from!==null?money(from)+'/mo'+(fromAnnual?' (billed yearly)':''):'Under review')+'</dd></div>'+
  '<div><dt>Unlimited from</dt><dd>'+(unlFrom.length?money(Math.min(...unlFrom))+'/mo':'No unlimited plan')+'</dd></div>'+
  '<div><dt>Family pricing</dt><dd>'+(plans.some(p=>p.family)?'Published':'Not published')+'</dd></div>'+
  '<div><dt>Phone deals tracked</dt><dd>'+phones.length+'</dd></div></dl>'+
  '<div class="actions">'+outbound(name,firstUrl,'See '+name+' plans',ctx)+'</div></div>');
 html.push('<section aria-labelledby="fit"><h2 id="fit">Is '+e(name)+' a good fit?</h2><div class="fit"><div><h3>Good for</h3><ul class="good">'+
  (good.length?good:['Shoppers comparing prepaid options.']).map(t=>'<li>'+e(t)+'</li>').join('')+'</ul></div><div><h3>Watch out for</h3><ul class="watch">'+
  (watch.length?watch:['Confirm coverage at your address before switching.']).map(t=>'<li>'+e(t)+'</li>').join('')+'</ul></div></div></section>');
 html.push('<section aria-labelledby="plans"><h2 id="plans">'+e(name)+' plans compared</h2><div class="picks">');
 for(const r of rows){
  html.push(planCard(r,ctx,{prefix,own:true}).replace('</article>',
   r.plan.extra||r.plan.video?'<details class="fine"><summary>Fine print</summary>'+(r.plan.video?'<p><strong>Video:</strong> '+e(r.plan.video)+'</p>':'')+
   (r.plan.extra?'<p>'+e(r.plan.extra)+'</p>':'')+'</details></article>':'</article>'));
 }
 html.push('</div></section>');
 if(phones.length){
  html.push('<section aria-labelledby="phones"><h2 id="phones">'+e(name)+' phone deals</h2><div class="table-scroll"><table class="rank-table"><caption>Estimated first-year cost for a new customer, including the required plan</caption><thead><tr>'+
   '<th scope="col">Phone</th><th scope="col">Phone price</th><th scope="col">Required plan</th><th scope="col">First year (est.)</th><th scope="col">Conditions</th><th scope="col"><span class="sr">Link</span></th></tr></thead><tbody>');
  for(const r of phones){
   const p=r.phone;
   html.push('<tr'+(r.excluded?' class="needs-review"':'')+'><th scope="row">'+e(p.phone)+'</th><td>'+(p.price===0?'Advertised $0':money(Number(p.price)))+'</td><td>'+
    (Number.isFinite(p.planPrice)?money(p.planPrice)+'/mo':'—')+'</td><td>'+(r.excluded?'<span class="muted">'+e(r.excluded)+'</span>':money(r.cost.year))+'</td><td>'+
    r.conditions.map(e).join('; ')+'</td><td>'+outbound(name,p.url,'View',ctx,{small:true})+'</td></tr>');
  }
  html.push('</tbody></table></div></section>');
 }
 // Internal links: head-to-head pages, same-network alternatives, relevant guides.
 const compares=COMPARISONS.filter(g=>g.left===name||g.right===name);
 const sameNet=new Map();
 for(const p of catalog.plans){
  if(p.carrier===name||!nets.includes(p.net))continue;
  const f=planFacts(p,data,today);if(f.held)continue;
  const cur=sameNet.get(p.carrier);
  if(!cur||f.monthly<cur)sameNet.set(p.carrier,f.monthly);
 }
 const alts=[...sameNet.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0])).slice(0,4);
 const guides=SEO_GUIDES.filter(g=>g.kind!=='phones'&&plans.some(g.filter)).slice(0,6);
 html.push('<section aria-labelledby="alts"><h2 id="alts">Compare '+e(name)+' with alternatives</h2>'+
  (compares.length?'<h3>Head-to-head</h3><ul class="link-grid">'+compares.map(g=>'<li><a href="../compare/'+e(g.slug)+'.html">'+e(g.left+' vs '+g.right)+'</a></li>').join('')+'</ul>':'')+
  (alts.length?'<h3>'+e(nets.length===1&&nets[0]!=='multi'?'Other carriers on '+NET_POSSESSIVE[nets[0]]:'Similar carriers')+'</h3><ul class="link-grid">'+
   alts.map(([c,m])=>'<li><a href="'+e(carrierSlug(c))+'.html">'+e(c)+'</a> <span class="muted">from '+money(m)+'/mo</span></li>').join('')+'</ul>':'')+
  (guides.length?'<h3>Guides that include '+e(name)+'</h3><ul class="link-grid">'+guides.map(g=>'<li><a href="../'+GUIDE_DIR+g.slug+'.html">'+e(g.short)+'</a></li>').join('')+'</ul>':'')+
  '</section>');
 html.push(faqHtml(faq));
 html.push('</main>');
 return finish(html.join(''),ctx,prefix);
}

// ---------- hubs ----------
export function renderBestHub(data,{today=localDay(),affiliates=null}={}){
 const catalog=data.catalog;
 if(!Array.isArray(catalog?.plans))throw Error('Catalog missing');
 const year=catalogYear(catalog),prefix='';
 const canonical=BASE+BEST_HUB,ctx={data,affiliates,usedAffiliate:false};
 const h1='Best Phone Plans ('+year+'): Our Picks for Every Need';
 const description='Independent picks for the best cheap phone plans, unlimited plans, family plans and free phone deals, ranked by true 12-month cost.';
 const cards=SEO_GUIDES.map(g=>{
  let top='';
  if(g.kind==='phones'){
   const r=rankPhones(catalog.phones.filter(g.filter)).find(x=>!x.excluded);
   if(r)top='Top pick: '+r.phone.phone+' at '+r.phone.carrier+', about '+money(r.cost.year)+' first year';
  } else if(g.kind==='family'){
   const r=rankFamily(catalog.plans.filter(g.filter),data,today,4).find(x=>!x.held&&x.totals[4].known);
   if(r)top='Top pick: '+r.plan.carrier+' '+r.plan.plan+', '+money(r.totals[4].month)+'/mo for 4 lines';
  } else {
   const r=rankPlans(catalog.plans.filter(g.filter),data,today).find(x=>!x.held);
   if(r)top='Top pick: '+r.plan.carrier+' '+r.plan.plan+', '+(r.annual?money(r.upfront)+'/yr':money(r.monthly)+'/mo');
  }
  return [g,top];
 });
 const html=[head({title:h1,description,canonical,prefix,type:'website',schema:[
  {"@context":"https://schema.org","@type":"CollectionPage",name:h1,description,url:canonical,
   publisher:{"@type":"Organization",name:'Five Bars',url:BASE,logo:{"@type":"ImageObject",url:LOGO}}},
  breadcrumbs([['Home',BASE],['Best phone plans',canonical]]),
  {"@context":"https://schema.org","@type":"ItemList",itemListElement:SEO_GUIDES.map((g,i)=>({"@type":"ListItem",position:i+1,name:g.title,url:BASE+GUIDE_DIR+g.slug+'.html'}))}
 ]})];
 html.push('<main class="wrap guide-page" id="main" tabindex="-1"><p class="crumb"><a href="./">Home</a> / Best phone plans</p>');
 html.push('<h1>'+e(h1)+'</h1>'+byline(data,prefix)+DISCLOSURE_SLOT);
 html.push('<p class="lede">Every guide ranks plans by what you would actually pay over a year: the regular price, the upfront payment and the required plan, not the teaser rate. Pick the guide that matches what matters most to you.</p>');
 html.push('<section aria-labelledby="guides"><h2 id="guides">Guides</h2><div class="hub-grid">'+cards.map(([g,top])=>
  '<a class="hub-card" href="'+GUIDE_DIR+g.slug+'.html"><strong>'+e(g.title)+'</strong><span>'+e(top||g.description)+'</span></a>').join('')+'</div></section>');
 html.push('<section aria-labelledby="more"><h2 id="more">Other ways to compare</h2><ul class="link-grid">'+
  '<li><a href="'+CARRIER_HUB+'">Browse all '+catalogCarriers(catalog).length+' carriers</a></li>'+
  '<li><a href="carrier-comparisons.html">Head-to-head carrier comparisons</a></li>'+
  '<li><a href="./#finder">Personalized plan finder</a></li><li><a href="./#switch-save">Switch &amp; Save calculator</a></li>'+
  '<li><a href="satellite.html">Can your phone text by satellite?</a></li><li><a href="switching-guide.html">How to switch carriers safely</a></li></ul></section>');
 html.push(methodSection(prefix,'plans'));
 html.push('</main>');
 return finish(html.join(''),ctx,prefix);
}
export function renderCarrierHub(data,{today=localDay(),affiliates=null}={}){
 const catalog=data.catalog;
 if(!Array.isArray(catalog?.plans))throw Error('Catalog missing');
 const year=catalogYear(catalog),prefix='';
 const canonical=BASE+CARRIER_HUB,ctx={data,affiliates,usedAffiliate:false};
 const names=catalogCarriers(catalog);
 const h1='Phone Carriers & MVNOs Compared ('+year+')';
 const description='Every prepaid carrier and MVNO we track, grouped by network (Verizon, AT&T, T-Mobile), with starting prices, unlimited options and family pricing.';
 const info=names.map(name=>{
  const rows=rankPlans(catalog.plans.filter(p=>p.carrier===name),data,today);
  const live=rows.filter(r=>!r.held);
  const nets=[...new Set(rows.map(r=>r.plan.net))];
  return {name,nets,count:rows.length,from:live.length?Math.min(...live.map(r=>r.monthly)):null,
   unl:live.filter(r=>r.plan.unl).map(r=>r.monthly),family:rows.some(r=>r.plan.family)};
 });
 const groups=[['vzw','Verizon’s network'],['att','AT&T’s network'],['tmo','T-Mobile’s network'],['multi','Choose your network']];
 const html=[head({title:h1,description,canonical,prefix,type:'website',schema:[
  {"@context":"https://schema.org","@type":"CollectionPage",name:h1,description,url:canonical,
   publisher:{"@type":"Organization",name:'Five Bars',url:BASE,logo:{"@type":"ImageObject",url:LOGO}}},
  breadcrumbs([['Home',BASE],['Carriers',canonical]]),
  {"@context":"https://schema.org","@type":"ItemList",itemListElement:names.map((n,i)=>({"@type":"ListItem",position:i+1,name:n,url:BASE+CARRIER_DIR+carrierSlug(n)+'.html'}))}
 ]})];
 html.push('<main class="wrap guide-page" id="main" tabindex="-1"><p class="crumb"><a href="./">Home</a> / Carriers</p>');
 html.push('<h1>'+e(h1)+'</h1>'+byline(data,prefix)+DISCLOSURE_SLOT);
 html.push('<p class="lede">Most prepaid carriers (MVNOs) rent space on Verizon’s, AT&amp;T’s or T-Mobile’s towers, so the best value often comes from picking the network that works where you live, then the cheapest carrier on it. Start with your network below.</p>');
 for(const [net,label] of groups){
  const list=info.filter(c=>c.nets.includes(net));
  if(!list.length)continue;
  html.push('<section aria-labelledby="net-'+net+'"><h2 id="net-'+net+'">'+e(label)+'</h2><div class="hub-grid">'+list.map(c=>
   '<a class="hub-card" href="'+CARRIER_DIR+carrierSlug(c.name)+'.html"><strong>'+e(c.name)+'</strong><span>'+
   (c.from!==null?'From '+money(c.from)+'/mo':'Prices under review')+' · '+plural(c.count,'plan')+
   (c.unl.length?' · Unlimited from '+money(Math.min(...c.unl)):'')+(c.family?' · Family pricing':'')+'</span></a>').join('')+'</div></section>');
 }
 html.push('<section aria-labelledby="choose"><h2 id="choose">How to choose a carrier</h2><ol>'+
  '<li>Check which network is strongest at your home and work on the <a href="https://broadbandmap.fcc.gov/" target="_blank" rel="noopener noreferrer">FCC National Broadband Map</a>.</li>'+
  '<li>Estimate how much data you use, then compare <a href="'+GUIDE_DIR+'cheap-unlimited-plans.html">unlimited</a> and <a href="'+GUIDE_DIR+'low-data-plans.html">low-data</a> plans on that network.</li>'+
  '<li>Confirm your phone is unlocked and compatible with the carrier’s IMEI checker.</li>'+
  '<li>Follow our <a href="switching-guide.html">switching guide</a> to keep your number.</li></ol></section>');
 html.push('</main>');
 return finish(html.join(''),ctx,prefix);
}

// Everything the build writes, keyed by path relative to site/.
export function renderSeoPages(data,options={}){
 const pages={};
 pages[BEST_HUB]=renderBestHub(data,options);
 pages[CARRIER_HUB]=renderCarrierHub(data,options);
 for(const g of SEO_GUIDES)pages[GUIDE_DIR+g.slug+'.html']=renderSeoGuide(g,data,options);
 for(const name of catalogCarriers(data.catalog))pages[CARRIER_DIR+carrierSlug(name)+'.html']=renderCarrierPage(name,data,options);
 return pages;
}
