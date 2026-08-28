/* ============================================
   FACADE LIGHTING DUBAI — CRO behaviors
   Lead form AJAX submission + conversion events
   ============================================ */

(function () {
  'use strict';

  // Firebase Hosting rewrites this to the `contact` Cloud Function, which
  // relays the enquiry over the domain's own Purelymail SMTP.
  var FORM_ENDPOINT = '/api/contact';

  function trackEvent(name, params) {
    try {
      if (typeof gtag === 'function') gtag('event', name, params || {});
    } catch (e) { /* analytics must never break UX */ }
  }

  // --- Lead form AJAX submission ---
  document.querySelectorAll('form.lead-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var status = form.querySelector('.form-status');
      var button = form.querySelector('button[type="submit"]');
      var buttonLabel = button ? button.textContent : '';

      // Honeypot — silently drop bot submissions
      var honeypot = form.querySelector('input[name="_honey"]');
      if (honeypot && honeypot.value) return;

      var data = {};
      new FormData(form).forEach(function (value, key) {
        data[key] = value;
      });

      if (button) {
        button.disabled = true;
        button.textContent = 'Sending…';
      }
      if (status) {
        status.classList.remove('visible', 'success', 'error');
      }

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
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
        })
        .then(function () {
          if (status) {
            status.textContent = 'Thank you — your enquiry has been received. Our engineering team will respond within one business day.';
            status.classList.add('visible', 'success');
          }
          form.reset();
          trackEvent('generate_lead', { method: 'lead_form', form_id: form.id || 'lead-form' });
        })
        .catch(function (err) {
          if (status) {
            status.innerHTML = (err && err.userFacing)
              ? String(err.message)
              : 'Something went wrong sending your message. Please call us on <a href="tel:+97145807370">+971 4 580 7370</a> or use WhatsApp below.';
            status.classList.add('visible', 'error');
          }
          trackEvent('lead_form_error', { form_id: form.id || 'lead-form' });
        })
        .finally(function () {
          if (button) {
            button.disabled = false;
            button.textContent = buttonLabel;
          }
        });
    });
  });

  // --- Conversion click tracking (calls, WhatsApp, quote CTAs) ---
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      trackEvent('phone_call_click', { link_location: link.className });
    } else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      trackEvent('whatsapp_click', { link_location: link.className });
    } else if (href.indexOf('#quote-form') !== -1) {
      trackEvent('quote_cta_click', { link_location: link.className });
    }
  });
})();
