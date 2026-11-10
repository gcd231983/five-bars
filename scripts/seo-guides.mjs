// Editorial definitions for the static "best of" guides and carrier pages.
// Pure data and small helpers only (no imports) so the sitemap generator can
// use the page list without loading the renderer. Rankings are computed from
// site/data/deals.json at build time; nothing here hard-codes a price.

export const GUIDE_DIR='best/';
export const CARRIER_DIR='carriers/';
export const BEST_HUB='best-phone-plans.html';
export const CARRIER_HUB='carriers.html';

export function carrierSlug(name){
 return String(name||'').toLowerCase().replace(/&/g,' and ').replace(/\+/g,' plus ')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
export function catalogYear(catalog){
 const day=String(catalog?.checked||'');
 return /^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(0,4):'2026';
}
// Carriers with at least one tracked service plan get a page, in stable order.
export function catalogCarriers(catalog){
 const names=new Set((catalog?.plans||[]).map(p=>p.carrier).filter(Boolean));
 return [...names].sort((a,b)=>a.localeCompare(b,'en'));
}
export function seoPagePaths(catalog){
 return [BEST_HUB,CARRIER_HUB,
  ...SEO_GUIDES.map(g=>GUIDE_DIR+g.slug+'.html'),
  ...catalogCarriers(catalog).map(c=>CARRIER_DIR+carrierSlug(c)+'.html')];
}

// Only well-established ownership facts. Everything else on a carrier page is
// derived from the catalog so it updates with the data.
export const CARRIER_NOTES={
 'Visible':'Visible is an app-based prepaid carrier owned by Verizon.',
 'Total Wireless':'Total Wireless is a prepaid brand owned by Verizon.',
 'Straight Talk':'Straight Talk is a prepaid brand owned by Verizon and sold widely at Walmart.',
 'Tracfone':'Tracfone is a prepaid brand owned by Verizon.',
 'Cricket':'Cricket Wireless is AT&T’s own prepaid brand.',
 'Metro by T-Mobile':'Metro by T-Mobile is T-Mobile’s own prepaid brand.',
 'Mint Mobile':'Mint Mobile is a prepaid carrier owned by T-Mobile, best known for selling service in multi-month packages.',
 'Ultra Mobile':'Ultra Mobile is a prepaid carrier owned by T-Mobile that is popular for international calling.',
 'Google Fi':'Google Fi is Google’s own wireless service.',
 'US Mobile':'US Mobile is an independent prepaid carrier that lets you choose which major network your line runs on.',
 'Consumer Cellular':'Consumer Cellular is a no-contract carrier that is popular with older adults.',
 'Red Pocket Mobile':'Red Pocket Mobile is a prepaid carrier that sells plans on more than one major network.'
};

const unl=p=>p.unl===true;
const always=()=>true;
export const SEO_GUIDES=[
 {
  slug:'cheap-phone-plans',kind:'plans',short:'Cheap phone plans',
  title:'Best Cheap Phone Plans',titleTail:'Ranked by True 12-Month Cost',
  description:'The cheapest phone plans we track, ranked by real 12-month cost instead of teaser prices, with intro deals and fine print shown separately.',
  filter:always,
  picks:[
   {label:'Lowest 12-month cost',test:always},
   {label:'Cheapest unlimited',test:unl},
   {label:'Cheapest on Verizon’s network',test:p=>p.net==='vzw'},
   {label:'Cheapest with premium data',test:p=>p.pri===true}
  ],
  intro:'The cheapest phone plan is the one that costs least over a full year, not the one with the lowest teaser price. We rank every plan we track by its estimated 12-month cost at the regular single-line rate, then show any intro deal separately so you can see what you will pay once it ends.',
  tips:[
   'Know your data use before you shop. On an iPhone, open Settings → Cellular; on Android, look under Settings → Network → Data usage. If you use under 5GB a month, a small-data plan can cost half as much as unlimited.',
   'Prepaid carriers (often called MVNOs) run on Verizon, AT&T or T-Mobile towers, so coverage is the same network. The usual trade-off is that your data can slow down first when a tower is busy.',
   'Budget for the regular price, not the intro price. Many deals last 3–6 months and require a new line or a number transfer.',
   'Paying a year upfront can be the cheapest option per month, but you lose flexibility if the service doesn’t work well where you live.'
  ],
  faq:[
   ['Are cheap prepaid plans as good as Verizon, AT&T or T-Mobile?','They use the same towers, so coverage is usually identical. The differences are data priority when a tower is congested, mostly online customer service, and fewer perks such as streaming bundles or in-store help. For most people the savings outweigh those trade-offs.'],
   ['Do these prices include taxes and fees?','It depends on the carrier. Some include taxes and regulatory fees in the advertised price; others add them at checkout. Each listing below says which.']
  ]
 },
 {
  slug:'cheap-unlimited-plans',kind:'plans',short:'Cheap unlimited plans',
  title:'Best Cheap Unlimited Data Plans',titleTail:'True Yearly Cost',
  description:'Cheapest unlimited data plans on Verizon, AT&T and T-Mobile networks, ranked by 12-month cost, with high-speed caps, hotspot and priority rules explained.',
  filter:unl,
  picks:[
   {label:'Cheapest unlimited',test:always},
   {label:'Best with premium data',test:p=>p.pri===true},
   {label:'Cheapest on Verizon’s network',test:p=>p.net==='vzw'},
   {label:'Cheapest on AT&T’s network',test:p=>p.net==='att'},
   {label:'Cheapest on T-Mobile’s network',test:p=>p.net==='tmo'}
  ],
  intro:'Unlimited plans from prepaid carriers now cost a fraction of what the big three charge. But “unlimited” rarely means unlimited full-speed data. Many plans slow you down after a high-speed allowance, cap or block hotspot use, or put your data behind other customers when the network is busy. Here is what each plan really includes and costs over a year.',
  tips:[
   'Look for the high-speed allowance in the plan name or fine print (for example “30GB high-speed”). Past that point, speeds drop sharply for the rest of the month.',
   'Premium (priority) data matters if you live or work somewhere crowded, like a downtown, stadium or campus. Elsewhere, standard data is usually fine.',
   'Check hotspot rules separately. Some unlimited plans include no hotspot at all; others limit it to 5 Mbps.',
   'Cheaper unlimited plans usually stream video in standard definition (about 480p) to save data.'
  ],
  faq:[
   ['Is unlimited data really unlimited?','You won’t be cut off or charged overage, but most prepaid unlimited plans have a high-speed allowance or lower priority. After the allowance, speeds can drop to levels that are fine for messages and email but slow for video.'],
   ['What is deprioritization?','When a cell tower is congested, the carrier serves its premium customers first. Deprioritized data keeps working but may be slower until the congestion clears. Plans with premium data are exempt, usually up to a monthly limit.']
  ]
 },
 {
  slug:'family-phone-plans',kind:'family',short:'Family phone plans',
  title:'Best Cheap Family Phone Plans',titleTail:'2 to 4 Lines Compared',
  description:'Cheap family and multi-line phone plans compared by total monthly bill for 2, 3 and 4 lines. Published family discounts only; estimates are clearly marked.',
  filter:p=>!(p.billingMonths===12)&&!(Number.isFinite(p.maxLines)&&p.maxLines<2),
  picks:[
   {label:'Lowest total for 4 lines',test:always,lines:4},
   {label:'Lowest total for 2 lines',test:always,lines:2},
   {label:'Best family plan with premium data',test:p=>p.pri===true,lines:4},
   {label:'Cheapest unlimited for 4 lines',test:unl,lines:4}
  ],
  intro:'Family pricing on prepaid carriers works in two ways. Some carriers lower the per-line price as you add lines; most simply charge the single-line price for each line. We show both, and we never assume a family discount the carrier hasn’t published. Totals marked with ≈ are the single-line price multiplied by the number of lines.',
  tips:[
   'Compare the total monthly bill for your exact number of lines. The per-line price in ads usually assumes four or more lines.',
   'You don’t have to put everyone on the same carrier. A heavy-data user and a light user can each have the plan that fits them.',
   'Check whether an intro deal applies to every line or only the first one.',
   'Kids and relatives who are mostly on Wi-Fi may do fine on a low-data plan, which costs far less than unlimited.'
  ],
  faq:[
   ['Do I need the same plan for every line?','It depends on the carrier. Some let each line pick its own plan; others require one plan for the whole account. If a carrier won’t mix plans, separate accounts, even at different carriers, can still come out cheaper.'],
   ['Can I keep everyone’s phone numbers when we switch?','Yes. Federal number-portability rules let you move each number to the new carrier. Keep the old service active until every line has transferred.']
  ]
 },
 {
  slug:'verizon-network-plans',kind:'plans',short:'Plans on Verizon’s network',net:'vzw',
  title:'Best Cheap Plans on Verizon’s Network',titleTail:'Prepaid & MVNO',
  description:'Get Verizon coverage for less. Prepaid and MVNO plans on Verizon’s network ranked by 12-month cost, including {carriers}.',
  filter:p=>p.net==='vzw',
  picks:[
   {label:'Lowest 12-month cost',test:always},
   {label:'Cheapest unlimited',test:unl},
   {label:'Best with premium data',test:p=>p.pri===true}
  ],
  intro:'These carriers run on Verizon’s network, so if Verizon has the best signal at your home and work, you can usually get the same coverage for much less. Several of them are owned by Verizon itself.',
  tips:[
   'Check coverage for your address on the FCC National Broadband Map and on the carrier’s own map before switching.',
   'Make sure your phone is unlocked and compatible. Every carrier has an IMEI checker on its website.',
   'Prepaid lines can get lower priority than Verizon’s premium postpaid customers when towers are busy, unless the plan includes premium data.'
  ],
  faq:[
   ['Do Verizon MVNOs get the same coverage as Verizon?','They use the same towers, so the coverage map is generally the same. Speeds can differ when the network is congested, and some features (like certain roaming or 5G bands) can vary by plan.']
  ]
 },
 {
  slug:'att-network-plans',kind:'plans',short:'Plans on AT&T’s network',net:'att',
  title:'Best Cheap Plans on AT&T’s Network',titleTail:'Prepaid & MVNO',
  description:'Get AT&T coverage for less. Prepaid and MVNO plans on AT&T’s network ranked by 12-month cost, including {carriers}.',
  filter:p=>p.net==='att',
  picks:[
   {label:'Lowest 12-month cost',test:always},
   {label:'Cheapest unlimited',test:unl},
   {label:'Best for light users',test:p=>p.unl!==true}
  ],
  intro:'These carriers run on AT&T’s network. If AT&T is strongest where you live and work, one of these prepaid options can give you similar coverage for much less. Cricket is AT&T’s own prepaid brand.',
  tips:[
   'Check coverage for your address on the FCC National Broadband Map and on the carrier’s own map before switching.',
   'Confirm your phone is unlocked and supports AT&T’s network bands. Use the carrier’s IMEI checker.',
   'Annual plans on AT&T’s network can be very cheap per month, but you pay the whole year upfront.'
  ],
  faq:[
   ['Do AT&T prepaid carriers get the same coverage as AT&T?','They use AT&T’s towers, so coverage is generally the same. Data speeds may be lower when the network is congested.']
  ]
 },
 {
  slug:'t-mobile-network-plans',kind:'plans',short:'Plans on T-Mobile’s network',net:'tmo',
  title:'Best Cheap Plans on T-Mobile’s Network',titleTail:'Prepaid & MVNO',
  description:'Get T-Mobile coverage for less. Prepaid and MVNO plans on T-Mobile’s network ranked by 12-month cost, including {carriers}.',
  filter:p=>p.net==='tmo',
  picks:[
   {label:'Lowest 12-month cost',test:always},
   {label:'Cheapest unlimited',test:unl},
   {label:'Best for light users',test:p=>p.unl!==true}
  ],
  intro:'These carriers run on T-Mobile’s network. If T-Mobile works well where you live and work, these plans can cut your bill sharply. Mint Mobile, Metro and Ultra Mobile are owned by T-Mobile itself.',
  tips:[
   'Check coverage for your address on the FCC National Broadband Map and on the carrier’s own map, especially indoors and in rural areas.',
   'Most unlocked phones work on T-Mobile’s network, but confirm with the carrier’s IMEI checker.',
   'Several T-Mobile-network carriers sell discounted multi-month packages. Compare the renewal price, not just the first term.'
  ],
  faq:[
   ['Do T-Mobile MVNOs get the same coverage as T-Mobile?','They use T-Mobile’s towers, so coverage is generally the same. Data may be slower during congestion, and some plans limit hotspot or video quality.']
  ]
 },
 {
  slug:'premium-data-plans',kind:'plans',short:'Plans with premium data',
  title:'Best Cheap Plans With Premium (Priority) Data',titleTail:'',
  description:'Prepaid plans that keep full speed when towers are busy. Premium and priority data plans ranked by 12-month cost, with caps and hotspot rules.',
  filter:p=>p.pri===true,
  picks:[
   {label:'Cheapest premium data',test:always},
   {label:'Cheapest on Verizon’s network',test:p=>p.net==='vzw'},
   {label:'Best for heavy hotspot use',test:p=>/unlimited hotspot|premium unlimited hotspot|50GB|100GB/i.test(String(p.hot||''))}
  ],
  intro:'When a tower gets busy, carriers decide whose data goes first. Most cheap plans are deprioritized: they slow down before the carrier’s own premium customers. Plans with premium (priority) data keep full speed during congestion, which matters in cities, at stadiums and on campuses.',
  tips:[
   'Premium data often has a monthly limit (for example 50GB or 100GB). After that, the line is deprioritized like a standard plan.',
   'If you rarely notice slowdowns today, you probably don’t need to pay extra for priority.',
   'Premium plans often bundle more hotspot data, which can make them worth it for remote workers.'
  ],
  faq:[
   ['What is the difference between premium and standard data?','Premium (priority) data gets the same treatment as the carrier’s top postpaid customers when a tower is congested. Standard data can be slowed first. When the network isn’t busy, both run at the same speed.']
  ]
 },
 {
  slug:'hotspot-plans',kind:'plans',short:'Plans with hotspot',
  title:'Best Cheap Phone Plans With Hotspot',titleTail:'Allowances Compared',
  description:'Cheap phone plans that include mobile hotspot, ranked by 12-month cost, with each plan’s hotspot allowance and speed limit spelled out.',
  filter:p=>!!p.hot&&!/^none$/i.test(String(p.hot).trim()),
  picks:[
   {label:'Cheapest with hotspot',test:always},
   {label:'Cheapest unlimited with hotspot',test:unl},
   {label:'Most generous hotspot',test:p=>/unlimited hotspot|premium unlimited hotspot|100GB|50GB/i.test(String(p.hot||''))}
  ],
  intro:'If you use your phone as a hotspot for a laptop or tablet, the hotspot allowance matters more than the “unlimited” label. Some plans include none, some cap it at 5 Mbps, and a few allow 50GB or more at full speed. Every plan below includes some hotspot; read the allowance column closely.',
  tips:[
   '5 Mbps handles email, browsing and a standard-quality video call, but it is slow for large downloads.',
   'Hotspot use often counts toward your high-speed data allowance.',
   'For daily laptop work on cellular, a plan with a large full-speed hotspot allowance is worth paying a little more for.'
  ],
  faq:[
   ['How much hotspot data do I need?','Light laptop use (email, documents, browsing) can fit in 5–10GB a month. Video calls use roughly 0.5–1.5GB per hour, and streaming in HD uses more, so remote workers should look for 30GB or more.']
  ]
 },
 {
  slug:'low-data-plans',kind:'plans',short:'Low-data plans',
  title:'Best Cheap Low-Data Phone Plans',titleTail:'For Light Users',
  description:'Mostly on Wi-Fi? Low-data phone plans from 1GB to 20GB ranked by true 12-month cost. Good for seniors, kids, backup lines and light users.',
  filter:p=>p.unl!==true,
  picks:[
   {label:'Lowest 12-month cost',test:always},
   {label:'Best monthly (no annual prepay)',test:p=>p.billingMonths!==12},
   {label:'Most data for the money',test:p=>/^(1[0-9]|20)GB$/i.test(String(p.data||''))}
  ],
  intro:'If you are mostly on Wi-Fi at home, at work or in retirement, paying for unlimited data wastes money. Small-data plans give you a few gigabytes for basic use at a much lower price. These are good fits for seniors, a child’s first phone, a backup line or a second number.',
  tips:[
   'Look at your last three months of data use and add a buffer.',
   'Check what happens when you run out. Some plans slow you down; others stop data until you add more.',
   'Turn on Wi-Fi calling and set apps to update only on Wi-Fi to stretch a small plan.'
  ],
  faq:[
   ['Is 5GB of data enough?','For many people who are on Wi-Fi at home and at work, yes: 5GB covers maps, messaging, email and some music. Streaming video over cellular uses roughly 0.7–1GB per hour in standard quality, so heavy video users should size up.']
  ]
 },
 {
  slug:'annual-phone-plans',kind:'plans',short:'Annual prepaid plans',
  title:'Best Annual Prepaid Phone Plans',titleTail:'Pay Once, Save All Year',
  description:'Prepaid phone plans you pay for once a year, ranked by total cost. See the upfront payment, monthly equivalent and renewal fine print.',
  filter:p=>p.billingMonths===12,
  picks:[
   {label:'Lowest yearly cost',test:always},
   {label:'Cheapest annual unlimited',test:unl}
  ],
  intro:'Paying for 12 months upfront is often the cheapest way to get phone service. The catch is that you pay it all at once and usually can’t get a refund if you switch away. These are the annual plans we track, with the full upfront amount shown.',
  tips:[
   'If the carrier sells a monthly version, try it for a month first to make sure coverage works for you.',
   'Set a reminder before renewal. The renewal price and terms may change.',
   'Make sure your phone is unlocked and works on the carrier’s network before you commit for a year.'
  ],
  faq:[
   ['Can I get a refund on an annual phone plan?','Usually not. Most annual prepaid plans are non-refundable once activated. Check the carrier’s terms before buying.']
  ]
 },
 {
  slug:'free-phone-deals',kind:'phones',short:'Free phone deals',
  title:'Free Phone Deals When You Switch',titleTail:'$0 Phones, Real Cost',
  description:'$0 phone offers from prepaid carriers ranked by what you actually pay in the first year, including the required plan, number transfer and unlock rules.',
  filter:p=>Number(p.price)===0,
  intro:'A “free” phone almost always comes with strings attached. You usually have to transfer your number from another carrier, buy a specific plan and keep it for a while before the phone unlocks. We rank $0 phone offers by what you would actually spend in the first year, including the required plan.',
  tips:[
   'The phone is usually locked to the carrier for a set period, often 60 days to 12 months.',
   'The required plan is often a pricier unlimited tier. Compare against buying an unlocked phone and choosing a cheaper plan.',
   'Online, in-store and retailer prices can differ, and activation fees may apply.'
  ],
  faq:[
   ['Are free phones really free?','The device price can be $0, but you must buy service to get it, usually on a specific plan and often with a number transfer. The real cost is the plan you’re required to keep, which is why we rank by first-year cost.']
  ]
 },
 {
  slug:'iphone-deals',kind:'phones',short:'Prepaid iPhone deals',
  title:'Best Prepaid iPhone Deals',titleTail:'First-Year Cost Compared',
  description:'Prepaid iPhone deals ranked by estimated first-year cost: device price plus the required plan, with transfer, new-line and unlock requirements explained.',
  filter:p=>p.os==='iphone',
  intro:'Prepaid carriers discount iPhones to win new customers, but what you really pay depends on the required plan and how long you must keep it. Here are the iPhone offers we track, ranked by estimated first-year cost.',
  tips:[
   'Check whether the deal requires a number transfer, a new line or a specific unlimited plan.',
   'Carrier-discounted iPhones are usually locked for a period. If you travel abroad or plan to switch soon, an unlocked iPhone may be worth the higher upfront price.',
   'Postpaid “free iPhone” deals are paid out as monthly bill credits over two or three years. They are not comparable to prepaid prices, so we list them separately.'
  ],
  faq:[
   ['Is it cheaper to buy an iPhone from a prepaid carrier?','Often, if you were going to switch anyway and the required plan fits your needs. If the required plan costs more than you would otherwise pay, an unlocked iPhone and a cheaper plan can come out ahead within a year.']
  ]
 }
];
