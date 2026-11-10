// Tello's Everyday 10GB promotion as officially published (blog.tello.com,
// observed 2026-11-02). It ended November 9, 2026, and the daily scan removes
// expired promotions from the live catalog, so tests that exercise
// promotion-deadline behavior use this dated fixture instead of depending on
// the live catalog still carrying it.
export const TELLO_NOV9_PROMO = Object.freeze({
  price: 10,
  months: 3,
  text: '$10/mo for the first 3 months on an eligible newly activated line (new customers or existing accounts adding a new line); offer ends November 9, 2026 at 11:59 p.m. EST',
  req: 'new',
  ends: '2026-11-09',
  officialDeadlineEvidence: Object.freeze({
    sourceUrl: 'https://blog.tello.com/news/halloween-deal-10gb-for-10-mo-first-3-months/',
    observedOn: '2026-11-02'
  })
});

// Return a copy of the catalog in which the Tello plan carries its documented
// November 9 promotion, leaving the input catalog untouched.
export function withTelloPromo(catalog) {
  const copy = structuredClone(catalog);
  const tello = copy.plans.find(p => p.id === 'tello');
  if (!tello) throw new Error('Tello plan missing from catalog');
  tello.promo = structuredClone(TELLO_NOV9_PROMO);
  return copy;
}
