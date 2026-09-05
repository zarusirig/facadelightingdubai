/* ============================================================================
   Email builders for the contact function. Pure functions: given a lead
   record, return nodemailer message objects (plain text + HTML).
   ========================================================================= */

'use strict';

const { headerSafe, waDigits, dubaiTime } = require('./normalize');

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PROPERTY_LABEL = {
  villa: 'Villa',
  tower: 'Tower',
  hotel: 'Hotel',
  commercial: 'Commercial',
  other: 'Other',
};

/** Rows shown in the owner notification, in display order. */
function leadRows(lead) {
  const rows = [];
  const add = (label, value) => {
    if (value != null && String(value).trim() !== '') rows.push({ label, value: String(value) });
  };
  add('Phone', lead.phone || lead.phoneRaw);
  if (lead.phoneRaw && lead.phone && lead.phoneRaw !== lead.phone) add('Phone (as typed)', lead.phoneRaw);
  add('Property type', PROPERTY_LABEL[lead.propertyType] || lead.propertyType);
  if (lead.propertyTypeRaw && lead.propertyTypeRaw.toLowerCase() !== (lead.propertyType || '')) {
    add('Property type (as typed)', lead.propertyTypeRaw);
  }
  add('Name', lead.name);
  add('Email', lead.email);
  add('Area / location', lead.area);
  add('Timeline', lead.timeline);
  add('Project details', lead.message);
  add('Submitted from', lead.page);
  add('Referrer', lead.referrer);
  if (lead.utm) {
    for (const [k, v] of Object.entries(lead.utm)) add(k, v);
  }
  return rows;
}

function renderText(title, rows, footerLines) {
  return [title, '', ...rows.map((r) => `${r.label}: ${r.value}`), '', ...footerLines].join('\n');
}

function renderHtml(title, rows, footerHtml) {
  const table = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#555;vertical-align:top;white-space:nowrap"><strong>${escapeHtml(
          r.label
        )}</strong></td><td style="padding:6px 0">${escapeHtml(r.value).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.45">` +
    `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>` +
    `<table style="border-collapse:collapse">${table}</table>` +
    `<div style="margin-top:16px">${footerHtml}</div></div>`
  );
}

/**
 * Notification to the owner. `kind` is 'new' (step 1 / single-step) or
 * 'update' (step 2 follow-up referencing an existing lead).
 */
function buildOwnerEmail({ lead, kind, from, to, now }) {
  const when = dubaiTime(now || new Date());
  const type = PROPERTY_LABEL[lead.propertyType] || 'Other';
  const phone = lead.phone || lead.phoneRaw || 'no phone';
  const subjectPrefix = kind === 'update' ? 'Quote update' : 'New quote';
  const subject = headerSafe(`${subjectPrefix} — ${type} — ${phone}`);
  const title = kind === 'update' ? `Lead ${lead.id} added more details` : `New quote request (${type})`;

  const rows = leadRows(lead);
  const wa = waDigits(lead.phone);
  const footerText = [`Received: ${when}`, `Lead ID: ${lead.id}`];
  let footerHtml = `<p style="margin:0 0 8px;color:#555">Received: ${escapeHtml(when)}<br>Lead ID: ${escapeHtml(lead.id)}</p>`;
  if (wa) {
    const waUrl = `https://wa.me/${wa}`;
    const tel = `tel:${lead.phone}`;
    footerText.push(`WhatsApp: ${waUrl}`, `Call: ${lead.phone}`);
    footerHtml +=
      `<p style="margin:12px 0 0"><a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 16px;border-radius:4px;font-weight:bold">WhatsApp ${escapeHtml(
        lead.phone
      )}</a> &nbsp; <a href="${escapeHtml(tel)}" style="display:inline-block;background:#cfad4e;color:#111;text-decoration:none;padding:10px 16px;border-radius:4px;font-weight:bold">Call</a></p>`;
  }

  const message = {
    from,
    to,
    subject,
    text: renderText(title, rows, footerText),
    html: renderHtml(title, rows, footerHtml),
  };
  if (lead.email) {
    message.replyTo = lead.name ? `"${headerSafe(lead.name).replace(/"/g, '')}" <${headerSafe(lead.email)}>` : headerSafe(lead.email);
  }
  return message;
}

/** Short acknowledgement to the lead. Only sent when they gave an email. */
function buildAckEmail({ lead, from, to, ownerPhone, ownerWhatsApp }) {
  const greeting = lead.name ? `Hello ${headerSafe(lead.name)},` : 'Hello,';
  const text = [
    greeting,
    '',
    'Thank you for your quote request to Facade Lighting Dubai. We have received it and an engineer will call you within 1 business day.',
    '',
    `Your reference: ${lead.id}`,
    lead.phone ? `We will call: ${lead.phone}` : '',
    '',
    `If it is urgent you can call ${ownerPhone} or WhatsApp ${ownerWhatsApp}.`,
    '',
    'Facade Lighting Dubai',
    'https://facadelightingdubai.com/',
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">` +
    `<p>${escapeHtml(greeting)}</p>` +
    `<p>Thank you for your quote request to Facade Lighting Dubai. We have received it and an engineer will call you within 1 business day.</p>` +
    `<p style="color:#555">Your reference: ${escapeHtml(lead.id)}${lead.phone ? `<br>We will call: ${escapeHtml(lead.phone)}` : ''}</p>` +
    `<p>If it is urgent you can call <a href="tel:${escapeHtml(ownerPhone.replace(/\s/g, ''))}">${escapeHtml(ownerPhone)}</a> or <a href="${escapeHtml(
      ownerWhatsApp
    )}">WhatsApp us</a>.</p>` +
    `<p>Facade Lighting Dubai<br><a href="https://facadelightingdubai.com/">facadelightingdubai.com</a></p></div>`;

  return {
    from,
    to,
    subject: 'We received your quote request — Facade Lighting Dubai',
    text,
    html,
  };
}

module.exports = { buildOwnerEmail, buildAckEmail, leadRows, escapeHtml, PROPERTY_LABEL };
