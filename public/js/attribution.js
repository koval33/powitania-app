/**
 * Atrybucja zrodla zamowien - powitania.pl
 *
 * Laduje sie na kazdej stronie. Odczytuje z URL parametry marketingowe
 * (gclid, utm_*, fbclid) oraz GA4 client_id z cookie _ga, i zapisuje je w
 * first-party cookie `pow_attrib` (JSON). Formularze zamowien dolaczaja te
 * dane do payloadu przez window.powAttribData(), a backend przekazuje je do CRM.
 *
 * Zasady:
 * - gclid/utm/fbclid: LAST-TOUCH per klucz - kazdy niepusty parametr w URL
 *   nadpisuje poprzednia wartosc (gclid nie ginie przy pozniejszej wizycie utm-only).
 * - gaClientId: ustawiany RAZ (nie nadpisujemy istniejacego).
 * - Cookie: TTL 90 dni, SameSite=Lax, path=/.
 */
(function () {
  'use strict';

  var COOKIE = 'pow_attrib';
  var TTL_DAYS = 90;
  var TOUCH_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid'];

  function readCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1') + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }

  function writeCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function readStore() {
    try { return JSON.parse(readCookie(COOKIE) || '{}') || {}; } catch (e) { return {}; }
  }

  // GA4 client_id z cookie _ga: format "GA1.1.XXXXXXXXXX.YYYYYYYYYY" -> "XXXXXXXXXX.YYYYYYYYYY"
  // (czesc po drugiej kropce).
  function extractGaClientId() {
    var ga = readCookie('_ga');
    if (!ga) return null;
    var parts = ga.split('.');
    return parts.length >= 4 ? parts.slice(2).join('.') : null;
  }

  var params = new URLSearchParams(location.search);
  var store = readStore();

  // Last-touch: nadpisz obecne w URL parametry marketingowe
  TOUCH_KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) store[k] = v;
  });

  // client_id - ustaw raz
  if (!store.gaClientId) {
    var cid = extractGaClientId();
    if (cid) store.gaClientId = cid;
  }

  writeCookie(COOKIE, JSON.stringify(store), TTL_DAYS);

  // GA4 ustawia cookie _ga asynchronicznie - jesli client_id jeszcze nie ma,
  // sprobuj kilka razy (max ~10 s), potem odpusc.
  if (!store.gaClientId) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var late = extractGaClientId();
      if (late) {
        var s = readStore();
        if (!s.gaClientId) { s.gaClientId = late; writeCookie(COOKIE, JSON.stringify(s), TTL_DAYS); }
        clearInterval(iv);
      } else if (tries >= 10) {
        clearInterval(iv);
      }
    }, 1000);
  }

  // Udostepnij dane atrybucji formularzom zamowien (spread do payloadu POST /register).
  window.powAttribData = function () {
    return readStore();
  };
})();
