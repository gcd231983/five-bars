// Synthetic review fixtures. NEVER import these records into production data.
import {CHECKOUT_REVIEW_CHECKS,offerSignature} from '../../site/value-core.mjs';

export function checkoutFixture(offer,observedAt='2026-11-02'){
 const port=offer.port===true||offer.promo?.req==='port';
 const newCustomer=offer.promo?.req==='new';
 return {
  schema:1,channel:'official_online_checkout',observedAt,
  lineCount:1,customerScenario:port?'new_line_port':newCustomer?'new_line_no_port':'not_required',
  upfrontCents:Math.max(10000,Math.round((offer.billingUpfront||0)*100),
    Math.round((offer.phone&&!offer.postpaid?offer.price:0)*100)),
  renewalCents:2500,billingMonths:offer.billingMonths===12?12:1,
  requiredServiceMonths:Math.max(1,offer.billingMonths===12?12:1,offer.prepay||0,offer.stay||0),
  taxesAndFeesIncluded:true,stockConfirmed:true,
  checks:Object.fromEntries(CHECKOUT_REVIEW_CHECKS.map(key=>[key,true])),
  ...(offer.postpaid===true?{
   financing:{retailDeviceCents:120000,totalInstallmentsCents:120000,
    installmentMonths:24,creditMonths:24,earlyExitExposureCents:120000}
  }:{})
 };
}
export function checkoutRecord(offer,verifiedAt='2026-11-02',evidenceUrl=offer.url||'https://example.org/terms'){
 return {scope:'full_terms',signature:offerSignature(offer),
  verifiedAt,evidenceUrl,reviewerActor:'test-reviewer',
  method:'anonymized_human_checkout_quote',checkout:checkoutFixture(offer,verifiedAt)};
}
