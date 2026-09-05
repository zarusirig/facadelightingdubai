# functions/ — quote & contact handler

One Cloud Function, `contact` (Node 20, region `us-central1`), that Firebase Hosting
rewrites `POST /api/contact` to (see `firebase.json`). It:

1. drops honeypot hits with a fake 200 and throttles to 5 submissions / 10 min per IP
   (Firestore `rateLimits/`, in-memory fallback),
2. normalises the phone to E.164 (`+971…`) and the property type to
   `villa|tower|hotel|commercial|other`,
3. **writes the lead to Firestore `leads/{leadId}` before touching SMTP**, so a mail
   outage never loses a lead,
4. emails the owner over Purelymail SMTP (one retry), with a WhatsApp/call button,
   page source, UTM/referrer and an Asia/Dubai timestamp,
5. sends a short acknowledgement to the lead if they gave an email,
6. always answers JSON.

## Request contract

`POST /api/contact` — `Content-Type: application/json` (form-encoded also works).

| field | required | notes |
|---|---|---|
| `phone` | yes (step 1) | any UAE format: `+971 56 568 8660`, `00971…`, `056 568 8660`, `0565688660`, `565688660`, `04 580 7370`, Arabic-Indic digits. Non-UAE `+E.164` accepted. Stored as E.164. A missing/invalid phone is accepted only if a valid `email` is given. |
| `propertyType` | preferred | `villa`, `tower`, `hotel`, `commercial`, `other`. Legacy values (`commercial-tower`, `hotel-resort`, `retail-mall`, …) and free text are mapped; missing defaults to `other`. |
| `name` | no | UTF-8, ≤120 chars |
| `email` | no | validated if present; enables the acknowledgement email |
| `area` | no | alias `location` |
| `timeline` | no | free text ≤120 |
| `message` | no | ≤4000, line breaks kept. Alias `details`, `project_details` |
| `page` | no | source URL; alias `page_source`. UTMs in its query string are extracted. Falls back to the `Referer` header. |
| `referrer` | no | document.referrer |
| `utm_source` `utm_medium` `utm_campaign` `utm_term` `utm_content` `gclid` `fbclid` | no | shown in the owner email, stored under `utm` |
| `step` | no | `1` (default) or `2` |
| `leadId` | step 2 | id returned by step 1. Unknown id ⇒ treated as a new lead (never rejected). |
| `_honey` (also `website`, `_gotcha`) | honeypot | non-empty ⇒ silent `200 {ok:true}` |

Legacy aliases still accepted: `project_type`, `location`, `page_source`.

## Response contract

| status | body |
|---|---|
| `200` | `{ "ok": true, "leadId": "…", "step": 1\|2, "emailed": true\|false }` — `emailed:false` means the lead is saved in Firestore but the owner email failed after retry (logged as an error). |
| `400` | `{ "ok": false, "error": "<user-facing message>" }` — invalid/missing phone (and no email), invalid email |
| `405` | `{ "ok": false, "error": "Method not allowed" }` |
| `429` | `{ "ok": false, "error": "Too many submissions … call or WhatsApp …" }` |
| `502` | `{ "ok": false, "error": "…", "leadId": "…" }` — both Firestore and SMTP failed |
| `500` | `{ "ok": false, "error": "…" }` — unexpected error |

The front end should treat `res.ok && payload.ok === true` as success and show
`payload.error` verbatim otherwise; keep `leadId` from step 1 to send with step 2.

Step 2 sends a "Quote update — {type} — {phone}" email showing the merged lead,
rather than a second "New quote" email.

## Firestore

- `leads/{leadId}`: `phone`, `phoneRaw`, `phoneUae`, `propertyType`, `name`, `email`,
  `area`, `timeline`, `message`, `page`, `referrer`, `utm{}`, `step`, `lastStep`,
  `status` (`new` | `updated` | `email_failed`), `createdAt`, `updatedAt`, `ipHash`,
  `userAgent`, `emails.owner|followUp|ack {sentAt|error|attempts}`.
- `rateLimits/{ipHash}`: `hits[]` (ms timestamps). Safe to delete any time.

**Owner action:** enable Cloud Firestore (Native mode) in the Firebase console for
project `facadelightingdubai` before deploying. Without it the function still emails,
but logs `Firestore write failed` on every lead. The default Cloud Functions service
account already has Firestore access. Rules are not needed (server-side admin SDK
only); if you later add rules, keep client access closed.

Watch for leads whose email failed:
`status == "email_failed"` in the `leads` collection, or the log line
`LEAD SAVED BUT OWNER EMAIL FAILED`.

## Configuration

| name | where | purpose |
|---|---|---|
| `PURELYMAIL_PASSWORD` | Secret Manager: `firebase functions:secrets:set PURELYMAIL_PASSWORD` | SMTP password for `info@facadelightingdubai.com`. Never in the repo. |
| `OWNER_EMAIL` | `functions/.env` (optional) | where notifications go; default `info@facadelightingdubai.com`; comma-separated for several |
| `SMTP_USER` | `.env` (optional) | SMTP login and From address; default `info@facadelightingdubai.com` |
| `SMTP_HOST` / `SMTP_PORT` | `.env` (optional) | default `smtp.purelymail.com` / `465` |
| `OWNER_PHONE` | `.env` (optional) | shown in error messages and the acknowledgement; default `+971 56 568 8660` |
| `MAIL_DRY_RUN` | `functions/.env.local` (emulator only) | `1` ⇒ log instead of sending |

For the emulator, put the secret in `functions/.secret.local` (git-ignored):

```
PURELYMAIL_PASSWORD=your-smtp-password
```

or, to test without sending mail, `functions/.env.local`:

```
MAIL_DRY_RUN=1
```

## Local development

```bash
cd functions
npm install
npm test            # unit tests (node --test), no emulator needed
npm run lint        # syntax check

# emulator + smoke test in one go (needs Java for the Firestore emulator)
echo "MAIL_DRY_RUN=1" > .env.local
echo "PURELYMAIL_PASSWORD=dummy" > .secret.local
npm run smoke:emulator
```

Or start `firebase emulators:start --only functions,firestore` and run
`node scripts/smoke.js`, or curl by hand:

```bash
# step 1 — fast first step, returns leadId
curl -s -X POST http://127.0.0.1:5001/facadelightingdubai/us-central1/contact \
  -H 'Content-Type: application/json' \
  -d '{"step":1,"phone":"056 568 8660","propertyType":"villa","page":"https://facadelightingdubai.com/villa-lighting/?utm_source=google"}'
# → {"ok":true,"leadId":"AbC…","step":1,"emailed":true}

# step 2 — enrich the same lead, sends a "Quote update" email instead of a duplicate
curl -s -X POST http://127.0.0.1:5001/facadelightingdubai/us-central1/contact \
  -H 'Content-Type: application/json' \
  -d '{"step":2,"leadId":"AbC…","name":"Ahmed","email":"ahmed@example.com","area":"Palm Jumeirah","timeline":"1-3 months","message":"Facade + landscape"}'
# → {"ok":true,"leadId":"AbC…","step":2,"emailed":true}
```

In production replace the URL with `https://facadelightingdubai.com/api/contact`.

## Deploy

```bash
firebase functions:secrets:set PURELYMAIL_PASSWORD   # once
firebase deploy --only functions
```

The function id (`contact`) and region (`us-central1`) must match the rewrite in
`firebase.json`; do not change either without updating both.
