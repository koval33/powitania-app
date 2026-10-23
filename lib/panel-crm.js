/**
 * Klient API panelu w CRM (/api/panel/*). Wolany WYLACZNIE z serwera -
 * klucz PANEL_API_KEY nigdy nie trafia do przegladarki.
 *
 * Kontrakt: optimum_CRM/HANDOFF-panel-klienta-CRM.md. Tozsamosc klienta
 * i uzytkownika idzie w naglowkach z sesji panelu; CRM sam sprawdza, czy
 * uzytkownik nalezy do klienta i czy zamowienie jest jego.
 *
 * Bledy CRM wracaja jako BladCRM z czytelnym komunikatem dla klienta
 * (CRM zwraca {ok:false, error:'...'} po polsku) - nigdy stack trace.
 */
const TIMEOUT_MS = 25000;   // CRM bywa wolny, patrz lib/crm-webhook.js

class BladCRM extends Error {
  // kod: maszynowy powod z CRM, np. 'sesja_niewazna' (konto wylaczone lub usuniete)
  constructor(message, status, kod) { super(message); this.name = 'BladCRM'; this.status = status || 502; this.kod = kod || null; }
}

/**
 * Adres CRM. CRM_WEBHOOK_URL na Railway moze byc samym hostem albo pelnym
 * adresem webhooka (crm-webhook.js tez tak go traktuje) - bierzemy tylko origin,
 * inaczej sciezka /api/panel dokleja sie do /api/webhook/... i CRM odpowiada 404.
 */
function baza() {
  const url = (process.env.CRM_WEBHOOK_URL || '').trim();
  if (!url) throw new BladCRM('Panel jest chwilowo niedostępny (brak konfiguracji CRM).', 503);
  try { return new URL(url).origin; } catch (e) { throw new BladCRM('Panel jest chwilowo niedostępny (zły adres CRM).', 503); }
}

function klucz() {
  const k = process.env.PANEL_API_KEY;
  if (!k) throw new BladCRM('Panel jest chwilowo niedostępny (brak klucza API).', 503);
  return k;
}

/**
 * @param {string} metoda GET|POST
 * @param {string} sciezka np. '/zamowienia/12'
 * @param {object} opts { body, sesja: req.panel, ip, surowo: true -> zwraca Response }
 */
async function wywolaj(metoda, sciezka, opts = {}) {
  const naglowki = {
    'Authorization': 'Bearer ' + klucz(),
    'User-Agent': 'powitania-app-panel/1.0',
    'Accept': 'application/json, application/pdf',
  };
  if (opts.sesja) {
    naglowki['X-Panel-Klient'] = String(opts.sesja.k);
    naglowki['X-Panel-Uzytkownik'] = String(opts.sesja.u);
  }
  if (opts.ip) naglowki['X-Panel-Ip'] = String(opts.ip).slice(0, 64);
  let body;
  if (opts.body !== undefined) {
    naglowki['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(baza() + '/api/panel' + sciezka, { method: metoda, headers: naglowki, body, signal: ctrl.signal });
  } catch (e) {
    const powod = e.name === 'AbortError' ? 'przekroczony czas oczekiwania' : e.message;
    console.error('[panel-crm]', metoda, sciezka, powod);
    throw new BladCRM('Nie udało się połączyć z systemem zamówień. Spróbuj za chwilę.', 502);
  } finally {
    clearTimeout(t);
  }
  if (opts.surowo) return resp;

  let dane = null;
  const tekst = await resp.text();
  try { dane = tekst ? JSON.parse(tekst) : null; } catch (e) { dane = null; }
  if (!resp.ok || !dane || dane.ok === false) {
    const msg = (dane && dane.error) || `Błąd systemu zamówień (${resp.status})`;
    if (resp.status >= 500) console.error('[panel-crm]', metoda, sciezka, resp.status, tekst.slice(0, 300));
    throw new BladCRM(msg, resp.status, dane && dane.kod);
  }
  return dane;
}

module.exports = {
  BladCRM,
  loginLink: (email, ip) => wywolaj('POST', '/login/link', { body: { email }, ip }),
  loginVerify: (token, ip) => wywolaj('POST', '/login/verify', { body: { token }, ip }),
  cennik: (sesja) => wywolaj('GET', '/cennik', { sesja }),
  zamowienia: (sesja) => wywolaj('GET', '/zamowienia', { sesja }),
  zamowienie: (sesja, id, ip) => wywolaj('GET', `/zamowienia/${encodeURIComponent(id)}`, { sesja, ip }),
  noweZamowienie: (sesja, dane, ip) => wywolaj('POST', '/zamowienia', { sesja, body: dane, ip }),
  wyslij: (sesja, id, ip) => wywolaj('POST', `/zamowienia/${encodeURIComponent(id)}/wyslij`, { sesja, body: {}, ip }),
  anuluj: (sesja, id, komentarz, ip, potwierdzamSkutek) => wywolaj('POST', `/zamowienia/${encodeURIComponent(id)}/anuluj`, { sesja, body: { komentarz: komentarz || '', potwierdzam_skutek: Boolean(potwierdzamSkutek) }, ip }),
  daneEmisyjne: (sesja, id, dane, ip) => wywolaj('POST', `/zamowienia/${encodeURIComponent(id)}/dane-emisyjne`, { sesja, body: dane, ip }),
  kopiuj: (sesja, id, ip) => wywolaj('POST', `/zamowienia/${encodeURIComponent(id)}/kopiuj`, { sesja, body: {}, ip }),
  podpowiedzi: (sesja) => wywolaj('GET', '/podpowiedzi', { sesja }),
  metryczkaPdf: (sesja, id, mid, podpisana, ip) => wywolaj('GET', `/zamowienia/${encodeURIComponent(id)}/metryczki/${encodeURIComponent(mid)}${podpisana ? '/podpisana.pdf' : '.pdf'}`, { sesja, ip, surowo: true }),
  potwierdz: (sesja, id, ip) => wywolaj('POST', `/zamowienia/${encodeURIComponent(id)}/potwierdz`, { sesja, body: {}, ip }),
  pdf: (sesja, id, ip) => wywolaj('GET', `/zamowienia/${encodeURIComponent(id)}/dokument.pdf`, { sesja, ip, surowo: true }),
};
