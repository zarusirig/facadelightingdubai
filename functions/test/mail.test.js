'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOwnerEmail, buildAckEmail } = require('../lib/mail');

const lead = {
  id: 'abc12345',
  phone: '+971565688660',
  phoneRaw: '056 568 8660',
  propertyType: 'villa',
  name: 'Ahmed <script>alert(1)</script>',
  email: 'ahmed@example.com',
  area: 'Palm Jumeirah',
  timeline: '1-3 months',
  message: 'Facade + landscape\nBudget flexible',
  page: 'https://facadelightingdubai.com/villa-lighting/?utm_source=google',
  utm: { utm_source: 'google', utm_campaign: 'villa' },
};

test('owner email: subject, wa.me link, escaping, reply-to, UTM', () => {
  const m = buildOwnerEmail({ lead, kind: 'new', from: 'x@y.z', to: 'owner@y.z', now: new Date('2026-09-05T08:00:00Z') });
  assert.equal(m.subject, 'New quote — Villa — +971565688660');
  assert.match(m.text, /https:\/\/wa\.me\/971565688660/);
  assert.match(m.html, /wa\.me\/971565688660/);
  assert.ok(!m.html.includes('<script>'), 'HTML must be escaped');
  assert.match(m.html, /&lt;script&gt;/);
  assert.match(m.text, /utm_source: google/);
  assert.match(m.text, /Received: .*12:00.*Dubai/);
  assert.match(m.replyTo, /ahmed@example\.com/);
  assert.match(m.text, /Phone \(as typed\): 056 568 8660/);
});

test('owner email: update kind changes subject and title', () => {
  const m = buildOwnerEmail({ lead, kind: 'update', from: 'x@y.z', to: 'o@y.z' });
  assert.match(m.subject, /^Quote update — Villa — \+971565688660$/);
  assert.match(m.text, /added more details/);
});

test('owner email: no crash on minimal lead, no wa link without phone', () => {
  const m = buildOwnerEmail({ lead: { id: 'x', propertyType: 'other', email: 'a@b.co' }, kind: 'new', from: 'f', to: 't' });
  assert.equal(m.subject, 'New quote — Other — no phone');
  assert.ok(!m.text.includes('wa.me'));
});

test('ack email is short and promises only a call within 1 business day', () => {
  const m = buildAckEmail({ lead, from: 'x@y.z', to: lead.email, ownerPhone: '+971 56 568 8660', ownerWhatsApp: 'https://wa.me/971565688660' });
  assert.equal(m.to, 'ahmed@example.com');
  assert.match(m.text, /within 1 business day/);
  assert.match(m.text, /abc12345/);
  assert.ok(!/best|leading|cheapest|guarantee/i.test(m.text));
});
