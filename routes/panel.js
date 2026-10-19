/**
 * Panel klienta (/panel/*) - zamowienia nagran po cenniku z umowy ramowej.
 *
 * Ta aplikacja jest tylko FRONTEM: logowanie magic linkiem, formularz
 * zamowienia z podgladem wyceny i widoki. Dane, wycena autorytatywna, PDF,
 * deale i maile zyja w CRM (optimum_CRM, /api/panel/*), wolanym przez
 * lib/panel-crm.js z kluczem z env - nigdy z przegladarki.
 *
 * Sesja: podpisane cookie (lib/panel-session.js). Kazda strona panelu
 * jest noindex i no-store - to prywatne dane klienta.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const sesja = require('../lib/panel-session');
const crm = require('../lib/panel-crm');
const PP = require('../public/js/panel-pricing.js');
const { verifyTurnstile } = require('../lib/turnstile');

const VOICES_PATH = path.join(__dirname, '..', 'data', 'voices.json');
const MAX_POZYCJI = 30;

// Etykiety stanow z CRM (panel_service.STATUSY) + klasy odznaki. Klasy sa
// sprawdzone w statycznym buildzie Tailwinda - nie dodawaj nowych bez grep.
const STATUSY = {
  szkic: { etykieta: 'Szkic', klasa: 'bg-gray-200 text-gray-800' },
  do_akceptacji: { etykieta: 'Czeka na akceptację Optimum', klasa: 'bg-yellow-100 text-yellow-800' },
  skorygowane: { etykieta: 'Skorygowane przez Optimum', klasa: 'bg-amber-50 text-amber-800 border border-amber-200' },
  do_potwierdzenia: { etykieta: 'Czeka na Twoje potwierdzenie', klasa: 'bg-accent/5 text-accent-dark border border-accent/20' },
  potwierdzone: { etykieta: 'Potwierdzone, czeka na podpis', klasa: 'bg-green-100 text-green-800' },
  podpisane: { etykieta: 'Podpisane', klasa: 'bg-green-100 text-green-800' },
  odrzucone: { etykieta: 'Odrzucone', klasa: 'bg-red-50 text-red-700 border border-red-200' },
  anulowane: { etykieta: 'Anulowane', klasa: 'bg-gray-200 text-gray-800' },
};

const KOMUNIKATY_OK = {
  utworzone: 'Zamówienie zapisane jako szkic. Możesz je wysłać do akceptacji, gdy będzie gotowe.',
  wyslane: 'Zamówienie wysłane do akceptacji. Optimum odezwie się mailem.',
  potwierdzone: 'Treść Zamówienia potwierdzona. Dokument trafia do podpisu obu stron, a my ruszamy z realizacją.',
  usuniete: 'Szkic usunięty.',
  wycofane: 'Zamówienie wycofane. Optimum dostało wiadomość.',
  odrzucone: 'Przekazaliśmy Optimum, że nie potwierdzasz tej wersji dokumentu. Odezwiemy się mailem.',
};

// --- Pomocnicze -----------------------------------------------------------

/** IP klienta koncowego: Cloudflare -> proxy Railway -> Express (brak trust proxy). */
function ipKlienta(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim().slice(0, 64);
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim().slice(0, 64);
  return (req.ip || '').slice(0, 64);
}

function chceJson(req) {
  return req.is('application/json') || (req.headers.accept || '').indexOf('application/json') === 0;
}

/** Dokad wrocic po logowaniu - tylko wewnatrz panelu, bez open redirect. */
function bezpiecznyNext(v) {
  const s = String(v || '');
  return /^\/panel\/[A-Za-z0-9/_.-]*$/.test(s) ? s : '/panel/';
}

function loadVoices() {
  try {
    return JSON.parse(fs.readFileSync(VOICES_PATH, 'utf8'))
      .filter(v => v.approved === true)
      .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  } catch (e) {
    console.error('[panel] voices.json:', e.message);
    return [];
  }
}

/**
 * Lista lektorow do formularza: najpierw ci z cennika klienta (klucz z cennika
 * jako lektor_id, stawka z umowy), potem reszta banku glosow ze stawkami
 * profilu w ukladzie pol panelu (POLE_PROFILU).
 */
function listaLektorow(cennikDane) {
  const zUmowy = (cennikDane && cennikDane.lektorzy) || {};
  const wynik = Object.keys(zUmowy).map(id => ({
    id, nazwa: zUmowy[id].nazwa || id, z_umowy: true, cena_ukryta: false, stawki_profilu: {},
  }));
  for (const v of loadVoices()) {
    if (zUmowy[v.id]) continue;
    const stawki = {};
    for (const klucz of Object.keys(PP.POLE_PROFILU)) {
      const pole = PP.POLE_PROFILU[klucz];
      const kw = (v.prices || {})[pole];
      if (typeof kw === 'number' && kw > 0) stawki[klucz] = kw;
    }
    wynik.push({ id: v.id, nazwa: v.name, z_umowy: false, cena_ukryta: Boolean(v.hidePrice), stawki_profilu: stawki });
  }
  return wynik;
}

function tekst(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

/**
 * Pozycje z formularza -> payload dla CRM. Przegladarce nie wierzymy:
 * zostaje tylko znany zestaw pol, a stawka profilu / cena ukryta / nazwa
 * lektora sa dopisywane TUTAJ z voices.json (CRM i tak weryfikuje po swojej stronie).
 */
function przygotujPozycje(surowe, lektorzy) {
  if (!Array.isArray(surowe) || !surowe.length) throw new BladFormularza('Dodaj co najmniej jedną pozycję.');
  if (surowe.length > MAX_POZYCJI) throw new BladFormularza(`Zamówienie może mieć najwyżej ${MAX_POZYCJI} pozycji.`);
  const poId = {};
  lektorzy.forEach(l => { poId[l.id] = l; });
  return surowe.map((p, i) => {
    p = p || {};
    const lektorId = tekst(p.lektor_id, 80);
    const l = poId[lektorId];
    if (!l) throw new BladFormularza(`Pozycja ${i + 1}: wybierz lektora z listy.`);
    const pole = tekst(p.pole, 40), dlugosc = tekst(p.dlugosc, 10);
    const poz = {
      id: 'p' + (i + 1),
      typ: tekst(p.typ, 30),
      lektor_id: lektorId,
      lektor_nazwa: l.nazwa,
      pole, dlugosc,
      udzwiekowienie: tekst(p.udzwiekowienie, 20) || 'brak',
      okres: tekst(p.okres, 4) === '24' ? '24' : '12',
      licencja: tekst(p.licencja, 20) === 'niewylaczna' ? 'niewylaczna' : 'wylaczna',
      terytorium: tekst(p.terytorium, 80) || 'Polska',
    };
    if (poz.typ !== 'spot') {
      // bazowa_id wskazuje numer pozycji w TYM zamowieniu (p1, p2...); dla
      // dogrywki do starszego zamowienia panel podaje kwote tamtej wersji.
      const baz = tekst(p.bazowa_id, 10);
      if (/^p\d{1,2}$/.test(baz)) poz.bazowa_id = baz;
      const kb = Number(p.kwota_bazowa);
      if (poz.typ === 'dogrywka' && !poz.bazowa_id && kb > 0 && kb < 1000000) poz.kwota_bazowa = Math.round(kb);
    }
    if (poz.typ === 'wersja_pochodna') poz.opis_wersji = tekst(p.opis_wersji, 200);
    if (tekst(p.uwagi, 300)) poz.uwagi = tekst(p.uwagi, 300);
    // Tekst do nagrania: zachowujemy akapity (Optimum czyta go, zeby ocenic,
    // czy "wersja pochodna" jest nia naprawde), tylko limit i normalizacja konca linii.
    const skrypt = String(p.tekst == null ? '' : p.tekst).replace(/\r\n?/g, '\n').trim().slice(0, 4000);
    if (skrypt) poz.tekst = skrypt;
    if (!l.z_umowy) {
      poz.cena_ukryta = l.cena_ukryta;
      const sp = l.stawki_profilu[pole + '|' + dlugosc];
      if (!l.cena_ukryta && typeof sp === 'number') poz.stawka_profilu = sp;
    }
    return poz;
  });
}

class BladFormularza extends Error {
  constructor(msg) { super(msg); this.name = 'BladFormularza'; this.status = 400; }
}

function widok(res, nazwa, dane) {
  return res.render('panel/' + nazwa, Object.assign({
    title: 'Panel zamówień | powitania.pl',
    description: '',
    noindex: true,
    mainClass: 'panel-dark',
    STATUSY, PP,
    zl: PP.zl,
    data: formatujDate,
  }, dane || {}));
}

function formatujDate(iso, zCzasem) {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return s;
  const d = `${m[3]}.${m[2]}.${m[1]}`;
  return zCzasem && m[4] ? `${d} ${m[4]}:${m[5]}` : d;
}

function obsluzBlad(req, res, e) {
  let status = 500, msg = 'Coś poszło nie tak. Spróbuj ponownie za chwilę.';
  if (e instanceof crm.BladCRM || e instanceof BladFormularza || e.name === 'BladWyceny') {
    status = e.status && e.status < 500 ? e.status : 502;
    msg = e.message;
  } else {
    console.error('[panel]', req.method, req.originalUrl, e);
  }
  if (chceJson(req)) return res.status(status).json({ ok: false, error: msg });
  return res.status(status), widok(res, 'komunikat', { naglowek: 'Nie udało się', tresc: msg, link: '/panel/', linkTekst: 'Wróć do zamówień' });
}

const a = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => obsluzBlad(req, res, e));

// Logowanie: 5 prob na kwadrans z jednego IP. CRM ma swoj limit (10/15 min),
// ale to my pierwsi widzimy ruch. Wlasne 10 linii zamiast RateLimiter z lib/,
// bo tamten odpowiada JSON-em, a tu wraca strona HTML.
const probyLogowania = new Map();
function limitLogowania(req, res, next) {
  const ip = ipKlienta(req) || '?';
  const teraz = Date.now();
  const lista = (probyLogowania.get(ip) || []).filter(t => t > teraz - 15 * 60 * 1000);
  lista.push(teraz);
  probyLogowania.set(ip, lista);
  if (probyLogowania.size > 5000) probyLogowania.clear();
  if (lista.length > 5) {
    res.status(429);
    return widok(res, 'komunikat', { naglowek: 'Zbyt wiele prób', tresc: 'Spróbuj ponownie za kwadrans.', link: '/panel/login/', linkTekst: 'Wróć do logowania' });
  }
  next();
}

// --- Middleware wspolne ----------------------------------------------------

router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
router.use(sesja.wczytaj);
router.use((req, res, next) => {
  res.locals.panel = req.panel;
  // POST tylko z tej samej strony: cookie SameSite=Lax juz nie idzie w cudzym
  // formularzu, a Sec-Fetch-Site / Origin domykaja reszte.
  if (req.method === 'POST') {
    const sfs = req.headers['sec-fetch-site'];
    const origin = req.headers.origin;
    const host = req.headers.host;
    if ((sfs && sfs !== 'same-origin' && sfs !== 'none') ||
        (origin && host && !origin.endsWith('//' + host))) {
      return res.status(403).send('Forbidden');
    }
  }
  next();
});

function wymagajSesji(req, res, next) {
  if (req.panel) return next();
  if (chceJson(req)) return res.status(401).json({ ok: false, error: 'Sesja wygasła. Zaloguj się ponownie.', redirect: '/panel/login/' });
  return sesja.wymagaj(req, res, next);
}

// --- Logowanie -------------------------------------------------------------

// Bez sekretu sesji nie da sie zalogowac - lepiej powiedziec to PRZED
// wyslaniem maila, niz spalic jednorazowy magic link na bledzie 500.
router.use('/login', (req, res, next) => {
  const blad = sesja.bladKonfiguracji();
  if (!blad) return next();
  console.error('[panel] konfiguracja:', blad);
  res.status(503);
  return widok(res, 'komunikat', { naglowek: 'Panel chwilowo niedostępny', tresc: 'Logowanie jest wyłączone do czasu dokończenia konfiguracji. Spróbuj później albo napisz na biuro@powitania.pl.', link: '/', linkTekst: 'Strona główna' });
});

router.get('/login/', (req, res) => {
  if (req.panel) return res.redirect(bezpiecznyNext(req.query.next));
  widok(res, 'login', { title: 'Logowanie do panelu zamówień | powitania.pl', next: bezpiecznyNext(req.query.next), blad: null });
});

router.post('/login/', limitLogowania, verifyTurnstile, a(async (req, res) => {
  const email = tekst(req.body && req.body.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    return widok(res, 'login', { title: 'Logowanie do panelu zamówień | powitania.pl', next: bezpiecznyNext(req.body.next), blad: 'Podaj poprawny adres e-mail.' });
  }
  const odp = await crm.loginLink(email, ipKlienta(req));
  widok(res, 'komunikat', {
    naglowek: 'Sprawdź skrzynkę',
    tresc: (odp && odp.wiadomosc) || 'Jeśli adres jest w systemie, wysłaliśmy link do logowania.',
    dopisek: 'Link działa 15 minut i tylko raz. Nie widzisz wiadomości? Zajrzyj do spamu albo poproś o nowy link.',
    link: '/panel/login/', linkTekst: 'Wróć do logowania',
  });
}));

// Link z maila otwiera strone z formularzem, ktory sam sie wysyla. Klienci
// pocztowi (Outlook SafeLinks, skanery) odwiedzaja linki GET-em - gdyby GET
// zuzywal jednorazowy token, link bylby martwy zanim czlowiek go kliknie.
router.get('/login/verify/', (req, res) => {
  const token = tekst(req.query.t, 200);
  if (!token) {
    res.status(400);
    return widok(res, 'komunikat', { naglowek: 'Niepełny link', tresc: 'Ten link nie zawiera tokenu logowania. Poproś o nowy.', link: '/panel/login/', linkTekst: 'Wróć do logowania' });
  }
  widok(res, 'verify', { title: 'Logowanie | powitania.pl', token, next: bezpiecznyNext(req.query.next) });
});

router.post('/login/verify/', a(async (req, res) => {
  const token = tekst(req.body && req.body.token, 200);
  const odp = await crm.loginVerify(token, ipKlienta(req));
  const u = odp.uzytkownik || {}, k = odp.klient || {};
  sesja.ustaw(res, { u: u.id, k: k.id, email: u.email, imie: u.imie_nazwisko || '', klient: k.nazwa || '', rola: u.rola || 'uzytkownik' });
  res.redirect(bezpiecznyNext(req.body.next));
}));

router.post('/wyloguj/', (req, res) => {
  sesja.wyczysc(res);
  res.redirect('/panel/login/');
});

// --- Strony za logowaniem --------------------------------------------------

router.use(wymagajSesji);

router.get('/', a(async (req, res) => {
  const odp = await crm.zamowienia(req.panel);
  widok(res, 'lista', { zamowienia: odp.zamowienia || [], ok: KOMUNIKATY_OK[req.query.ok] || null });
}));

router.get('/cennik/', a(async (req, res) => {
  const odp = await crm.cennik(req.panel);
  widok(res, 'cennik', { title: 'Cennik | Panel zamówień', cennik: odp.cennik });
}));

router.get('/zamowienia/nowe/', a(async (req, res) => {
  const odp = await crm.cennik(req.panel);
  const dane = (odp.cennik && odp.cennik.dane) || {};
  widok(res, 'nowe', {
    title: 'Nowe zamówienie | Panel zamówień',
    cennik: odp.cennik,
    konfiguracja: { cennik: dane, lektorzy: listaLektorow(dane) },
  });
}));

router.post('/zamowienia/', a(async (req, res) => {
  const b = req.body || {};
  const odpCennik = await crm.cennik(req.panel);
  const dane = (odpCennik.cennik && odpCennik.cennik.dane) || {};
  const pozycje = przygotujPozycje(b.pozycje, listaLektorow(dane));
  const tryb = ['standard', 'ekspres', 'weekend'].includes(b.tryb_realizacji) ? b.tryb_realizacji : 'standard';
  const payload = {
    klient_koncowy: tekst(b.klient_koncowy, 200),
    projekt: tekst(b.projekt, 200),
    termin_realizacji: tekst(b.termin_realizacji, 40),
    termin_sesji: tekst(b.termin_sesji, 40) || null,
    data_emisji: tekst(b.data_emisji, 40) || null,
    tryb_realizacji: tryb,
    sesja_zdalna: Boolean(b.sesja_zdalna),
    uwagi_klienta: tekst(b.uwagi_klienta, 2000),
    pozycje,
    wyslij: Boolean(b.wyslij),
  };
  for (const [pole, etykieta] of [['klient_koncowy', 'Klient końcowy'], ['projekt', 'Nazwa projektu'], ['termin_realizacji', 'Termin realizacji']]) {
    if (!payload[pole]) throw new BladFormularza(`Pole "${etykieta}" jest wymagane.`);
  }
  // Podglad liczony tym samym silnikiem co w przegladarce, ale po NASZEJ
  // stronie - CRM porownuje go ze swoja wycena i rozjazd oznacza flaga.
  let podglad;
  try {
    podglad = PP.policz(dane, { pozycje, tryb_realizacji: tryb, sesja_zdalna: payload.sesja_zdalna });
  } catch (e) {
    if (e instanceof PP.BladWyceny) throw new BladFormularza(e.message);
    throw e;
  }
  if (podglad.suma_netto !== null) payload.suma_podglad = podglad.suma_netto;
  if (payload.wyslij && podglad.blokady.length && !payload.uwagi_klienta) {
    throw new BladFormularza('Zamówienie ma pozycje wymagające ustaleń z Optimum: ' + podglad.blokady.join(' ') + ' Dopisz komentarz w polu uwag albo zapisz jako szkic.');
  }
  const odp = await crm.noweZamowienie(req.panel, payload, ipKlienta(req));
  const z = odp.zamowienie || {};
  const dokad = `/panel/zamowienia/${encodeURIComponent(z.id)}/?ok=${payload.wyslij ? 'wyslane' : 'utworzone'}`;
  if (chceJson(req)) return res.json({ ok: true, redirect: dokad, zamowienie: { id: z.id, numer: z.numer } });
  res.redirect(dokad);
}));

router.get('/zamowienia/:id(\\d+)/', a(async (req, res) => {
  const odp = await crm.zamowienie(req.panel, req.params.id, ipKlienta(req));
  const z = odp.zamowienie;
  const wejscie = {};
  (z.pozycje || []).forEach(p => { wejscie[p.id] = p; });
  // wycena.pozycje ma kwoty i komunikaty, pozycje (wejscie) opisy i nazwy lektorow
  const pozycje = ((z.wycena && z.wycena.pozycje) || z.pozycje || []).map(w => Object.assign({}, wejscie[w.id] || {}, w));
  widok(res, 'szczegoly', {
    title: `Zamówienie ${z.numer || ''} | Panel zamówień`,
    z, pozycje,
    status: STATUSY[z.status] || { etykieta: z.status, klasa: 'bg-gray-200 text-gray-800' },
    ok: KOMUNIKATY_OK[req.query.ok] || null,
  });
}));

router.post('/zamowienia/:id(\\d+)/wyslij/', a(async (req, res) => {
  await crm.wyslij(req.panel, req.params.id, ipKlienta(req));
  res.redirect(`/panel/zamowienia/${req.params.id}/?ok=wyslane`);
}));

router.post('/zamowienia/:id(\\d+)/potwierdz/', a(async (req, res) => {
  if (!req.body || req.body.zgoda !== 'tak') {
    throw new BladFormularza('Zaznacz, że zapoznałeś się z treścią dokumentu, zanim potwierdzisz Zamówienie.');
  }
  await crm.potwierdz(req.panel, req.params.id, ipKlienta(req));
  res.redirect(`/panel/zamowienia/${req.params.id}/?ok=potwierdzone`);
}));

router.post('/zamowienia/:id(\\d+)/anuluj/', a(async (req, res) => {
  const komentarz = String((req.body && req.body.komentarz) || '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
  const odp = await crm.anuluj(req.panel, req.params.id, komentarz, ipKlienta(req));
  if (odp.usuniete) return res.redirect('/panel/?ok=usuniete');
  const st = (odp.zamowienie && odp.zamowienie.status) === 'odrzucone' ? 'odrzucone' : 'wycofane';
  res.redirect(`/panel/zamowienia/${req.params.id}/?ok=${st}`);
}));

async function przekazPdf(req, res, podpisany) {
  const resp = await (podpisany ? crm.pdfPodpisany : crm.pdf)(req.panel, req.params.id, ipKlienta(req));
  if (!resp.ok) {
    let msg = 'Dokument jest niedostępny.';
    try { const d = JSON.parse(await resp.text()); if (d && d.error) msg = d.error; } catch (e) { /* nie-JSON */ }
    throw new crm.BladCRM(msg, resp.status >= 500 ? 502 : resp.status);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', resp.headers.get('content-disposition') || `inline; filename="zamowienie-${req.params.id}${podpisany ? '-podpisane' : ''}.pdf"`);
  res.send(buf);
}
router.get('/zamowienia/:id(\\d+)/dokument.pdf', a((req, res) => przekazPdf(req, res, false)));
router.get('/zamowienia/:id(\\d+)/dokument-podpisany.pdf', a((req, res) => przekazPdf(req, res, true)));

router.use((req, res) => {
  res.status(404);
  widok(res, 'komunikat', { naglowek: 'Nie ma takiej strony', tresc: 'Adres w panelu jest nieprawidłowy.', link: '/panel/', linkTekst: 'Wróć do zamówień' });
});

module.exports = router;
