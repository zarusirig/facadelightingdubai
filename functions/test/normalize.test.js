'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, normalizePropertyType, clean, cleanMultiline, headerSafe, isEmail, dubaiTime } = require('../lib/normalize');

test('UAE mobile formats normalise to E.164', () => {
  const expected = '+971565688660';
  for (const input of [
    '+971 56 568 8660',
    '+971565688660',
    '00971 56 568 8660',
    '971565688660',
    '056 568 8660',
    '0565688660',
    '565688660',
    '(056) 568-8660',
    '+971 056 568 8660',
    '٠٥٦٥٦٨٨٦٦٠', // Arabic-Indic digits
  ]) {
    const r = normalizePhone(input);
    assert.equal(r.valid, true, input);
    assert.equal(r.e164, expected, input);
    assert.equal(r.uae, true, input);
  }
});

test('UAE landline formats normalise', () => {
  assert.equal(normalizePhone('04 580 7370').e164, '+97145807370');
  assert.equal(normalizePhone('+971 4 580 7370').e164, '+97145807370');
  assert.equal(normalizePhone('02 123 4567').e164, '+97121234567');
});

test('international E.164 numbers are kept, flagged non-UAE', () => {
  const r = normalizePhone('+44 7700 900123');
  assert.equal(r.valid, true);
  assert.equal(r.e164, '+447700900123');
  assert.equal(r.uae, false);
});

test('garbage phones are rejected but raw value is kept', () => {
  for (const input of ['', 'abc', '123', '05 12', '+0 123 456', '+971 12']) {
    const r = normalizePhone(input);
    assert.equal(r.valid, false, input);
    assert.equal(r.e164, '');
  }
  assert.equal(normalizePhone('call me').raw, 'call me');
});

test('property type mapping covers the legacy select and the new contract', () => {
  const cases = {
    'commercial-tower': 'tower',
    'residential-tower': 'tower',
    'hotel-resort': 'hotel',
    villa: 'villa',
    'retail-mall': 'commercial',
    mosque: 'other',
    other: 'other',
    Tower: 'tower',
    HOTEL: 'hotel',
    Commercial: 'commercial',
    'Luxury Villa in Emirates Hills': 'villa',
    'Office building': 'commercial',
    'something odd': 'other',
  };
  for (const [input, want] of Object.entries(cases)) {
    assert.equal(normalizePropertyType(input).value, want, input);
  }
  assert.equal(normalizePropertyType('').value, '');
});

test('clean handles non-ASCII names and odd types', () => {
  assert.equal(clean('  محمد   العلي  ', 120), 'محمد العلي');
  assert.equal(clean('José  Müller', 120), 'José Müller');
  assert.equal(clean(null, 10), '');
  assert.equal(clean(['x'], 10), '');
  assert.equal(clean('a'.repeat(50), 10).length, 10);
  assert.equal(cleanMultiline('line1\r\n\r\n\r\n\r\nline2   x', 100), 'line1\n\nline2 x');
});

test('header safety and email check', () => {
  assert.equal(headerSafe('a\r\nBcc: x@y.z'), 'a Bcc: x@y.z');
  assert.equal(isEmail('someone@example.ae'), true);
  assert.equal(isEmail('nope@'), false);
});

test('dubaiTime renders in Asia/Dubai', () => {
  const s = dubaiTime(new Date('2026-09-05T08:00:00Z'));
  assert.match(s, /12:00/); // UTC+4
  assert.match(s, /Dubai/);
});
