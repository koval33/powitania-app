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

  // --- Audio play ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.play-btn');
    if (btn) {
      var card = btn.closest('.voice-card, .sample-row, [data-lektor]');
      var lektorName = '';
      if (card) {
        lektorName = card.getAttribute('data-lektor') || card.querySelector('.lektor-name, h3, h2')?.textContent?.trim() || '';
      }
      trackEvent('audio_play', { lektor_name: lektorName });
    }
  });

  // --- Lektor card click (bank głosów) ---
  document.addEventListener('click', function(e) {
    var card = e.target.closest('.voice-card[data-url]');
    if (card && !e.target.closest('.play-btn') && !e.target.closest('a[download]')) {
      var name = card.querySelector('.lektor-name, h3')?.textContent?.trim() || '';
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
