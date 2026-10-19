/**
 * Sesja panelu klienta - podpisane cookie, zero zaleznosci.
 *
 * Cookie `pow_panel` = base64url(JSON) + "." + HMAC-SHA256(secret). W srodku
 * tylko identyfikatory (uzytkownik, klient) i czas wygasniecia; wszystko,
 * co wrazliwe, zyje w CRM. Bez cookie-parser i express-session - to jedyny
 * cookie w aplikacji, a kazda nowa zaleznosc to kolejna rzecz do pilnowania
 * na produkcji.
 *
 * Sesja trwa 12 h i jest odnawiana przy kazdym zadaniu (okno przesuwne),
 * zgodnie z HANDOFF-panel-klienta.md pkt 10.
 */
const crypto = require('crypto');

const COOKIE = 'pow_panel';
const SCIEZKA = '/panel';
const SESJA_SEK = 12 * 60 * 60;
const ODNOW_PO_SEK = 15 * 60;   // nie przepisuj cookie czesciej niz co 15 min

function sekret() {
  const s = process.env.PANEL_SESSION_SECRET;
  if (!s || s.length < 32) {
    // Na produkcji brak sekretu = brak panelu. Lepiej glosny blad niz
    // sesje podpisane znana wartoscia.
    throw new Error('PANEL_SESSION_SECRET musi miec co najmniej 32 znaki');
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function odB64url(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function podpis(dane) {
  return b64url(crypto.createHmac('sha256', sekret()).update(dane).digest());
}

function zakoduj(sesja) {
  const dane = b64url(JSON.stringify(sesja));
  return dane + '.' + podpis(dane);
}

function odczytaj(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const i = cookieValue.lastIndexOf('.');
  if (i <= 0) return null;
  const dane = cookieValue.slice(0, i);
  const sig = cookieValue.slice(i + 1);
  const oczekiwany = podpis(dane);
  if (sig.length !== oczekiwany.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(oczekiwany))) return null;
  let sesja;
  try { sesja = JSON.parse(odB64url(dane)); } catch (e) { return null; }
  if (!sesja || !sesja.u || !sesja.k || !sesja.exp) return null;
  if (sesja.exp < Math.floor(Date.now() / 1000)) return null;
  return sesja;
}

function cookieZNaglowka(req) {
  const raw = req.headers.cookie || '';
  for (const czesc of raw.split(';')) {
    const [k, ...v] = czesc.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

function ustaw(res, sesja) {
  const exp = Math.floor(Date.now() / 1000) + SESJA_SEK;
  const wartosc = zakoduj({ ...sesja, exp, iat: Math.floor(Date.now() / 1000) });
  const bezpieczne = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT ? '; Secure' : '';
  res.append('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(wartosc)}; Path=${SCIEZKA}; HttpOnly; SameSite=Lax; Max-Age=${SESJA_SEK}${bezpieczne}`);
}

function wyczysc(res) {
  res.append('Set-Cookie', `${COOKIE}=; Path=${SCIEZKA}; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Middleware: wczytuje sesje do req.panel (albo null) i odnawia, gdy warto. */
function wczytaj(req, res, next) {
  req.panel = null;
  try {
    const sesja = odczytaj(cookieZNaglowka(req));
    if (sesja) {
      req.panel = sesja;
      if (Math.floor(Date.now() / 1000) - (sesja.iat || 0) > ODNOW_PO_SEK) {
        ustaw(res, { u: sesja.u, k: sesja.k, email: sesja.email, imie: sesja.imie, klient: sesja.klient, rola: sesja.rola });
      }
    }
  } catch (e) {
    // brak sekretu w env: panel niedostepny, ale reszta serwisu dziala
    console.error('[panel-session]', e.message);
  }
  next();
}

/** Middleware: bez sesji -> logowanie (z powrotem po zalogowaniu). */
function wymagaj(req, res, next) {
  if (req.panel) return next();
  const dokad = encodeURIComponent(req.originalUrl || '/panel/');
  return res.redirect(`/panel/login/?next=${dokad}`);
}

/** null gdy konfiguracja jest kompletna, inaczej komunikat do logu (nie dla klienta). */
function bladKonfiguracji() {
  try { sekret(); return null; } catch (e) { return e.message; }
}

module.exports = { COOKIE, wczytaj, wymagaj, ustaw, wyczysc, odczytaj, zakoduj, bladKonfiguracji };
