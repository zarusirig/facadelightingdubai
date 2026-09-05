/* ============================================================================
   Pure helpers for the contact function: field cleaning, UAE phone
   normalisation, property-type mapping. No I/O here so it is unit-testable.
   ========================================================================= */

'use strict';

const PROPERTY_TYPES = ['villa', 'tower', 'hotel', 'commercial', 'other'];

// Legacy <select name="project_type"> values from the live HTML forms, plus a
// few free-text guesses, mapped onto the canonical five.
const PROPERTY_ALIASES = {
  villa: 'villa',
  'villa / residence': 'villa',
  residence: 'villa',
  residential: 'villa',
  house: 'villa',
  palace: 'villa',
  tower: 'tower',
  'commercial-tower': 'tower',
  'residential-tower': 'tower',
  'commercial tower': 'tower',
  'residential tower': 'tower',
  'high-rise': 'tower',
  highrise: 'tower',
  skyscraper: 'tower',
  hotel: 'hotel',
  'hotel-resort': 'hotel',
  'hotel / resort': 'hotel',
  resort: 'hotel',
  hospitality: 'hotel',
  commercial: 'commercial',
  'retail-mall': 'commercial',
  'retail / mall': 'commercial',
  retail: 'commercial',
  mall: 'commercial',
  office: 'commercial',
  showroom: 'commercial',
  restaurant: 'commercial',
  mosque: 'other',
  'mosque / religious': 'other',
  other: 'other',
};

/** Collapse whitespace, trim, cap length. Never throws on odd input. */
function clean(value, max) {
  if (value == null) return '';
  if (typeof value === 'object') return ''; // arrays/objects from a tampered body
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Like clean() but preserves line breaks (for the message body). */
function cleanMultiline(value, max) {
  if (value == null || typeof value === 'object') return '';
  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/** Strip CR/LF so a value can never inject extra SMTP headers. */
const headerSafe = (v) => String(v || '').replace(/[\r\n]+/g, ' ').trim();

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits -> ASCII.
function asciiDigits(s) {
  return String(s).replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String((code >= 0x06f0 ? code - 0x06f0 : code - 0x0660) % 10);
  });
}

/**
 * Normalise a phone number to E.164, preferring UAE interpretations.
 *
 * Accepts, e.g.: "+971 56 568 8660", "00971565688660", "971565688660",
 * "056 568 8660", "0565688660", "565688660", "04 580 7370", "+44 7700 900123".
 *
 * Returns { valid, e164, uae, raw }. e164 is '' when invalid.
 */
function normalizePhone(input) {
  const raw = clean(input, 40);
  if (!raw) return { valid: false, e164: '', uae: false, raw };

  let s = asciiDigits(raw).replace(/[^\d+]/g, '');
  // Only a leading "+" is meaningful; drop any others (e.g. "tel:+971+4...").
  s = s.replace(/(?!^)\+/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);

  const hasPlus = s.startsWith('+');
  const digits = hasPlus ? s.slice(1) : s;
  if (!/^\d+$/.test(digits)) return { valid: false, e164: '', uae: false, raw };

  const uae = (national) => ({ valid: true, e164: '+971' + national, uae: true, raw });

  // +971 / 971 prefixed
  if (digits.startsWith('971') && (hasPlus || digits.length >= 11)) {
    let national = digits.slice(3);
    if (national.startsWith('0')) national = national.slice(1); // "+971 056..." typo
    if (isUaeNational(national)) return uae(national);
    return { valid: false, e164: '', uae: false, raw };
  }

  if (!hasPlus) {
    // National formats: 05x xxxxxxx (10), 04 xxxxxxx (9), or without the 0.
    if (digits.startsWith('0')) {
      const national = digits.slice(1);
      if (isUaeNational(national)) return uae(national);
      return { valid: false, e164: '', uae: false, raw };
    }
    if (isUaeNational(digits)) return uae(digits);
    return { valid: false, e164: '', uae: false, raw };
  }

  // Other international numbers in E.164: keep them, an overseas investor is
  // still a lead. 8-15 digits, cannot start with 0.
  if (digits.length >= 8 && digits.length <= 15 && digits[0] !== '0') {
    return { valid: true, e164: '+' + digits, uae: false, raw };
  }
  return { valid: false, e164: '', uae: false, raw };
}

// UAE national significant number: mobiles are 5x + 7 digits (9 total);
// landlines are a 1-digit area code (2,3,4,6,7,9) + 7 digits (8 total).
function isUaeNational(n) {
  if (/^5\d{8}$/.test(n)) return true;
  if (/^[2346789]\d{7}$/.test(n)) return true;
  return false;
}

/** Map any project/property type input onto villa|tower|hotel|commercial|other. */
function normalizePropertyType(input) {
  const v = clean(input, 60).toLowerCase();
  if (!v) return { value: '', known: false };
  if (PROPERTY_ALIASES[v]) return { value: PROPERTY_ALIASES[v], known: true };
  for (const key of PROPERTY_TYPES) {
    if (v.includes(key)) return { value: key, known: true };
  }
  if (/hotel|resort|hospitality/.test(v)) return { value: 'hotel', known: true };
  if (/villa|residen|house|palace/.test(v)) return { value: 'villa', known: true };
  if (/tower|high.?rise/.test(v)) return { value: 'tower', known: true };
  if (/retail|mall|office|shop|commercial|restaurant/.test(v)) return { value: 'commercial', known: true };
  return { value: 'other', known: false };
}

/** Digits only, for a wa.me/ link. */
const waDigits = (e164) => String(e164 || '').replace(/\D/g, '');

/** Format a timestamp in Asia/Dubai for humans. */
function dubaiTime(date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return fmt.format(date) + ' (Dubai, GST)';
}

module.exports = {
  PROPERTY_TYPES,
  clean,
  cleanMultiline,
  headerSafe,
  isEmail,
  asciiDigits,
  normalizePhone,
  normalizePropertyType,
  waDigits,
  dubaiTime,
};
