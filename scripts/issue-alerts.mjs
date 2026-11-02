// GitHub Issues notifications from a small daily, narrowly scoped alert feed.
// Runs with ephemeral GITHUB_TOKEN; does not close or reopen issues.
// Stable hidden markers prevent daily duplication, even after manual closure.
const PREFIX='<!-- five-bars-event:';
const ISSUE_LIMIT=1000;
const ISSUE_API='https://api.github.com';
const REPO_PATTERN=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const KEY_PATTERN=/^(?:deadline|conflict|rate-change):(plan|phone):[a-z0-9._:-]{1,110}$/i;
const safe=(value,n=320)=>String(value??'').replace(/[\r\n\t<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const quote=s=>safe(s,1000)
  .replace(/https?:\/\/\S+/gi,'[external link omitted]')
  .replace(/@/g,'at ')
  .replace(/([\\*_\[\]#|])/g,'\\$1');
function safeSource(url){
  try{
    const u=new URL(url);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/^(localhost|127\.)/.test(u.hostname)?u.href:null;
  }catch{return null;}
}
export function marker(key){
  if(typeof key!=='string'||!KEY_PATTERN.test(key))throw Error('Invalid event key');
  return PREFIX+key+' -->';
}
export function issueTitle(event){
  return '[Five Bars] '+(event.type==='deadline'?'Promotion deadline':
    event.type==='conflict'?'Price discrepancy':'Headline price change')+
    ': '+safe(event.carrier+' — '+event.offer,130).replace(/@/g,'at ');
}
export function issueBody(event){
  const id=marker(event.key);
  const lines=[
    id,
    '## Five Bars automatic price-review alert',
    '',
    '**Signal:** '+quote(event.title),
    '',
    '**Why it matters:** '+quote(event.description),
    '',
    '**Next action:** '+quote(event.action),
    '',
    '**Alert type:** '+quote(event.type)+' · **Priority:** '+quote(event.severity),
    '**Offer ID:** '+quote(event.offerId),
    '**Scope:** '+quote(event.evidenceScope||'Catalog field only'),
    ...(event.dueDate?['**Catalog end date:** '+quote(event.dueDate)]:[]),
    ...(event.observedOn?['**Official observation date:** '+quote(event.observedOn)]:[]),
    ...(safeSource(event.sourceUrl)?['**Official source:** '+safeSource(event.sourceUrl)]:[]),
    '',
    '> **Accuracy notice:** These are catalog-date reminders or partial official headline observations, not independently verified checkout prices, activation eligibility, tax, renewal pricing, or coverage. A blocked carrier page is not a price change.',
    '',
    'This issue stays open until a person closes it. The daily scanner does **not** create duplicate issues for the same event, reopen manually closed issues, or automatically change catalog pricing.',
    '',
    '_Generated from the Five Bars repository without paid AI services or personal tracking._'
  ];
  return lines.join('\n');
}
function keyFromIssue(issue){
  if(!issue || issue.pull_request || typeof issue.body!=='string')return null;
  const found=issue.body.match(/<!-- five-bars-event:((?:deadline|conflict|rate-change):(plan|phone):[a-z0-9._:-]{1,110}) -->/i);
  return found&&KEY_PATTERN.test(found[1])?found[1]:null;
}
async function api(fetchImpl, method, path, token, body){
  const r=await fetchImpl(ISSUE_API+path,{
    method,headers:{
      accept:'application/vnd.github+json',
      authorization:'Bearer '+token,
      'x-github-api-version':'2022-11-28',
      ...(body?{'content-type':'application/json'}:{})
    },...(body?{body:JSON.stringify(body)}:{})
  });
  if(!r.ok)throw Error('GitHub Issues API '+method+' '+r.status+' ('+path.split('?')[0]+')');
  return r.json();
}
export async function syncIssueAlerts(feed,{repository,token,owner=null,fetchImpl=fetch,
  dryRun=false,logger=()=>{}}={}){
  if(!REPO_PATTERN.test(repository||''))throw Error('GITHUB_REPOSITORY must be owner/repo');
  if(!feed || feed.schema!==1 || !Array.isArray(feed.events))
    throw Error('Invalid alert feed');
  const events=feed.events.filter(event=>event?.active===true&&event?.notify===true);
  // Check closed issues too: manual closure suppresses further notifications
  // for the same event even if it remains active the next day.
  const existing=new Map();
  for(let page=1;page<=ISSUE_LIMIT/100;page++){
    if(!token||token.length<8)throw Error('Missing GITHUB_TOKEN with issues: write permission');
    const results=await api(fetchImpl,'GET',
      '/repos/'+repository+'/issues?state=all&per_page=100&page='+page,token);
    if(!Array.isArray(results))throw Error('Unexpected Issues API listing');
    for(const issue of results){
      const key=keyFromIssue(issue);
      if(key && !existing.has(key))existing.set(key,issue);
    }
    if(results.length<100)break;
    if(page===ISSUE_LIMIT/100)throw Error('Issue history too long; refusing potentially duplicate notifications');
  }
  const log={active:events.length,created:0,deduplicated:0,manualClosed:0,preview:dryRun,issueUrls:[]};
  for(const e of events){
    if(!KEY_PATTERN.test(e.key))throw Error('Invalid event key');
    if(existing.has(e.key)){
      const issue=existing.get(e.key);
      log.deduplicated++;
      if(issue.state==='closed')log.manualClosed++;
      continue;
    }
    if(dryRun){
      log.issueUrls.push('PREVIEW: '+issueTitle(e));
      continue;
    }
    const assignee=owner && /^[A-Za-z0-9-]{1,39}$/.test(owner) &&
      owner.toLowerCase()===repository.split('/')[0].toLowerCase() ? [owner] : undefined;
    const created=await api(fetchImpl,'POST','/repos/'+repository+'/issues',token,
      {title:issueTitle(e),body:issueBody(e),...(assignee?{assignees:assignee}:{})});
    existing.set(e.key,created);
    log.created++;
    if(typeof created.html_url==='string')log.issueUrls.push(created.html_url);
    logger('Created '+e.key);
  }
  return log;
}
