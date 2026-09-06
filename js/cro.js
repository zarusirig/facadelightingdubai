/* ============================================
   FACADE LIGHTING DUBAI — CRO behaviors
   v2 (2026-09): two-step quote form, inline
   validation, +971 phone mask, sticky-bar
   awareness, desktop scroll-intent nudge,
   conversion event tracking.

   Runs once even if the script is loaded twice
   (window.__flqCro guard). Does NOT touch any
   handler that main.js / inner-pages.js own
   (nav, FAQ, header scroll, cursor glow).
   ============================================ */

(function () {
  'use strict';

  if (window.__flqCro) return;
  window.__flqCro = true;

  // Firebase Hosting rewrites this to the `contact` Cloud Function, which
  // relays the enquiry over the domain's own Purelymail SMTP.
  var FORM_ENDPOINT = '/api/contact';
  var PHONE_DISPLAY = '+971 56 568 8660';
  var PHONE_TEL = 'tel:+971565688660';
  var WA_BASE = 'https://wa.me/971565688660?text=';
  var NEXT_STEP_COPY = 'An engineer calls or WhatsApps you within one business day.';

  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* ignore */ }

  function trackEvent(name, params) {
    try {
      if (typeof gtag === 'function') gtag('event', name, params || {});
    } catch (e) { /* analytics must never break UX */ }
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function session(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function scrollToEl(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      el.scrollIntoView();
    }
  }

  function postJson(data) {
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (payload) {
        // Surface the server's own validation wording where there is one,
        // so "add a phone or email" reaches the visitor instead of a
        // generic failure message.
        if (!res.ok || payload.ok !== true) {
          var err = new Error(payload.error || 'Request failed');
          err.userFacing = Boolean(payload.error);
          throw err;
        }
        return payload;
      });
    });
  }

  function errorHtml(err) {
    return (err && err.userFacing)
      ? String(err.message)
      : 'Something went wrong sending your message. Please call us on <a href="' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> or use WhatsApp instead.';
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = '<span>' + (label || 'Sending…') + '</span>';
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (button.dataset.label) button.innerHTML = button.dataset.label;
    }
  }

  /* ---------------------------------------------------------------
     Phone helpers — UAE-first, but never rejects a valid overseas
     number (a lot of consultants and developers dial in from abroad).
     --------------------------------------------------------------- */
  function normalisePhone(raw) {
    var v = String(raw || '').trim().replace(/[^\d+]/g, '');
    if (v.indexOf('00') === 0) v = '+' + v.slice(2);
    if (v.indexOf('+') > 0) v = v.replace(/\+/g, '');
    if (/^05\d{8}$/.test(v)) v = '+971' + v.slice(1);       // 05x xxx xxxx
    else if (/^5\d{8}$/.test(v)) v = '+971' + v;             // 5x xxx xxxx
    else if (/^971\d+$/.test(v)) v = '+' + v;                // 971…
    else if (/^0[2-9]\d{6,7}$/.test(v)) v = '+971' + v.slice(1); // UAE landline
    return v;
  }

  function formatPhone(norm) {
    var m = norm.match(/^\+971(5\d)(\d{3})(\d{4})$/);
    if (m) return '+971 ' + m[1] + ' ' + m[2] + ' ' + m[3];
    var l = norm.match(/^\+971([2-9])(\d{3})(\d{4})$/);
    if (l) return '+971 ' + l[1] + ' ' + l[2] + ' ' + l[3];
    return norm;
  }

  function phoneProblem(raw) {
    var norm = normalisePhone(raw);
    var digits = norm.replace(/\D/g, '');
    if (!digits.length) return 'Add the number we should call or WhatsApp.';
    if (norm.indexOf('+971') === 0) {
      if (/^\+9715\d{8}$/.test(norm) || /^\+971[2-9]\d{7}$/.test(norm)) return '';
      return 'UAE mobiles are +971 5x xxx xxxx (9 digits after +971).';
    }
    if (digits.length < 8 || digits.length > 15) return 'That number looks too short or too long. Include the country code.';
    return '';
  }

  /* ---------------------------------------------------------------
     Inline validation
     --------------------------------------------------------------- */
  function fieldWrap(input) { return input.closest('.form-field, .quote-chips') || input.parentNode; }

  function setFieldError(input, message) {
    var wrap = fieldWrap(input);
    var slot = wrap ? wrap.querySelector('.field-error') : null;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (wrap) wrap.classList.add('has-error');
      if (slot) slot.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      if (wrap) wrap.classList.remove('has-error');
      if (slot) slot.textContent = '';
    }
  }

  function validateField(input) {
    var name = input.name;
    var value = String(input.value || '').trim();
    var msg = '';

    if (name === 'name') {
      if (!value) msg = 'Tell us who to ask for.';
      else if (value.length < 2) msg = 'Please enter your name.';
    } else if (name === 'phone') {
      msg = phoneProblem(value);
    } else if (name === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) msg = 'That email address does not look right.';
    }
    setFieldError(input, msg);
    return !msg;
  }

  function validateChips(form) {
    var group = $('.quote-chips', form);
    if (!group) return true;
    var checked = $('input[name="project_type"]:checked', form);
    var slot = $('.field-error', group);
    if (!checked) {
      group.classList.add('has-error');
      if (slot) slot.textContent = 'Pick the closest match — "Other" is fine.';
      return false;
    }
    group.classList.remove('has-error');
    if (slot) slot.textContent = '';
    return true;
  }

  function firstInvalid(form, step) {
    return $('[aria-invalid="true"], .has-error input', step || form);
  }

  /* ---------------------------------------------------------------
     Two-step quote form  (.quote-form)
     Step 1: property type + name + phone  -> POST (the lead)
     Step 2: optional detail -> second POST with the same phone
     --------------------------------------------------------------- */
  function chipLabel(form) {
    var checked = $('input[name="project_type"]:checked', form);
    if (!checked) return '';
    var span = checked.parentNode ? checked.parentNode.querySelector('span') : null;
    return span ? span.textContent.trim() : checked.value;
  }

  function buildStep1Message(form) {
    var type = chipLabel(form) || 'Not specified';
    var page = (form.querySelector('input[name="page_source"]') || {}).value || location.pathname;
    return 'Quick enquiry (step 1 of 2). Property type: ' + type + '. ' +
      'Requested a free facade lighting assessment via ' + page + '. ' +
      'Please call or WhatsApp the number given.';
  }

  function buildStep2Message(form) {
    var type = chipLabel(form) || 'Not specified';
    var timeline = (form.querySelector('[name="timeline"]') || {}).value || '';
    var details = (form.querySelector('[name="message"]') || {}).value || '';
    var lines = ['Follow-up details (step 2 of 2) for the quick enquiry from the same phone number.',
      'Property type: ' + type];
    if (timeline) lines.push('Timeline: ' + timeline);
    if (details.trim()) lines.push('Details: ' + details.trim());
    return lines.join('\n');
  }

  function payloadFrom(form, extra) {
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = value; });
    delete data.timeline; // not a backend field — folded into message
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) data[k] = extra[k];
    return data;
  }

  function whatsappHref(form) {
    var type = chipLabel(form);
    var name = (form.querySelector('[name="name"]') || {}).value || '';
    var text = 'Hello, I just sent an enquiry on facadelightingdubai.com' +
      (name ? ' (' + name.trim() + ')' : '') +
      (type ? ' about a ' + type.toLowerCase() : '') +
      '. Can we continue on WhatsApp?';
    return WA_BASE + encodeURIComponent(text);
  }

  function initQuoteForm(form) {
    if (form.dataset.croBound) return;
    form.dataset.croBound = '1';

    var step1 = $('.quote-step--1', form);
    var step2 = $('.quote-step--2', form);
    var status1 = $('.form-status', step1 || form);
    var status2 = step2 ? $('.form-status', step2) : null;
    var phone = $('input[name="phone"]', form);
    var nameInput = $('input[name="name"]', form);
    var email = $('input[name="email"]', form);
    var formId = form.id || 'quote-form';
    var pageType = form.dataset.pageType || 'default';

    // Pre-select the chip the page is about (villa page -> Villa).
    var preselect = form.dataset.preselect;
    if (preselect && !$('input[name="project_type"]:checked', form)) {
      var pre = $('input[name="project_type"][value="' + preselect + '"]', form);
      if (pre) pre.checked = true;
    }

    // Live validation: validate on blur, clear on input once the visitor is fixing it.
    [nameInput, phone, email].forEach(function (input) {
      if (!input) return;
      input.addEventListener('blur', function () {
        if (input === phone && input.value.trim()) {
          var norm = normalisePhone(input.value);
          if (!phoneProblem(norm)) input.value = formatPhone(norm);
        }
        if (input.value.trim() || input.required) validateField(input);
      });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      });
    });

    $$('input[name="project_type"]', form).forEach(function (radio) {
      radio.addEventListener('change', function () {
        validateChips(form);
        trackEvent('form_property_type', { form_id: formId, project_type: radio.value });
      });
    });

    function showStatus(slot, text, kind, asHtml) {
      if (!slot) return;
      slot.classList.remove('visible', 'success', 'error');
      if (asHtml) slot.innerHTML = text; else slot.textContent = text;
      slot.classList.add('visible', kind);
    }

    function clearStatus(slot) {
      if (!slot) return;
      slot.classList.remove('visible', 'success', 'error');
      slot.textContent = '';
    }

    function goToStep2() {
      form.dataset.step = '2';
      form.classList.add('is-step-2');
      if (step1) step1.hidden = true;
      if (!step2) return;
      step2.hidden = false;

      var wa = $('.quote-whatsapp-fallback', step2);
      if (wa) wa.href = whatsappHref(form);

      var who = $('.quote-thanks-name', step2);
      if (who && nameInput && nameInput.value.trim()) {
        who.textContent = nameInput.value.trim().split(/\s+/)[0];
      }

      var heading = $('.quote-step-heading', step2);
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      // Keep the confirmation in view — the section may have shrunk.
      scrollToEl(form.closest('section') || form);
    }

    function finish(message) {
      form.dataset.step = 'done';
      form.classList.add('is-done');
      if (step2) {
        var fields = $('.quote-step-2-fields', step2);
        if (fields) fields.hidden = true;
        var doneBox = $('.quote-done', step2);
        if (doneBox) {
          doneBox.hidden = false;
          if (message) {
            var p = $('.quote-done-copy', doneBox);
            if (p) p.textContent = message;
          }
          doneBox.setAttribute('tabindex', '-1');
          doneBox.focus({ preventScroll: true });
        }
      }
      document.body.classList.add('cro-lead-sent');
      session('flq_lead', '1');
    }

    function submitStep1(button) {
      var ok = true;
      if (!validateChips(form)) ok = false;
      if (nameInput && !validateField(nameInput)) ok = false;
      if (phone && !validateField(phone)) ok = false;
      if (!ok) {
        var bad = firstInvalid(form, step1);
        if (bad) bad.focus();
        showStatus(status1, 'One or two details need a look above.', 'error');
        trackEvent('form_validation_error', { form_id: formId, step: 1 });
        return;
      }
      clearStatus(status1);
      if (phone) phone.value = formatPhone(normalisePhone(phone.value));

      var data = payloadFrom(form, { message: buildStep1Message(form) });
      delete data.location; // step-2 fields are empty at this point
      delete data.email;

      setBusy(button, true, 'Sending…');
      postJson(data)
        .then(function () {
          trackEvent('generate_lead', { method: 'quote_form', form_id: formId, page_type: pageType, project_type: data.project_type || '' });
          trackEvent('form_step_1', { form_id: formId, page_type: pageType, project_type: data.project_type || '' });
          goToStep2();
        })
        .catch(function (err) {
          showStatus(status1, errorHtml(err), 'error', true);
          trackEvent('lead_form_error', { form_id: formId, step: 1 });
        })
        .then(function () { setBusy(button, false); });
    }

    function submitStep2(button) {
      if (email && !validateField(email)) {
        email.focus();
        return;
      }
      var timeline = (form.querySelector('[name="timeline"]') || {}).value || '';
      var details = (form.querySelector('[name="message"]') || {}).value || '';
      var loc = (form.querySelector('[name="location"]') || {}).value || '';
      var emailVal = email ? email.value.trim() : '';
      if (!timeline && !details.trim() && !loc.trim() && !emailVal) {
        // Nothing added — treat as skip rather than sending an empty follow-up.
        finish();
        trackEvent('form_step_2_skipped', { form_id: formId, page_type: pageType });
        return;
      }
      clearStatus(status2);
      var data = payloadFrom(form, { message: buildStep2Message(form) });
      if (!emailVal) delete data.email;
      if (!loc.trim()) delete data.location;

      setBusy(button, true, 'Sending…');
      postJson(data)
        .then(function () {
          trackEvent('form_step_2', { form_id: formId, page_type: pageType, has_email: Boolean(emailVal), has_location: Boolean(loc.trim()) });
          finish('Details received. ' + NEXT_STEP_COPY);
        })
        .catch(function (err) {
          showStatus(status2, errorHtml(err), 'error', true);
          trackEvent('lead_form_error', { form_id: formId, step: 2 });
        })
        .then(function () { setBusy(button, false); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Honeypot — silently drop bot submissions
      var honeypot = form.querySelector('input[name="_honey"]');
      if (honeypot && honeypot.value) return;

      var button = (e.submitter && e.submitter.type === 'submit') ? e.submitter : $('button[type="submit"]:not([hidden])', form.dataset.step === '2' ? step2 : step1) || $('button[type="submit"]', form);
      if (form.dataset.step === '2') submitStep2(button);
      else if (form.dataset.step !== 'done') submitStep1(button);
    });

    var skip = $('.quote-skip', form);
    if (skip) {
      skip.addEventListener('click', function () {
        finish();
        trackEvent('form_step_2_skipped', { form_id: formId, page_type: pageType });
      });
    }
  }

  /* ---------------------------------------------------------------
     Legacy single-step lead forms (contact page) — unchanged behaviour
     --------------------------------------------------------------- */
  function initLegacyForm(form) {
    if (form.dataset.croBound) return;
    form.dataset.croBound = '1';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var button = form.querySelector('button[type="submit"]');
      var honeypot = form.querySelector('input[name="_honey"]');
      if (honeypot && honeypot.value) return;

      var data = payloadFrom(form, {});
      setBusy(button, true, 'Sending…');
      if (status) status.classList.remove('visible', 'success', 'error');

      postJson(data)
        .then(function () {
          if (status) {
            status.textContent = 'Thank you — your enquiry has been received. ' + NEXT_STEP_COPY;
            status.classList.add('visible', 'success');
          }
          form.reset();
          document.body.classList.add('cro-lead-sent');
          session('flq_lead', '1');
          trackEvent('generate_lead', { method: 'lead_form', form_id: form.id || 'lead-form' });
        })
        .catch(function (err) {
          if (status) {
            status.innerHTML = errorHtml(err);
            status.classList.add('visible', 'error');
          }
          trackEvent('lead_form_error', { form_id: form.id || 'lead-form' });
        })
        .then(function () { setBusy(button, false); });
    });
  }

  /* ---------------------------------------------------------------
     Sticky mobile bar: get out of the way while the quote form is on
     screen or being typed into, so it never sits over the submit button.
     --------------------------------------------------------------- */
  function initBarAwareness() {
    var targets = $$('#get-quote, #quote, #quote-form');
    if (!targets.length || !('IntersectionObserver' in window)) return;
    var visible = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.__inView = entry.isIntersecting;
      });
      visible = targets.filter(function (t) { return t.__inView; }).length;
      document.body.classList.toggle('cro-quote-in-view', visible > 0);
    }, { threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });

    document.addEventListener('focusin', function (e) {
      if (e.target.closest && e.target.closest('form.lead-form')) document.body.classList.add('cro-form-focus');
    });
    document.addEventListener('focusout', function (e) {
      if (e.target.closest && e.target.closest('form.lead-form')) document.body.classList.remove('cro-form-focus');
    });
  }

  /* ---------------------------------------------------------------
     Desktop-only scroll-intent nudge (60% depth, once per session)
     --------------------------------------------------------------- */
  function initNudge() {
    var nudge = document.getElementById('quote-nudge');
    if (!nudge) return;
    var desktop = false;
    try { desktop = window.matchMedia('(min-width: 992px) and (hover: hover)').matches; } catch (e) { /* ignore */ }
    if (!desktop) return;
    if (session('flq_nudge') || session('flq_lead')) return;

    var shown = false;
    var dismissed = false;

    function hide(reason) {
      if (dismissed) return;
      dismissed = true;
      nudge.classList.remove('is-visible');
      session('flq_nudge', '1');
      var delay = reducedMotion ? 0 : 350;
      window.setTimeout(function () { nudge.hidden = true; }, delay);
      if (reason) trackEvent('quote_nudge_' + reason, {});
    }

    function show() {
      if (shown) return;
      shown = true;
      nudge.hidden = false;
      // Two frames so the transition runs from the hidden state.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { nudge.classList.add('is-visible'); });
      });
      trackEvent('quote_nudge_shown', {});
      window.removeEventListener('scroll', onScroll);
    }

    function onScroll() {
      if (document.body.classList.contains('cro-quote-in-view') || document.body.classList.contains('cro-lead-sent')) return;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var depth = (window.scrollY || doc.scrollTop) / max;
      if (depth >= 0.6) show();
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    var close = $('.quote-nudge-close', nudge);
    if (close) close.addEventListener('click', function () { hide('dismiss'); });
    var cta = $('.quote-nudge-cta', nudge);
    if (cta) {
      cta.addEventListener('click', function (e) {
        var target = document.getElementById('get-quote') || document.getElementById('quote');
        if (target) {
          e.preventDefault();
          scrollToEl(target);
          var first = $('input[name="project_type"]', target) || $('input, select, textarea', target);
          if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, reducedMotion ? 0 : 600);
        }
        trackEvent('quote_nudge_click', {});
        hide();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && shown && !dismissed) hide('dismiss');
    });
    // Once the visitor reaches the form or sends a lead, the nudge is noise.
    document.addEventListener('focusin', function (e) {
      if (shown && e.target.closest && e.target.closest('form.lead-form')) hide();
    });
  }

  /* ---------------------------------------------------------------
     Conversion click tracking (calls, WhatsApp, quote CTAs)
     --------------------------------------------------------------- */
  function initClickTracking() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (!link) return;
      var href = link.getAttribute('href') || '';

      if (href.indexOf('tel:') === 0) {
        trackEvent('phone_call_click', { link_location: link.className });
      } else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
        trackEvent('whatsapp_click', { link_location: link.className });
      } else if (/#(quote-form|get-quote|quote)$/.test(href)) {
        trackEvent('quote_cta_click', { link_location: link.className });
        // Same-page anchor: smooth scroll and land focus on the first chip
        // so keyboard/mobile visitors are ready to answer, not just looking.
        var id = href.split('#')[1];
        var samePage = href.charAt(0) === '#' || href.indexOf(location.pathname + '#') !== -1;
        var target = samePage ? document.getElementById(id) : null;
        if (target) {
          e.preventDefault();
          scrollToEl(target);
          var first = $('input[name="project_type"]', target) || $('input:not([type="hidden"]):not([name="_honey"]), select, textarea', target);
          if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, reducedMotion ? 0 : 650);
        }
      }
    });
  }

  function init() {
    $$('form.quote-form').forEach(initQuoteForm);
    $$('form.lead-form:not(.quote-form)').forEach(initLegacyForm);
    initBarAwareness();
    initNudge();
    initClickTracking();
    if (session('flq_lead')) document.body.classList.add('cro-lead-sent');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
