#!/usr/bin/env node
// Diagnoses access to *public official* carrier landing pages only.
// Does not evade HTTP 403, solve challenges, request private endpoints,
// attempt multiple identities, or alter site data.
// Usage: node scripts/probe-official-sources.mjs
const candidates=[
  ['Red Pocket www plan page','https://www.redpocket.com/plans'],
  ['Red Pocket legacy plan page','https://my.redpocket.com/plans'],
  ['Tello plans','https://tello.com/buy/custom_plans'],
  ['Tello help center','https://tello.com/help_center/plans-pricing/what-plans-does-tello-offer'],
  ['H2O plans','https://www.h2owireless.com/plan/monthly'],
  ['H2O homepage','https://www.h2owireless.com/'],
];
for (const [name,url] of candidates){
  const result={name,url};
  try{
    const response=await fetch(url,{redirect:'follow',
      signal:AbortSignal.timeout(8000),
      headers:{'user-agent':'FiveBarsDealMonitor/2.0 (+https://github.com/gcd231983/five-bars)',
       'accept':'text/html,application/xhtml+xml,text/plain;q=0.9'}});
    const target=new URL(response.url);
    result.status=response.status;
    result.officialHost=['redpocket.com','www.redpocket.com','my.redpocket.com',
      'tello.com','www.tello.com','h2owireless.com','www.h2owireless.com'].includes(target.hostname);
    result.finalUrl=response.url;
    if(response.ok && result.officialHost){
      const body=(await response.text()).slice(0,1_500_000);
      result.bytes=Buffer.byteLength(body);
      result.containsPlanRates=/(?:\$\s*\d+(?:\.\d{1,2})?\s*\/\s*mo|Monthly Price|annual payment)/i.test(body);
    }
  }catch(e){result.error=String(e.message||e).slice(0,90);}
  console.log(JSON.stringify(result));
}
