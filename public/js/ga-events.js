/**
 * GA4 Event Tracking - powitania.pl
 *
 * Centralny plik push eventów do dataLayer.
 * Agencja SEM może łatwo podpiąć te eventy jako triggery w GTM
 * lub śledzić bezpośrednio w GA4 jako custom events.
 *
 * EVENTS:
 *   kreator_generate      - użytkownik wygenerował tekst w kreatorze
 *   kreator_optimize      - użytkownik zoptymalizował tekst pod czas
 *   form_submit_order     - złożenie zamówienia (z ceną / bez płatności online)
 *   form_submit_payment   - przejście do płatności P24
 *   form_submit_inquiry   - zapytanie o lektora
 *   form_submit_inquiry_bank - zapytanie z banku głosów (popup "Zapytaj")
 *   form_submit_inquiry_premium - zapytanie premium (ze strony lektora)
 *   form_submit_contact   - formularz kontaktowy (strona główna)
 *   form_submit_partner   - zapytanie ze strony partnera
 *   form_submit_review    - dodanie opinii
 *   audio_play            - odtworzenie próbki audio
 *   lektor_card_click     - kliknięcie w kartę lektora (bank głosów)
 *   lektor_profile_view   - wejście na profil lektora
 *   phone_click           - kliknięcie numeru telefonu
 *   email_click           - kliknięcie adresu email
 */

(function() {
  'use strict';

  window.trackEvent = function(eventName, params) {
    params = params || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, params));
  };

  /**
   * Enhanced Conversions for Leads - przygotowanie user-provided data.
   * Zwraca { email, phone_number } z surowymi (NIE hashowanymi) danymi
   * - GTM/Google hashuje SHA-256 server-side.
   * - email: trim + lowercase
   * - phone: E.164 (9 cyfr PL bez prefiksu -> +48XXXXXXXXX)
   * - puste pola pomijane; jesli oba puste -> undefined
   */
  window.ecData = function(email, phone) {
    var ec = {};
    if (email && typeof email === 'string') {
      var e = email.trim().toLowerCase();
      if (e) ec.email = e;
    }
    if (phone && typeof phone === 'string') {
      var p = phone.trim().replace(/[\s\-()]/g, '');
      if (p) {
        if (/^\d{9}$/.test(p)) p = '+48' + p;            // 501234567 -> +48501234567
        else if (/^48\d{9}$/.test(p)) p = '+' + p;       // 48501234567 -> +48501234567
        else if (/^00/.test(p)) p = '+' + p.slice(2);    // 0048... -> +48...
        else if (p[0] !== '+' && /^\d{10,15}$/.test(p)) p = '+' + p;
        ec.phone_number = p;
      }
    }
    return Object.keys(ec).length ? ec : undefined;
  };

  // Helper: trackEvent z dolaczonym enhanced_conversion_data (jesli niepuste)
  window.trackEventEC = function(eventName, params, email, phone) {
    params = params || {};
    var ec = window.ecData(email, phone);
    if (ec) params.enhanced_conversion_data = ec;
    window.trackEvent(eventName, params);
  };

  // --- Audio play ---
  // UWAGA: brak optional chaining (?.) - powodowal SyntaxError w starszych
  // browserach (Safari < 13.1, stary Android WebView) i wywalal CALY plik
  // ga-events.js, przez co wszystkie eventy GA4 padaly. ES5-only.
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.play-btn');
    if (btn) {
      var card = btn.closest('.voice-card, .sample-row, [data-lektor]');
      var lektorName = '';
      if (card) {
        lektorName = card.getAttribute('data-lektor') || '';
        if (!lektorName) {
          var nameEl = card.querySelector('.lektor-name, h3, h2');
          if (nameEl && nameEl.textContent) lektorName = nameEl.textContent.trim();
        }
      }
      trackEvent('audio_play', { lektor_name: lektorName });
    }
  });

  // --- Lektor card click (bank głosów) ---
  document.addEventListener('click', function(e) {
    var card = e.target.closest('.voice-card[data-url]');
    if (card && !e.target.closest('.play-btn') && !e.target.closest('a[download]')) {
      var nameEl = card.querySelector('.lektor-name, h3');
      var name = (nameEl && nameEl.textContent) ? nameEl.textContent.trim() : '';
      trackEvent('lektor_card_click', { lektor_name: name, url: card.dataset.url });
    }
  });

  // --- Phone / Email clicks ---
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="tel:"]');
    if (link) {
      trackEvent('phone_click', { phone_number: link.href.replace('tel:', '') });
    }
    var emailLink = e.target.closest('a[href^="mailto:"]');
    if (emailLink) {
      trackEvent('email_click', { email: emailLink.href.replace('mailto:', '') });
    }
  });

  // --- Lektor profile view (na stronie /lektorzy/*) ---
  if (window.location.pathname.indexOf('/lektorzy/') === 0) {
    var slug = window.location.pathname.split('/lektorzy/')[1];
    if (slug) {
      slug = slug.replace(/\/$/, '');
      trackEvent('lektor_profile_view', { lektor_slug: slug });
    }
  }

})();
