import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const siteFile=name=>readFileSync(new URL('../site/'+name,import.meta.url),'utf8');
const contact=siteFile('contact.html');
const report=siteFile('report.html');
const privacy=siteFile('privacy.html');

test('correction reports offer the same non-sensitive email route as Contact and Privacy',()=>{
  for (const [name,content] of [['Contact',contact],['Privacy',privacy],['Report',report]]) {
    assert.match(content,/support@fivebars\.info/i,name+' must display the documented support address');
    assert.match(content,/mailto:support@fivebars\.info/i,name+' must link directly to documented support email');
  }
  assert.doesNotMatch(report,/there is not yet a private support inbox/i,
    'The corrections page must not contradict the public Contact and Privacy pages');
  assert.match(report,/non-sensitive summary/i);
});

test('public correction and email channels explain privacy limitations',()=>{
  assert.match(report,/GitHub issues are <strong>public/i);
  assert.match(report,/Email correspondence is not guaranteed to be end-to-end encrypted/i);
  assert.match(report,/Do not include phone numbers, subscriber identifiers, transfer PINs, payment information/i);
  assert.match(contact,/non-sensitive summary/i);
  assert.match(contact,/Do not include subscriber details, transfer PINs, payment information/i);
  assert.match(privacy,/email services used to send and receive/i);
});
