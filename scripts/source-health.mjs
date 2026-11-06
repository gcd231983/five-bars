// Conservative scan-health history. A failed HTTP request is not evidence
// that a carrier deal is withdrawn, expired, or has an incorrect price.
function validObservedAt(value,now){
 if(typeof value!=='string')return null;
 const timestamp=Date.parse(value);
 return Number.isFinite(timestamp)&&timestamp<=now&&timestamp>=0?value:null;
}
export function classifySourceFailure(record){
 if(record?.ok===true)return null;
 if(record?.status===401||record?.status===403)return 'automated_access_blocked';
 if(record?.status===429)return 'rate_limited';
 if(record?.status>=500)return 'source_server_error';
 const text=String(record?.note||record?.error||'').toLowerCase();
 if(text.includes('exceeded')&&text.includes('mb'))return 'response_too_large';
 if(text.includes('timeout')||text.includes('timed out')||text.includes('aborted'))return 'request_timeout';
 if(text.includes('redirect'))return 'unexpected_redirect';
 if(text.includes('blocked')||text.includes('captcha'))return 'automated_access_blocked';
 return 'request_unavailable';
}
export function withSourceHistory(current,previous,scannedAt,previousScannedAt){
 const now=Date.parse(scannedAt);
 if(!Number.isFinite(now)||!current||typeof current.url!=='string')throw Error('Valid source and timestamp required');
 const same=previous?.url===current.url?previous:null;
 const lastReachableAt=validObservedAt(same?.lastReachableAt,now)||
   (same?.ok===true?validObservedAt(previousScannedAt,now):null);
 if(current.ok===true)return {
  ...current,failureReason:null,unavailableSince:null,lastReachableAt:scannedAt
 };
 return {
  ...current,failureReason:classifySourceFailure(current),
  unavailableSince:(same?.ok===false?validObservedAt(same.unavailableSince,now)||
    validObservedAt(previousScannedAt,now):null)||scannedAt,
  lastReachableAt
 };
}
export function persistentSourceFailures(sources,now,days=7){
 const time=Date.parse(now);
 if(!Number.isFinite(time)||!Array.isArray(sources))return 0;
 return sources.filter(source=>source?.ok===false &&
   Number.isFinite(Date.parse(source.unavailableSince)) &&
   time-Date.parse(source.unavailableSince)>=days*86400000).length;
}
