#!/usr/bin/env node
/* Smoke test for the `contact` function against the local emulator.
   Posts a step-1 lead, then a step-2 update referencing its leadId, then a
   honeypot hit and an invalid phone, and checks the JSON contract.

     npm run smoke:emulator          # starts emulators, runs this, stops them
     CONTACT_URL=... node scripts/smoke.js   # against any running instance

   Set MAIL_DRY_RUN=1 in functions/.env.local so no real email is sent. */

'use strict';

const URL_DEFAULT = 'http://127.0.0.1:5001/facadelightingdubai/us-central1/contact';
const url = process.env.CONTACT_URL || URL_DEFAULT;
const origin = process.env.SMOKE_ORIGIN || 'https://facadelightingdubai.com';

async function post(body, label) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
  let payload = {};
  try {
    payload = await res.json();
  } catch (_) {
    /* non-JSON */
  }
  console.log(`${label}: HTTP ${res.status}`, JSON.stringify(payload));
  return { status: res.status, payload, headers: res.headers };
}

function expect(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok  -', msg);
  }
}

(async () => {
  console.log('POST', url);

  // Step 1: phone + property type only (the fast first step).
  const s1 = await post(
    {
      step: 1,
      phone: '056 568 8660',
      propertyType: 'villa',
      page: 'https://facadelightingdubai.com/villa-lighting/?utm_source=smoke&utm_campaign=test',
    },
    'step 1'
  );
  expect(s1.status === 200 && s1.payload.ok === true, 'step 1 returns 200 {ok:true}');
  expect(typeof s1.payload.leadId === 'string' && s1.payload.leadId.length >= 8, 'step 1 returns a leadId');
  expect(s1.payload.step === 1, 'step 1 echoes step:1');
  expect(s1.headers.get('content-type')?.includes('application/json'), 'response is JSON');
  expect(s1.headers.get('access-control-allow-origin') === origin, 'CORS origin echoed for allowed origin');

  // Step 2: enrich the same lead.
  const s2 = await post(
    {
      step: 2,
      leadId: s1.payload.leadId,
      name: 'Smoke Test محمد',
      email: 'smoke-test@example.com',
      area: 'Palm Jumeirah',
      timeline: '1-3 months',
      message: 'Emulator smoke test — please ignore.\nSecond line.',
    },
    'step 2'
  );
  expect(s2.status === 200 && s2.payload.ok === true, 'step 2 returns 200 {ok:true}');
  expect(s2.payload.leadId === s1.payload.leadId, 'step 2 keeps the same leadId');
  expect(s2.payload.step === 2, 'step 2 echoes step:2');

  // Legacy single-step form (current js/cro.js field names).
  const legacy = await post(
    {
      name: 'Legacy Form',
      phone: '+971 4 580 7370',
      project_type: 'commercial-tower',
      message: 'Legacy contract smoke test',
      page_source: '/commercial-tower-lighting/',
    },
    'legacy'
  );
  expect(legacy.status === 200 && legacy.payload.ok === true, 'legacy field names still accepted');

  // Honeypot: must look like success.
  const honey = await post({ phone: '0501234567', propertyType: 'tower', _honey: 'http://spam' }, 'honeypot');
  expect(honey.status === 200 && honey.payload.ok === true, 'honeypot answered with 200 ok:true');

  // Invalid phone, no email: must be a 400 with a user-facing error.
  const bad = await post({ phone: '12', propertyType: 'hotel' }, 'bad phone');
  expect(bad.status === 400 && bad.payload.ok === false && typeof bad.payload.error === 'string', 'bad phone -> 400 {ok:false,error}');

  // Wrong method.
  const get = await fetch(url, { method: 'GET' });
  expect(get.status === 405, 'GET -> 405');

  if (process.exitCode) {
    console.error('\nSMOKE FAILED');
  } else {
    console.log('\nSMOKE PASSED');
  }
})().catch((err) => {
  console.error('Smoke test could not reach the function:', err.message);
  process.exit(1);
});
