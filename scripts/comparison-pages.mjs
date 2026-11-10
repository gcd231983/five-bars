// Human-curated, deterministic static pages for useful carrier comparisons.
// Listings and status come from the repo; a generated page is NOT independent
// carrier checkout verification. No advertising SDKs, AI, tracking or scraping.
import {planCost,verificationState,localDay,validDay,pastEnd,usd} from '../site/value-core.mjs';
import {researchStatus} from './source-research.mjs';
import {seoPagePaths,carrierSlug} from './seo-guides.mjs';

const BASE='https://fivebars.info/';
const COLLISION=/^(?:javascript|data|file|ftp):/i;
export const GUIDES=[
  {
    slug:'us-mobile-vs-visible',left:'US Mobile',right:'Visible',
    title:'US Mobile vs Visible: plans, networks and real cash costs',
    description:'Compare listed US Mobile and Visible prices, plan features and estimated 12-month costs; review official terms before switching.',
    focus:'Network selection versus Verizon-based service',
    summary:'US Mobile offers multiple underlying network choices, while Visible advertises service on the Verizon network. That distinction matters if your current phone, neighborhood, or travel routes favor a particular carrier. Confirm the exact network available on each plan and device before signing up.',
    shopperNotes:[
      'Evaluate the regular monthly price separately from any new-line promotion. A low first-six-month offer does not necessarily continue for a full year.',
      'Check data priority, tethering limits, roaming, device compatibility and taxes on the exact carrier plan. A multi-network name does not guarantee every network or feature at the same price.',
      'For multiple lines, use the Five Bars finder or switching calculator with an explicitly recorded family rate; do not multiply an unverified per-line introductory promotion.'
    ],
    refs:[
      {label:'US Mobile published plans',url:'https://www.usmobile.com/plans'},
      {label:'US Mobile Broadband Facts labels',url:'https://www.usmobile.com/broadband-facts'},
      {label:'Visible official plan details',url:'https://www.visible.com/buy/plans'}
    ]
  },
  {
    slug:'tello-vs-mint-mobile',left:'Tello',right:'Mint Mobile',
    title:'Tello vs Mint Mobile: monthly service vs upfront costs',
    description:'Compare Tello and Mint Mobile catalog plans, introductory pricing, upfront payment structures and estimated first-year service costs.',
    focus:'Flexible monthly plans versus multi-month offers',
    summary:'These providers offer service using T-Mobile network infrastructure, but the payment schedule may matter as much as the advertised monthly figure. Tello publishes customizable monthly tiers; Mint promotes multi-month plans with potential upfront commitments. A low monthly equivalent is not necessarily a low initial bill.',
    shopperNotes:[
      'Ask Mint how many service months you must pay for upfront, including whether its advertised price is promotional or tied to a longer renewal term. The current Five Bars catalog may not capture all prepayment variations.',
      'Tello introductory rates may require a new line and have a short duration. Compare the ongoing rate after that introductory period.',
      'If you primarily need 2GB, 10GB or 20GB of high-speed data, compare the included allowance and slowdown policy instead of treating every unlimited label as the same service.'
    ],
    refs:[
      {label:'Tello official configurable plans',url:'https://tello.com/buy/custom_plans'},
      {label:'Mint Mobile official plans',url:'https://www.mintmobile.com/plans/'},
      {label:'Mint Mobile official multi-month promotion explanation',url:'https://www.mintmobile.com/help/what-is-mint-mobiles-switch-to-mint-and-get-3-6-or-12-months-of-premium-wireless-for-15-mo-any-plan-promotion/'}
    ]
  },
  {
    slug:'cricket-vs-h2o-wireless',left:'Cricket',right:'H2O Wireless',
    title:'Cricket vs H2O Wireless: AT&T-network plan comparison',
    description:'Explore cataloged Cricket and H2O Wireless options, AT&T network fit, annual prepay, and the true requirements of phone promotions.',
    focus:'AT&T-network options with different billing rules',
    summary:'Cricket and H2O Wireless are AT&T-network choices in this comparison. Some H2O catalog listings are annual prepaid plans, while Cricket may have phone discounts that require specific service plans. Do not combine a Cricket handset promotion with an unrelated low-cost H2O rate in a savings estimate.',
    shopperNotes:[
      'An annual prepaid rate represents an effective monthly equivalent, not the amount due each month. Check the full prepaid amount and renewal policy.',
      'Phone promotions may require a minimum number of months of service, a transfer of your number, a specific plan and an unlock waiting period. The device sticker price is not the total cost.',
      'H2O plan-directory pages have blocked the scheduled checker; some price headlines may come only from partial sources. An inaccessible page is neither a confirmed current price nor a confirmed increase.'
    ],
    refs:[
      {label:'Cricket official wireless plans',url:'https://www.cricketwireless.com/cell-phone-plans'},
      {label:'H2O Wireless official website',url:'https://www.h2owireless.com/'},
      {label:'FCC national coverage map',url:'https://broadbandmap.fcc.gov/'}
    ]
  },
  {
    slug:'visible-vs-total-wireless',left:'Visible',right:'Total Wireless',
    title:'Visible vs Total Wireless: Verizon-network costs',
    description:'Explore regular service prices, hotspot language, family-rate caveats and partial source checks for Visible and Total Wireless.',
    focus:'Verizon-network service with different pricing and plan rules',
    summary:'Visible and Total Wireless appear as Verizon-network options in the Five Bars catalog. The comparison that matters depends on the number of lines, hotspot limits and any restricted bring-your-own-phone or new-line deal. Published monthly prices should be considered separately from promotion eligibility.',
    shopperNotes:[
      'Visible may advertise temporary discount codes; compare the underlying regular price and confirm expiration, taxes and eligibility on the official page.',
      'Some Total Wireless catalog rates are tied to bring-your-own-phone promotions or multi-line conditions. Verify whether the offer applies to one line before comparing totals.',
      'Hotspot speed limits and priority-data rules can vary even when two plans use the same underlying network. Read each carrier plan disclosure.'
    ],
    refs:[
      {label:'Visible official plan prices and labels',url:'https://www.visible.com/buy/plans'},
      {label:'Total Wireless official plans',url:'https://www.totalwireless.com/plans'},
      {label:'FCC national coverage map',url:'https://broadbandmap.fcc.gov/'}
    ]
  }
];

export function escapeHtml(value){
 return String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[c]);
}
export function safeHttps(value){
 try {
  if(typeof value!=='string'||COLLISION.test(value)||value.length>1800)return null;
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  return url.href;
 }catch{return null;}
}
const a=(url,text)=>safeHttps(url)?'<a href="'+escapeHtml(safeHttps(url))+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(text)+'</a>':'Official link unavailable';
function compareLink(id){return BASE+'?switch=plan%3A'+encodeURIComponent(id)+'#switch-save';}
export function statusFor(plan,{ledger,status,mvnoEvidence,research},today){
 const checked=verificationState(plan,ledger?.offers?.[plan.id],today);
 const raw=mvnoEvidence?.offers?.[plan.id]?.state;
 const flagged=status?.offers?.[plan.id];
 const source=research?.records?.[plan.id];
 const sourceState=researchStatus(plan,source,{today});
 const proof=['headline_mismatch','ambiguous','unresolved_mismatch'].includes(raw);
 // An actual documented source conflict supersedes pricing claims, including
 // a previous manual sign-off if source facts now contradict catalog price.
 const hold=proof||['headline_mismatch','ambiguous','unresolved_mismatch'].includes(flagged?.mvnoPriceEvidenceState)||
   ['conflict','invalid'].includes(sourceState.state);
 let detail='Not independently verified';
 if(checked.status==='verified')detail='Human checkout scenario reviewed: '+checked.verifiedAt+' (not universally applicable)';
 else if(checked.status==='stale')detail='Full-terms review expired';
 else if(checked.status==='changed')detail='Terms changed since manual review';
 if(raw==='headline_matched')detail+='; partial official rate matched';
 else if(raw==='source_unavailable')detail+='; official rate source unavailable';
 else if(raw==='not_found')detail+='; rate could not be confirmed by scanner';
 if(sourceState.state==='published_match')detail+='; official published baseline documented '+source.observedOn+' (not checkout)';
 else if(sourceState.state==='aged')detail+='; published source research is old, reconfirm before purchase';
 else if(sourceState.state==='conflict'||sourceState.state==='invalid')
   detail+='; dated official source evidence conflicts or is invalid';
 else if(!source)detail+='; no documented plan-price research for this offer';
 return {hold,detail,verified:checked.status==='verified'};
}
function planSummary(plan,data,today){
 const info=statusFor(plan,data,today);
 const annual=plan.billingMonths===12;
 const validAnnual=!annual||(Number.isFinite(plan.billingUpfront)&&plan.billingUpfront>0);
 const cost=!info.hold&&validAnnual?planCost({...plan,promo:null},1,{today,cannotPort:true}):null;
 const rate=cost?(annual?usd(plan.billingUpfront)+' paid annually ('+usd(plan.price)+'/mo equivalent)':usd(plan.price)+'/mo catalog regular'):'Price requires review';
 const year=cost?usd(cost.year):'Withheld';
 const caution=annual?'Annual prepaid; confirm actual renewal terms':plan.promo?
  'Intro offer excluded from this baseline':'Standard rate baseline; taxes may differ';
 const more=plan.hot?'Hotspot: '+String(plan.hot):'Hotspot detail not confirmed in catalog';
 const dataAllowance=plan.data?'Data: '+String(plan.data):'Data limits and priority: check carrier terms';
 return {info,rate,year,caution,more,dataAllowance,link:compareLink(plan.id)};
}
function breadcrumbJsonLd(canonical,title){
 const parts=[{"@type":"ListItem",position:1,name:"Home",item:BASE}];
 if(canonical.includes('/compare/'))parts.push({"@type":"ListItem",position:2,name:"Carrier comparisons",item:BASE+"carrier-comparisons.html"});
 parts.push({"@type":"ListItem",position:parts.length+1,name:title,item:canonical});
 return '<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:parts}).replace(/</g,'\\u003c')+'</script>';
}
function pageStart({title,description,canonical}){
 const safeTitle=escapeHtml(title),safeDescription=escapeHtml(description),url=escapeHtml(canonical);
 return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="index,follow">'+
  '<meta name="description" content="'+safeDescription+'">'+
  '<meta property="og:type" content="article"><meta property="og:title" content="'+safeTitle+'">'+
  '<meta property="og:description" content="'+safeDescription+'">'+
  '<meta property="og:url" content="'+url+'"><link rel="canonical" href="'+url+'">'+
  '<meta property="og:site_name" content="Five Bars"><meta property="og:image" content="'+BASE+'og-card.jpg">'+
  '<meta name="twitter:card" content="summary_large_image">'+
  '<title>'+safeTitle+' | Five Bars</title>'+
  breadcrumbJsonLd(canonical,title)+
  '<link rel="stylesheet" href="'+(canonical.includes('/compare/')?'../':'')+'comparison-styles.css">'+
  '</head><body><header class="wrap"><nav aria-label="Navigation"><a href="'+(canonical.includes('/compare/')?'../':'./')+'">Five Bars home</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'best-phone-plans.html">Best plans</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'carriers.html">Carriers</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'#switch-save">Switch &amp; Save</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'satellite.html">Can your phone text by satellite?</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'editorial.html">Editorial standards</a>'+
  '<a href="'+(canonical.includes('/compare/')?'../':'./')+'disclosures.html">Disclosures</a></nav></header>';
}
function pageEnd({nested=false}={}){
 const prefix=nested?'../':'./';
 return '<footer class="wrap"><p>Five Bars is an independent informational comparison, not a wireless carrier. No affiliate commissions or paid placement are recorded for these links. Rates, availability and eligibility must be confirmed with each carrier.</p>'+
   '<nav><a href="'+prefix+'privacy.html">Privacy</a><a href="'+prefix+'editorial.html">Methodology</a>'+
   '<a href="'+prefix+'disclosures.html">Commercial disclosures</a><a href="'+prefix+'switching-guide.html">Switching safely</a>'+
   '<a href="'+prefix+'carrier-comparisons.html">All comparisons</a>'+
   '<a href="'+prefix+'source-research.html">Official-source audit</a>'+
   '<a href="'+prefix+'report.html">Report a correction</a></nav></footer></body></html>\n';
}
function dates(data){
 const checked=validDay(data.catalog?.checked)?data.catalog.checked:'Unknown';
 const scan=typeof data.status?.generatedAt==='string'&&Number.isFinite(Date.parse(data.status.generatedAt))?
  data.status.generatedAt.slice(0,10):'Unavailable';
 return {checked,scan};
}
export function renderGuide(guide,data,{today=localDay()}={}){
 if(!GUIDES.some(g=>g.slug===guide?.slug))throw Error('Comparison guide must be curated');
 const {catalog,status}=data;
 if(!Array.isArray(catalog?.plans)||!Array.isArray(catalog?.phones))
  throw Error('Catalog plan data is missing');
 const providers=[guide.left,guide.right];
 const date=dates(data), rowsByProvider={};
 for(const carrier of providers){
  const records=catalog.plans.filter(p=>p.carrier===carrier);
  if(!records.length)throw Error('No catalog plans for curated provider '+carrier);
  rowsByProvider[carrier]=records.sort((x,y)=>x.price-y.price||x.id.localeCompare(y.id));
 }
 const html=[pageStart({title:guide.title,description:guide.description,
  canonical:BASE+'compare/'+guide.slug+'.html'})];
 html.push('<main class="wrap"><p class="crumb"><a href="../carrier-comparisons.html">Carrier comparisons</a> / '+escapeHtml(guide.left)+' vs '+escapeHtml(guide.right)+'</p>');
 html.push('<h1>'+escapeHtml(guide.title)+'</h1>');
 html.push('<p class="lede">'+escapeHtml(guide.summary)+'</p>');
 html.push('<div class="caution" role="note"><strong>Catalog comparison — not verified checkout pricing.</strong> Catalog reference date: '+
  escapeHtml(date.checked)+'. Last automated source check: '+escapeHtml(date.scan)+
  '. A reachable link does not prove terms; most listed offers have not received a recent documented full review. Check each carrier before purchase.</div>');
 html.push('<section><h2>What to compare first</h2><p>'+escapeHtml(guide.focus)+'</p><ol>');
 for(const note of guide.shopperNotes)html.push('<li>'+escapeHtml(note)+'</li>');
 html.push('</ol></section>');
 html.push('<section><h2>Single-line standard-rate snapshots</h2><p>This is one line at the cataloged <strong>regular</strong> price (not promotional pricing). Taxes and unknown fees are excluded. No price here is a guaranteed live quote. Family discounts, incentives and final checkout are not presumed.</p>');
 for(const provider of providers){
  html.push('<h3><a href="../carriers/'+carrierSlug(provider)+'.html">'+escapeHtml(provider)+'</a></h3><div class="table-scroll"><table aria-label="'+escapeHtml(provider)+' plans">'+
    '<thead><tr><th scope="col">Catalog offer</th><th scope="col">Baseline pricing</th><th scope="col">12-month baseline</th><th scope="col">Evidence and requirements</th><th scope="col">Next step</th></tr></thead><tbody>');
  for(const plan of rowsByProvider[provider]){
   const x=planSummary(plan,data,today),rowClass=x.info.hold?' class="needs-review"':'';
   html.push('<tr'+rowClass+'><th scope="row">'+escapeHtml(plan.plan)+
    '</th><td>'+escapeHtml(x.rate)+'</td><td>'+escapeHtml(x.year)+
    '</td><td><strong>'+escapeHtml(x.info.detail)+'</strong><div>'+escapeHtml(x.caution)+'</div><div>'+
    escapeHtml(x.dataAllowance)+'</div><div>'+escapeHtml(x.more)+'</div></td><td>'+
    a(plan.url,'Official carrier terms')+'<span class="sep"> · </span>'+a(x.link,'Try Switch & Save')+
    '<span class="sep"> · </span><a href="../report.html?offer='+encodeURIComponent(plan.id)+'">Report an issue</a>'+
    '</td></tr>');
  }
  html.push('</tbody></table></div>');
 }
 html.push('</section>');
 html.push('<section><h2>Official references and what remains unconfirmed</h2><p>These are carrier-published reference pages; listing them is not evidence of a completed checkout or exhaustive review. Consult the applicable broadband consumer labels, specific plan and device compatibility checker.</p><ul>');
 for(const ref of guide.refs)html.push('<li>'+a(ref.url,ref.label)+'</li>');
 html.push('</ul></section><section><h2>Calculate your actual household difference</h2><p>The regular-price snapshot cannot know your current bill, number of lines, phone payoff, annual prepayment, eligibility, or tax rate. Use the interactive calculator for a more relevant estimate; it still requires carrier-side confirmation.</p><p><a class="cta" href="../#switch-save">Open Switch &amp; Save calculator</a></p></section>');
 html.push('<section><h2>Other carrier comparisons</h2><ul>');
 for(const other of GUIDES.filter(g=>g.slug!==guide.slug)){
  html.push('<li><a href="'+escapeHtml(other.slug)+'.html">'+escapeHtml(other.left+' vs '+other.right)+'</a></li>');
 }
 html.push('</ul></section></main>');
 html.push(pageEnd({nested:true}));
 return html.join('');
}
export function renderHub(data){
 if(!Array.isArray(data?.catalog?.plans))throw Error('Catalog missing');
 const date=dates(data);
 const html=[pageStart({title:'Compare phone carriers — plans and realistic costs',
 description:'Editorial wireless provider comparisons with catalog-rate snapshots, payment caveats and official source links.',
 canonical:BASE+'carrier-comparisons.html'})];
 html.push('<main class="wrap"><h1>Compare wireless carriers</h1><p class="lede">Plan price matters, but so do network fit, upfront payment, hotspot limits, eligibility and renewal costs. These guides use the Five Bars catalog as an <strong>unverified starting point</strong>, not a sales pitch or guaranteed carrier quote.</p>');
 html.push('<div class="caution" role="note">Catalog reference date: '+escapeHtml(date.checked)+
  '. Last automated source check: '+escapeHtml(date.scan)+
  '. Source checks are partial and do not establish full offer eligibility. Always open the carrier terms.</div>');
 html.push('<section><h2>Choose a comparison</h2><div class="guides">');
 for(const guide of GUIDES)html.push('<article class="guide"><h3><a href="compare/'+escapeHtml(guide.slug)+'.html">'+escapeHtml(guide.left+' vs '+guide.right)+'</a></h3>'+
  '<p>'+escapeHtml(guide.focus)+'</p><p>'+escapeHtml(guide.description)+'</p></article>');
 html.push('</div></section>');
 html.push('<section><h2>More ways to compare</h2><p>See every carrier we track on the <a href="carriers.html">carrier directory</a>, or jump to our <a href="best-phone-plans.html">best phone plan guides</a>, ranked by estimated 12-month cost.</p></section>');
 html.push('<section><h2>How to use these pages</h2><ol>'+
  '<li>Choose carriers that can support your phone and coverage requirements.</li>'+
  '<li>Read the standard catalog rates and the amount required upfront for annual plans.</li>'+
  '<li>Use Switch &amp; Save to estimate your own 12-, 24-, or 36-month cost, including payoff and expenses.</li>'+
  '<li>Check plan disclosures, taxes, hotspot and every promotional condition on the carrier website before ordering.</li></ol></section>');
 html.push('</main>');html.push(pageEnd());
 return html.join('');
}
export function renderSitemap(data){
 const day=validDay(data?.catalog?.checked)?data.catalog.checked:'2026-10-29';
 // Internal evidence/audit pages (source-research, launch-readiness) stay
 // public but are noindex, so they are intentionally left out of the sitemap.
 const urls=['','about.html','contact.html','editorial.html','privacy.html','disclosures.html','switching-guide.html',
  'carrier-comparisons.html','phone-deals.html','satellite.html','report.html',...GUIDES.map(g=>'compare/'+g.slug+'.html'),
  ...seoPagePaths(data?.catalog)];
 const xmlEscape=escapeHtml;
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  urls.map(path=>'  <url><loc>'+xmlEscape(BASE+path)+'</loc><lastmod>'+day+'</lastmod></url>').join('\n')+
  '\n</urlset>\n';
}
