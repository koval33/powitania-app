require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Asset version - bumpuje się przy każdym restarcie serwera (czyli każdym deployu).
// Używane jako query param ?v=<assetVersion> w <script src="..."> żeby po deployu
// przeglądarki nie serwowały starej wersji JS z cache (maxAge: 1d na static).
const ASSET_VERSION = Date.now().toString(36);

// Przekierowanie: powitania.pl → www.powitania.pl (301)
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host === 'powitania.pl' || host === 'powitania-app-production.up.railway.app') {
    return res.redirect(301, 'https://www.powitania.pl' + req.originalUrl);
  }
  next();
});

// Strip ?srsltid=... query param (dodawany przez Google Ads click) - 301 na czysty URL.
// Bez tego Google traktuje kazdy unikalny srsltid jako osobna strone = rozmywanie
// autorytetu + duplicate content signal. Razem z robots.txt Disallow + canonical
// to trojwarstwowa ochrona przed indeksacja smieci.
app.use((req, res, next) => {
  if (req.query.srsltid !== undefined) {
    const url = new URL(req.originalUrl, `https://${req.headers.host}`);
    url.searchParams.delete('srsltid');
    return res.redirect(301, url.pathname + url.search + url.hash);
  }
  next();
});

// Zachowanie query string (gclid, utm_*, fbclid) przy KAŻDYM przekierowaniu wewnętrznym.
// Bez tego res.redirect(301, '/nowy-adres/') gubi parametry -> psuje atrybucję konwersji Google Ads
// (kliknięcie traci gclid, algorytm nie uczy się z konwersji). Obejmuje trailing slash i wszystkie
// 301 ze starych URL-ów. Parametry doklejane tylko gdy cel ich jeszcze nie ma (!url.includes('?')).
// MUSI być PO srsltid-strip wyżej: tamten redirect celowo usuwa parametr, patch doklejałby go
// z powrotem (pętla 301 przy URL z samym ?srsltid).
app.use((req, res, next) => {
  const nativeRedirect = res.redirect.bind(res);
  res.redirect = (statusOrUrl, maybeUrl) => {
    let status = 302;
    let url = statusOrUrl;
    if (typeof statusOrUrl === 'number') { status = statusOrUrl; url = maybeUrl; }
    const qPos = req.originalUrl.indexOf('?');
    const incomingQs = qPos !== -1 ? req.originalUrl.slice(qPos) : '';
    if (incomingQs && typeof url === 'string' && !url.includes('?')) {
      url += incomingQs;
    }
    return nativeRedirect(status, url);
  };
  next();
});

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (/\.(css|js)$/i.test(filePath)) {
      // CSS/JS są wersjonowane przez ?v=ASSET_VERSION (nowa wartość co deploy),
      // więc długi immutable cache jest bezpieczny - zero ryzyka stale.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(webp|png|jpe?g|gif|svg|ico|avif|woff2?|ttf|otf|mp3|mp4|webm|mov)$/i.test(filePath)) {
      // Statyczne media (logo, zdjęcia sekcji, tło hero, fonty) zmieniają się
      // rzadko - 30 dni. Przy podmianie pliku: zmień nazwę pliku.
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
    // pozostałe pliki: domyślny maxAge '1d'
  }
}));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Data - dynamiczne ładowanie (admin może edytować)
const fs = require('fs');
const multer = require('multer');

// Inicjalizacja plików danych z seedów (Railway volume montuje pusty katalog)
//
// Pliki "developer-managed" (alwaysOverwrite) - kazdy deploy nadpisuje z repo.
// Uzywaj dla danych edytowanych GLOWNIE przez kod/git (nie przez admin panel).
//
// Pliki "panel-managed" (NIE w alwaysOverwrite, np. voices.json, reviews.json) -
// kopiowane TYLKO przy fresh volume (bootstrap). Po pierwszym deploy persistent
// na Railway volume - admin panel jest zrodlem prawdy. Deploy NIE psuje akceptacji,
// drag&drop, edycji stawek wykonanych w panelu.
//
// HISTORIA: voices.json byl w alwaysOverwrite do 2026-05-09. Race condition:
// user akceptowal lektora w panelu, push commitu z innym kodem trigger'owal
// deploy, ktory nadpisywal data/voices.json wersja z gita (gdzie approved=false).
// Akceptacja ginela. Wyrzucono voices.json - panel jest teraz source of truth.
const dataDir = path.join(__dirname, 'data');
const seedDir = path.join(__dirname, 'data-seed');
// UWAGA: ims-offer.json NIE jest tu - jest edytowane w runtime (panel oferty IMS),
// wiec data/ jest zrodlem prawdy (jak voices.json). data-seed/ = tylko bootstrap.
const alwaysOverwrite = ['blog-posts.json', 'melodies.json', 'partners.json'];
if (fs.existsSync(seedDir)) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.readdirSync(seedDir).forEach(file => {
    const dest = path.join(dataDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(seedDir, file), dest);
      console.log('[init] Seeded', file, 'from data-seed/');
    } else if (alwaysOverwrite.includes(file)) {
      fs.copyFileSync(path.join(seedDir, file), dest);
      console.log('[init] Overwritten', file, 'from data-seed/ (developer content)');
    }
  });
  // Upewnij się że katalog orders istnieje
  const ordersDir = path.join(dataDir, 'orders');
  if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });
}

const voicesPath = path.join(__dirname, 'data', 'voices.json');
const reviewsPath = path.join(__dirname, 'data', 'reviews.json');
const blogPath = path.join(__dirname, 'data', 'blog-posts.json');
const partnersPath = path.join(__dirname, 'data', 'partners.json');
const melodiesPath = path.join(__dirname, 'data', 'melodies.json');
// IMS_OFFER_PATH pozwala wskazac inny plik (np. tymczasowy do testow E2E),
// dzieki czemu testy NIGDY nie dotykaja realnych danych operatora.
const imsOfferPath = process.env.IMS_OFFER_PATH || path.join(__dirname, 'data', 'ims-offer.json');
function loadVoices(opts = {}) {
  // includeDrafts=true zwraca wszystkich (admin), default tylko approved (publiczne)
  let voices = JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
  if (!opts.includeDrafts) {
    voices = voices.filter(v => v.approved === true);
  }
  return voices.sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
}
function loadReviews() {
  return JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
}
function loadBlogPosts() {
  return JSON.parse(fs.readFileSync(blogPath, 'utf8'));
}
function loadImsOffer() {
  try { return JSON.parse(fs.readFileSync(imsOfferPath, 'utf8')); }
  catch { return null; }
}
function saveImsOffer(data) {
  fs.writeFileSync(imsOfferPath, JSON.stringify(data, null, 2) + '\n');
}
// Kwota -> kanoniczne "<liczba> EUR" (€/euro/eur -> EUR; sama liczba dostaje EUR;
// tekst typu "do ustalenia" zostaje bez zmian).
function imsNormPrice(val) {
  let s = String(val == null ? '' : val).trim();
  if (!s) return '';
  s = s.replace(/\s*(€|euro|eur)/gi, ' EUR').replace(/\s{2,}/g, ' ').trim();
  if (/\d/.test(s) && !/EUR/.test(s)) s += ' EUR';
  return s;
}
// Markup dla Klienta IMS: kazda liczbe w stawce zwiekszamy o 50 EUR i zaokraglamy
// do gornej dziesiatki. Plus floor (cena minimum widziana przez Klienta) -
// rozny per kanal, plus override per jezyk. Operator panel zawsze widzi raw.
//
// Reguly:
// - "202 EUR" -> "260 EUR" (202+50=252, ceil/10 = 260)
// - Zakres "400-1200 EUR" -> "450-1250 EUR" (markup obu koncow)
// - "od 50 EUR" -> "od 100 EUR" -> z floorem 220: "od 220 EUR"
// - "do ustalenia" -> bez zmian (brak cyfr, floor nie dotyczy)
// - Chaos typu "460 EUR (Austria) / 500 EUR (Niemcy)": wykrywamy "/" + nawiasy =>
//   bierzemy MAX z liczb (nigdy nie zanizamy), kontekst znika, Klient widzi jedna
//   czysta stawke po markupie+floor.
// - Floor: kazda liczba po markupie clampowana do min(channel, lang). Zakres
//   sklejony do "X-X" -> zwijamy do "X".
// - Liczby <10 lub >10000 pomijamy (sanity check przeciw cyfrom w opisach).
const IMS_CLIENT_FLOOR_DEFAULT = { radio: 220, gallery: 180 };
const IMS_CLIENT_FLOOR_BY_LANG = {
  'Niemiecki': { radio: 250, gallery: 200 }
};

function imsMarkupPrice(val, channel, lang) {
  if (val == null) return '';
  let s = String(val);
  // Krok 1: chaos informacyjny (wiele opcji z kontekstem oddzielonych "/") -> max
  if (s.indexOf('/') !== -1 && s.indexOf('(') !== -1) {
    const nums = (s.match(/\d+/g) || [])
      .map(function (n) { return parseInt(n, 10); })
      .filter(function (n) { return isFinite(n) && n >= 10 && n <= 10000; });
    if (nums.length) {
      s = Math.max.apply(null, nums) + ' EUR';
    }
  }
  // Krok 2: markup kazdej liczby + clamp do floora (channel + opcjonalnie override per lang)
  const floors = (lang && IMS_CLIENT_FLOOR_BY_LANG[lang]) || IMS_CLIENT_FLOOR_DEFAULT;
  const floor = (channel && floors[channel]) || 0;
  s = s.replace(/\d+/g, function (m) {
    const n = parseInt(m, 10);
    if (!isFinite(n) || n < 10 || n > 10000) return m;
    const bumped = Math.ceil((n + 50) / 10) * 10;
    return String(Math.max(bumped, floor));
  });
  // Krok 3: zakres "X-X" (oba konce zclamowane do tej samej wartosci) -> "X"
  s = s.replace(/(\d+)[-–](\d+)/g, function (match, a, b) {
    return a === b ? a : match;
  });
  return s;
}
// Katalog na pliki demo mp3 oferty IMS - na wolumenie (data/), zeby przetrwaly deploy.
// public/ jest efemeryczne (kasowane przy redeploy Railway), data/ to persistent volume.
const imsAudioDir = process.env.IMS_DEMO_DIR || path.join(__dirname, 'data', 'ims-demos');
try { fs.mkdirSync(imsAudioDir, { recursive: true }); } catch (e) {}
// Proste logowanie do edycji oferty IMS (Basic Auth)
const IMS_USER = process.env.IMS_OFFER_USER || 'ims';
const IMS_CLIENT_PASS = process.env.IMS_CLIENT_PASS || 'ofertaims2026';
const IMS_OPERATOR_PASS = process.env.IMS_OPERATOR_PASS || 'Savanas1Lagunas2';
function imsBasicAuth(pass, realm) {
  return function (req, res, next) {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    const m = (req.headers.authorization || '').match(/^Basic\s+(.+)$/i);
    if (m) {
      const dec = Buffer.from(m[1], 'base64').toString('utf8');
      const idx = dec.indexOf(':');
      const u = idx >= 0 ? dec.slice(0, idx) : '';
      const p = idx >= 0 ? dec.slice(idx + 1) : '';
      if (u === IMS_USER && p === pass) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="' + realm + '"');
    return res.status(401).send('Wymagane logowanie.');
  };
}
// Klient: oferta read-only. Operator: panel edycji (inne haslo, inny realm).
const imsClientAuth = imsBasicAuth(IMS_CLIENT_PASS, 'Oferta IMS');
const imsAuth = imsBasicAuth(IMS_OPERATOR_PASS, 'Oferta IMS - panel edycji');
// Pliki demo: dostep dla Klienta LUB operatora. Realm taki sam jak u Klienta ('Oferta IMS'),
// zeby przegladarka automatycznie wyslala te same dane logowania co dla /oferta-ims/.
function imsAnyAuth(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const m = (req.headers.authorization || '').match(/^Basic\s+(.+)$/i);
  if (m) {
    const dec = Buffer.from(m[1], 'base64').toString('utf8');
    const idx = dec.indexOf(':');
    const u = idx >= 0 ? dec.slice(0, idx) : '';
    const p = idx >= 0 ? dec.slice(idx + 1) : '';
    if (u === IMS_USER && (p === IMS_CLIENT_PASS || p === IMS_OPERATOR_PASS)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Oferta IMS"');
  return res.status(401).send('Wymagane logowanie.');
}
// Upload mp3 demo - tylko .mp3, max 15 MB, nazwa tymczasowa (finalna w handlerze)
const imsUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) { cb(null, imsAudioDir); },
    filename: function (req, file, cb) {
      cb(null, 'tmp-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + '.mp3');
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ok = /audio\/(mpeg|mp3)/i.test(file.mimetype) || /\.mp3$/i.test(file.originalname);
    cb(ok ? null : new Error('Tylko pliki MP3'), ok);
  }
}).single('demo');
function loadPartners() {
  try { return JSON.parse(fs.readFileSync(partnersPath, 'utf8')); }
  catch { return []; }
}
function loadMelodies() {
  try { return JSON.parse(fs.readFileSync(melodiesPath, 'utf8')); }
  catch { return []; }
}

// Healthcheck - monitorowany przez UptimeRobot
app.get('/api/health', (req, res) => {
  const checks = {};
  let ok = true;

  // Sprawdź pliki danych
  const dataFiles = { voices: voicesPath, reviews: reviewsPath, blog: blogPath, partners: partnersPath, melodies: melodiesPath };
  for (const [name, filePath] of Object.entries(dataFiles)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      checks[name] = { ok: true, count: Array.isArray(data) ? data.length : 'object' };
    } catch (err) {
      checks[name] = { ok: false, error: err.message };
      ok = false;
    }
  }

  // Sprawdź katalog zamówień
  const ordersDir = path.join(__dirname, 'data', 'orders');
  try {
    checks.ordersDir = { ok: fs.existsSync(ordersDir), writable: true };
    // Test zapisu
    const testFile = path.join(ordersDir, '.healthcheck');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (err) {
    checks.ordersDir = { ok: false, writable: false, error: err.message };
    ok = false;
  }

  const status = ok ? 200 : 503;
  res.status(status).json({ ok, timestamp: new Date().toISOString(), checks });
});

// Trailing slash redirect
app.use((req, res, next) => {
  if (req.path !== '/' && !req.path.endsWith('/') && !req.path.includes('.') && !req.path.startsWith('/api/')) {
    return res.redirect(301, req.path + '/' + (req.search || ''));
  }
  next();
});

// Embed / partner middleware
app.use((req, res, next) => {
  res.locals.skipHeader = req.query.skip_header === '1';
  res.locals.isEmbed = res.locals.skipHeader;
  res.locals.currentPath = req.path;
  // SEO: strony z query param ?express=1 są duplikatem canonical URL-a (strona lektora),
  // więc nie powinny być indeksowane. Audyt SEO 23.04.2026.
  res.locals.hasNoindexQuery = req.query.express === '1';
  res.locals.reviewCount = loadReviews().filter(r => r.approved).length;
  // voiceCount: dynamiczna liczba zaakceptowanych lektorow w banku glosow.
  // ZAWSZE uzywaj res.locals.voiceCount (EJS) lub ${voiceCount} (server.js template literals).
  // NIE hardkoduj liczby - po acceptance nowego drafta liczba zmienia sie automatycznie.
  res.locals.voiceCount = loadVoices().length;
  res.locals.gtmId = process.env.GTM_ID || '';
  res.locals.clarityProjectId = process.env.CLARITY_PROJECT_ID || '';
  res.locals.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || '';
  res.locals.assetVersion = ASSET_VERSION;

  // Hreflang: PL ↔ EN URL mapping for SEO
  var hreflangMap = {
    '/': '/en/',
    '/bank-glosow/': '/en/voice-bank/',
    '/cennik-nagran-lektorskich/': '/en/pricing/',
    '/kontakt/': '/en/contact/',
    '/nagrania-lektorskie/': '/en/voiceover-services/',
    '/nagrania-lektorskie/glos-do-reklamy/': '/en/voiceover-services/voice-for-advertising/',
    '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/': '/en/voiceover-services/film-voiceover/',
    '/nagrania-lektorskie/zapowiedzi-telefoniczne/': '/en/voiceover-services/phone-announcements/',
    '/nagrania-lektorskie/audioprzewodniki/': '/en/voiceover-services/audio-guides/',
    '/produkcja-jingli-reklamowych/': '/en/advertising-jingles/',
    '/sesje-zdalne-nagrania-lektorskie-online/': '/en/remote-sessions/',
    '/nagranie-ekspresowe/': '/en/express-recording/',
    '/kreator/': '/en/kreator/',
    '/aktualnosci-pl/': '/en/news/',
    '/polityka-prywatnosci/': '/en/privacy-policy/'
  };
  var path = req.path;
  if (path.startsWith('/en/')) {
    // EN page → find PL equivalent
    for (var pl in hreflangMap) {
      if (hreflangMap[pl] === path) {
        res.locals.hreflangPL = 'https://www.powitania.pl' + pl;
        res.locals.hreflangEN = 'https://www.powitania.pl' + path;
        break;
      }
    }
    // Dynamic: EN voice-artist → PL lektor
    var vaMatch = path.match(/^\/en\/voice-artists\/([^/]+)\/$/);
    if (vaMatch) {
      res.locals.hreflangPL = 'https://www.powitania.pl/lektorzy/' + vaMatch[1] + '/';
      res.locals.hreflangEN = 'https://www.powitania.pl' + path;
    }
  } else {
    // PL page → find EN equivalent
    if (hreflangMap[path]) {
      res.locals.hreflangPL = 'https://www.powitania.pl' + path;
      res.locals.hreflangEN = 'https://www.powitania.pl' + hreflangMap[path];
    }
    // Dynamic: PL lektor → EN voice-artist
    var lMatch = path.match(/^\/lektorzy\/([^/]+)\/$/);
    if (lMatch) {
      res.locals.hreflangPL = 'https://www.powitania.pl' + path;
      res.locals.hreflangEN = 'https://www.powitania.pl/en/voice-artists/' + lMatch[1] + '/';
    }
  }

  // Dynamic: blog post hreflang (PL /aktualnosci-pl/:slug/ ↔ EN /en/news/:slug/).
  // hreflangEN ustawiany tylko jeśli post ma pełne tłumaczenie (titleEn + contentEn)
  // - spójne z warunkiem w sitemap.xml (linia ~1152).
  var blogPlMatch = path.match(/^\/aktualnosci-pl\/([^/]+)\/$/);
  var blogEnMatch = path.match(/^\/en\/news\/([^/]+)\/$/);
  if (blogPlMatch || blogEnMatch) {
    var urlSlug = (blogPlMatch || blogEnMatch)[1];
    try {
      var posts = loadBlogPosts();
      var post;
      if (blogPlMatch) {
        post = posts.find(function(p) { return p.slug === urlSlug; });
      } else {
        // EN URL używa post.slugEn; fallback na p.slug dla legacy linków
        post = posts.find(function(p) { return (p.slugEn || p.slug) === urlSlug; });
      }
      if (post) {
        res.locals.hreflangPL = 'https://www.powitania.pl/aktualnosci-pl/' + post.slug + '/';
        if (post.titleEn && post.contentEn) {
          res.locals.hreflangEN = 'https://www.powitania.pl/en/news/' + (post.slugEn || post.slug) + '/';
        }
      }
    } catch(e) {}
  }

  if (res.locals.isEmbed) {
    res.removeHeader('X-Frame-Options');
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  next();
});

// Auto-redirect non-Polish browsers to English version (only on homepage)
// WYŁĄCZONE 2026-04-17 - na zalecenie konsultacji SEO. Powód: Googlebot (mimo user-agent
// exclude) w niektórych przypadkach trafiał na EN zamiast PL, co psuło indeksację strony
// polskiej jako kanonicznej. Przełącznik języka PL/EN w nagłówku pozwala użytkownikowi
// ręcznie wybrać wersję. Kod zachowany w komentarzu - gdyby trzeba było wrócić.
//
// app.use((req, res, next) => {
//   if (req.method !== 'GET' || req.path !== '/') return next();
//   // Respect explicit language preference
//   if (req.query.lang === 'pl') return next();
//   // Don't redirect bots/crawlers (they should index PL as canonical)
//   // Includes AI crawlers: GPTBot, ClaudeBot, PerplexityBot, Bytespider, Google-Extended
//   const ua = req.headers['user-agent'] || '';
//   if (/bot|crawl|spider|slurp|google|bing|yandex|lighthouse|pagespeed|gtmetrix|pingdom|webpagetest|GPTBot|ChatGPT|ClaudeBot|Claude-Web|PerplexityBot|Bytespider|CCBot|Google-Extended/i.test(ua)) return next();
//   // Inform caches that response varies by language
//   res.setHeader('Vary', 'Accept-Language');
//   // Check Accept-Language header
//   const lang = req.headers['accept-language'] || '';
//   if (!lang.match(/pl/i)) {
//     return res.redirect(302, '/en/');
//   }
//   next();
// });

// 301 Redirects - zachowanie starych URL-ów (20 lat SEO history)
app.get('/lektor/:slug/', (req, res) => res.redirect(301, '/lektorzy/' + req.params.slug + '/'));
// Martwy URL z zewnetrznego audytu (100% bounce na 404) - kierujemy na kontakt
app.get('/dodawanie-lektora/', (req, res) => res.redirect(301, '/kontakt/'));

// Slug cleanup - 301 ze starych slugów z cyframi na czyste
app.get('/lektorzy/dorota-3/',         (req, res) => res.redirect(301, '/lektorzy/dorota-radio/'));
app.get('/lektorzy/michal-5/',         (req, res) => res.redirect(301, '/lektorzy/michal-wszechstronny/'));
app.get('/lektorzy/patryk-2-2/',       (req, res) => res.redirect(301, '/lektorzy/patryk-baryton/'));
app.get('/lektorzy/patryk-2/',         (req, res) => res.redirect(301, '/lektorzy/patryk-baryton/'));
app.get('/lektorzy/anna-2-2/',         (req, res) => res.redirect(301, '/lektorzy/anna-narracja/'));
app.get('/lektorzy/anna-2/',           (req, res) => res.redirect(301, '/lektorzy/anna-narracja/'));
app.get('/lektorzy/marcin-2/',         (req, res) => res.redirect(301, '/lektorzy/marcin-dubbing/'));
app.get('/lektorzy/krzysztof-2/',      (req, res) => res.redirect(301, '/lektorzy/krzysztof-niski-glos/'));
app.get('/lektorzy/maciej-3/',         (req, res) => res.redirect(301, '/lektorzy/maciej-szeptanka/'));
app.get('/lektorzy/krzysztof_4/',      (req, res) => res.redirect(301, '/lektorzy/krzysztof-studio/'));
app.get('/lektorzy/michal-4/',         (req, res) => res.redirect(301, '/lektorzy/michal-reklamowy/'));
app.get('/lektorzy/marcin-5/',         (req, res) => res.redirect(301, '/lektorzy/marcin-weteran/'));
app.get('/lektorzy/alicja-2/',         (req, res) => res.redirect(301, '/lektorzy/alicja-wszechstronna/'));
app.get('/lektorzy/daniel-2/',         (req, res) => res.redirect(301, '/lektorzy/daniel-radiowy/'));
app.get('/lektorzy/agnieszka-3/',      (req, res) => res.redirect(301, '/lektorzy/agnieszka-dzieci/'));
app.get('/lektorzy/kim-2/',            (req, res) => res.redirect(301, '/lektorzy/kim-dubbing/'));
app.get('/lektorzy/natalia_2/',        (req, res) => res.redirect(301, '/lektorzy/natalia-wszechstronna/'));
app.get('/lektorzy/marek-2/',          (req, res) => res.redirect(301, '/lektorzy/marek-pl-en/'));
app.get('/lektorzy/lukasz-2/',         (req, res) => res.redirect(301, '/lektorzy/lukasz-reklamy/'));
app.get('/lektorzy/mateusz-2/',        (req, res) => res.redirect(301, '/lektorzy/mateusz-mlody/'));
app.get('/lektorzy/maciej-2/',         (req, res) => res.redirect(301, '/lektorzy/maciej-spiker/'));
app.get('/lektorzy/michal-3/',         (req, res) => res.redirect(301, '/lektorzy/michal-dj/'));
app.get('/lektorzy/katarzyna-2/',      (req, res) => res.redirect(301, '/lektorzy/katarzyna-tv/'));
app.get('/lektorzy/krzysztof-3/',      (req, res) => res.redirect(301, '/lektorzy/krzysztof-ekspresowy/'));
app.get('/lektorzy/mateusz-3/',        (req, res) => res.redirect(301, '/lektorzy/mateusz-wszechstronny/'));
app.get('/lektorzy/piotr-2/',          (req, res) => res.redirect(301, '/lektorzy/piotr-niski/'));
app.get('/lektorzy/agnieszka-2/',      (req, res) => res.redirect(301, '/lektorzy/agnieszka-dubbing/'));

// 1.1 Zombie URLs - stare WordPress attachment paths indeksowane przez Google
app.get('/lektorzy/kuba-bielak.webp',        (req, res) => res.redirect(301, '/lektorzy/kuba-bielak/'));
app.get('/lektorzy/lukasz-nowicki.webp',      (req, res) => res.redirect(301, '/lektorzy/lukasz-nowicki/'));
app.get('/lektorzy/przemyslaw-skowron.webp',  (req, res) => res.redirect(301, '/lektorzy/przemyslaw-skowron/'));
app.get('/lektorzy/maciej-jablonski.webp',    (req, res) => res.redirect(301, '/lektorzy/maciej-jablonski/'));
app.get('/lektorzy/jacek-brzostynski.webp',   (req, res) => res.redirect(301, '/lektorzy/jacek-brzostynski/'));
app.get('/lektorzy/stanislaw-olejniczak.webp',(req, res) => res.redirect(301, '/lektorzy/stanislaw-olejniczak/'));
// Usunięci lektorzy - 410 Gone (Google usuwa z indeksu)
app.get('/lektorzy/slawek-2/', (req, res) => res.status(410).end());
app.get('/lektorzy/zosia/',    (req, res) => res.status(410).end());
app.get('/lektorzy/barbara/',  (req, res) => res.status(410).end());
app.get('/lektorzy/mikolaj/',  (req, res) => res.status(410).end());
app.get('/lektorzy/barbara-2/',      (req, res) => res.status(410).end());
app.get('/lektorzy/gabriela/',       (req, res) => res.status(410).end());
app.get('/lektorzy/krystyna-loska/', (req, res) => res.status(410).end());
app.get('/lektorzy/tomasz-knapik/',  (req, res) => res.status(410).end());
// EN - usunięci lektorzy
app.get('/en/voice-artists/marcin-2/', (req, res) => res.redirect(301, '/en/voice-artists/marcin-dubbing/'));

// GSC 404 cleanup (20.04.2026) - stare WordPress / root-level URL-e
// 301 - przekierowania na poprawne adresy
app.get('/marcin-2/',    (req, res) => res.redirect(301, '/lektorzy/marcin-dubbing/'));
app.get('/contact/',     (req, res) => res.redirect(301, '/en/contact/'));
app.get('/category/glosy-meskie/',  (req, res) => res.redirect(301, '/bank-glosow/meskie/'));
app.get('/category/glosy-zenskie/', (req, res) => res.redirect(301, '/bank-glosow/zenskie/'));
app.get('/bank-glosow/page/:page/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/aktualnosci-pl/page/:page/', (req, res) => res.redirect(301, '/aktualnosci-pl/strona/' + req.params.page + '/'));
app.get('/szukaj/page/*',           (req, res) => res.redirect(301, '/bank-glosow/'));
// 410 - usunięte strony (WordPress, stare blogi, API, truncated URLs)
app.get('/lektor/',       (req, res) => res.status(410).end());
app.get('/miksowanie-probne/', (req, res) => res.status(410).end());
app.get('/category/nagrania-ekspresowe/', (req, res) => res.status(410).end());
app.get('/bank/znani-i-*',     (req, res) => res.status(410).end());
app.get('/sesje-',             (req, res) => res.status(410).end());
app.get('/laura-samojlowicz-dolaczyla-*', (req, res) => res.status(410).end());
app.get('/wp-admin/*',         (req, res) => res.status(410).end());
app.get('/wp-content/*',       (req, res) => res.status(410).end());
app.get('/wp-*.php',           (req, res) => res.status(410).end());
app.get('/aktualnosci-pl/generowanie-plikow-srt/', (req, res) => res.status(410).end());
app.get('/en/news/native-speakers-wanted/',        (req, res) => res.status(410).end());
app.get('/en/news/voiceover-recording-for-electronic-brain/', (req, res) => res.status(410).end());
// 301 dla legacy news slug (musi być PRZED dynamic /en/news/:slug/ route na linii ~1140, bo inaczej dynamic route zwraca 404)
app.get('/en/news/new-functionality-mix-it-yourself/', (req, res) => res.redirect(301, '/en/news/'));

app.get('/faq/', (req, res) => res.redirect(301, '/faq-pl/'));
app.get('/sesje-zdalne/', (req, res) => res.redirect(301, '/sesje-zdalne-nagrania-lektorskie-online/'));
app.get('/nagrania-lektorskie/lektor-do-filmow/', (req, res) => res.redirect(301, '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/'));
app.get('/lista-lektorow/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/szukaj/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/ceny-lektora/', (req, res) => res.redirect(301, '/cennik-nagran-lektorskich/'));
app.get('/ceny-lektora', (req, res) => res.redirect(301, '/cennik-nagran-lektorskich/'));
app.get('/voice-over/', (req, res) => res.redirect(301, '/'));
app.get('/twoj-bank-glosow/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/nagranie/', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));
app.get('/referencje/', (req, res) => res.redirect(301, '/opinie/'));
app.get('/search/*', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/search/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/uncategorized-pl/*', (req, res) => res.redirect(301, '/aktualnosci-pl/'));

// 301 Redirects - WordPress feed/RSS URLs (nie istnieją w nowym serwisie)
app.get('*/feed/rss2/', (req, res) => res.redirect(301, '/'));
app.get('*/feed/', (req, res) => res.redirect(301, '/'));

// 301 Redirects - stare WordPress URLs powodujące 5xx w Google Search Console
app.get('/wp-content/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-includes/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-admin/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-login.php', (req, res) => res.redirect(301, '/'));

// 301 Redirects - strony systemowe (nie istnieją w nowym serwisie)
['/podziekowanie-za-zlozenie-zamowienia/', '/podziekowanie-za-opinie/',
 '/podziekowanie-za-oplacenie-zamowienia/', '/newsletter/',
 '/newsletter/newsletter-anulowanie/', '/potwierdzenie-dodania-lektora/',
 '/formularz-lektora/', '/powitanie-na-swieta/',
 '/cos-poszlo-nie-tak-z-zamowieniem/'].forEach(path => {
  app.get(path, (req, res) => res.redirect(301, '/'));
});

// API routes
app.use('/api/kreator', require('./routes/api-kreator'));
app.use('/api/contact', require('./routes/api-contact'));
app.use('/api/payment', require('./routes/api-payment'));
app.use('/api/reviews', require('./routes/api-reviews'));

// API: sprawdź dostępność filmów YouTube (proxy oEmbed - CORS)
app.get('/api/yt-check', async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  if (!ids.length) return res.json({ results: {} });
  const results = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const r = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json');
      results[id] = r.ok;
    } catch { results[id] = false; }
  }));
  res.json({ results });
});

// Health check - kreator (testuje połączenie z Anthropic API)
app.get('/api/health/kreator', async (req, res) => {
  const secret = process.env.HEALTH_SECRET;
  if (secret && req.query.key !== secret) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not set' });
  }

  try {
    const start = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Odpowiedz jednym słowem: OK' }]
      })
    });
    const data = await response.json();
    const ms = Date.now() - start;

    if (response.ok && data.content && data.content[0]) {
      res.json({ ok: true, ms, model: 'claude-sonnet-4-20250514' });
    } else {
      console.error('[health] Kreator API error:', data);
      res.status(500).json({ ok: false, error: data.error?.message || 'API error', ms });
    }
  } catch (err) {
    console.error('[health] Kreator check failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Public API
app.use('/api/voices', require('./routes/api-voices'));

// Admin
app.use('/admin/lektorzy', require('./routes/admin'));
app.use('/admin/opinie', require('./routes/admin-opinie'));
app.use('/admin/partnerzy', require('./routes/admin-partnerzy'));

// Page routes
app.get('/', (req, res) => {
  const voiceCount = res.locals.voiceCount;
  res.render('index', {
    title: `Studio Lektorskie i Usługi Lektorskie od 2001 - ${voiceCount} lektorów`,
    description: `Profesjonalne studio lektorskie i kompleksowe usługi lektorskie od 2001 roku. ${voiceCount} lektorów, nagrania do reklam, filmów, IVR, audiobooków. Wycena w 30 minut.`,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' }
    ],
    voices: loadVoices(),
    posts: loadBlogPosts().slice(0, 6)
  });
});

app.get('/bank-glosow/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Bank głosów lektorskich | Powitania.pl – Studio Lektorskie',
    description: `Bank głosów lektorskich Powitania.pl - ${res.locals.voiceCount} profesjonalnych lektorów w 30+ językach. Odsłuchaj próbek, filtruj po języku, płci i stylu. Studio od 2001 r.`,
    pageHeroTransparent: true,
    mainClass: 'bank-dark',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Bank głosów', url: '/bank-glosow/' }
    ],
    voices: loadVoices()
  });
});

// 1.2 Gender-specific URLs
app.get('/bank-glosow/meskie/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Głosy męskie - 143 lektorów do nagrań | powitania.pl',
    description: 'Bank głosów męskich. 143 profesjonalnych lektorów - dokumentalny, reklamowy, narracyjny. Odsłuchaj próbki i zamów nagranie. Studio powitania.pl od 2001 roku.',
    voices: loadVoices().filter(v => v.gender === 'm'),
    genderSegment: 'm',
    pageH1: 'Głosy męskie do nagrań',
    pageHeroTransparent: true,
    mainClass: 'bank-dark'
  });
});
app.get('/bank-glosow/zenskie/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Głosy żeńskie - 91 lektorek do nagrań | powitania.pl',
    description: 'Bank głosów żeńskich. 91 profesjonalnych lektorek - ciepły, elegancki, dynamiczny. Odsłuchaj próbki i zamów nagranie. Studio powitania.pl od 2001 roku.',
    voices: loadVoices().filter(v => v.gender === 'f'),
    genderSegment: 'f',
    pageH1: 'Głosy żeńskie do nagrań',
    pageHeroTransparent: true,
    mainClass: 'bank-dark'
  });
});
app.get('/bank/glosy-meskie/', (req, res) => res.redirect(301, '/bank-glosow/meskie/'));
app.get('/bank/glosy-zenskie/', (req, res) => res.redirect(301, '/bank-glosow/zenskie/'));

app.get('/lektorzy/:slug/', (req, res) => {
  const voices = loadVoices();
  const lektor = voices.find(v => v.id === req.params.slug);
  if (!lektor) {
    return res.status(404).render('placeholder', {
      title: '404 | powitania.pl',
      description: 'Nie znaleziono lektora',
      heading: 'Nie znaleziono lektora',
      message: 'Lektor o podanym identyfikatorze nie istnieje. <a href="/bank-glosow/" class="text-accent hover:underline">Wróć do banku głosów</a>.'
    });
  }
  // Podobni lektorzy: ta sama płeć, losowo 5
  const similar = voices
    .filter(v => v.id !== lektor.id && v.gender === lektor.gender && v.photo)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  res.render('lektor', {
    title: lektor.seoTitle || (lektor.name + ' - Lektor | powitania.pl'),
    description: lektor.seoDescription || lektor.description || ('Profil lektora ' + lektor.name + '. Odsłuchaj próbki głosowe i zamów nagranie.'),
    ogImage: lektor.photo ? ('https://www.powitania.pl' + lektor.photo) : undefined,
    mainClass: 'lektor-dark',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Bank głosów', url: '/bank-glosow/' },
      { name: lektor.name, url: '/lektorzy/' + lektor.id + '/' }
    ],
    lektor: lektor,
    similar: similar,
    isExpress: req.query.express === '1',
    melodies: loadMelodies()
  });
});

// Stary URL → 301 na nowy keyword-matched URL
app.get('/cennik/', (req, res) => res.redirect(301, '/cennik-nagran-lektorskich/'));

app.get('/cennik-nagran-lektorskich/', (req, res) => {
  res.render('cennik', {
    title: 'Cennik nagrań lektorskich od 300 zł | Powitania.pl',
    description: `Cennik nagrań lektorskich Powitania.pl: lektor reklamowy od 300 zł, narracja 340 zł/A4, IVR 380 zł. ${res.locals.voiceCount} lektorów, 24-48h, native speakers od 600 zł.`,
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Cennik nagrań lektorskich', url: '/cennik-nagran-lektorskich/' }
    ]
  });
});

app.get('/faq-pl/', (req, res) => {
  res.render('faq', {
    title: 'FAQ | powitania.pl',
    description: 'Odpowiedzi na najczęściej zadawane pytania o nagrania lektorskie, formaty plików, instalację w centralach i proces zamawiania.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'FAQ', url: '/faq-pl/' }
    ]
  });
});

app.get('/kontakt/', (req, res) => {
  res.render('kontakt', {
    title: 'Kontakt | powitania.pl',
    description: 'Skontaktuj się ze Studiem Lektorskim Powitania.pl. Nagrania lektorskie w 24-48h, ponad 200 lektorów, 30+ języków. Odpowiadamy w ciągu 2 godzin.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Kontakt', url: '/kontakt/' }
    ]
  });
});

app.get('/opinie/', (req, res) => {
  const allReviews = loadReviews();
  const reviews = allReviews.filter(r => r.approved);
  res.render('opinie', {
    title: 'Opinie Klientów | powitania.pl',
    description: 'Opinie Klientów Studia Lektorskiego Powitania.pl. Ponad ' + reviews.length + ' opinii od firm i agencji z całej Polski o jakości nagrań, tempie realizacji i współpracy.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Opinie', url: '/opinie/' }
    ],
    reviews,
    // Wstrzyknij reviewCount + top 10 do schema.org Organization (head.ejs)
    // - usuwa duplikat z osobnego LocalBusiness blocku w opinie.ejs
    reviewCount: reviews.length,
    reviewsForSchema: reviews.slice(0, 10)
  });
});

app.get('/nagrania-lektorskie/', (req, res) => {
  res.render('nagrania-lektorskie', {
    title: `Nagrania lektorskie - reklamy, IVR, filmy, audiobooki | 24-48h`,
    description: `Profesjonalne nagrania lektorskie od 2001 r. ${res.locals.voiceCount} lektorów w 30+ językach. Spoty reklamowe, filmy, IVR, audiobooki. Realizacja w 48h. Wycena gratis.`,
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' }
    ]
  });
});

// Service subpages
app.get('/produkcja-jingli-reklamowych/', (req, res) => {
  res.render('uslugi/jingle-i-spoty', {
    title: 'Produkcja jingli reklamowych i spotów śpiewanych | Powitania.pl',
    description: 'Jingle i śpiewane spoty reklamowe: radio, TV, social media, podcasty, eventy. Profesjonalna produkcja pod Twój brief, prawa do emisji. Bezpłatna wycena.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Jingle i spoty', url: '/produkcja-jingli-reklamowych/' }
    ],
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Produkcja jingli reklamowych i śpiewanych spotów',
      'description': 'Profesjonalna produkcja muzyczna do reklamy na zamówienie: jingle, śpiewane spoty reklamowe (radio, TV, social media), czołówki i przebitki do podcastów, oprawa muzyczna eventów oraz audio branding. Kontrola kreatywna, selekcja, obróbka i mastering, jasne prawa do emisji.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/produkcja-jingli-reklamowych/',
      'serviceType': 'Produkcja jingli i muzyki reklamowej'
    }
  });
});

app.get('/nagrania-lektorskie/glos-do-reklamy/', (req, res) => {
  res.render('uslugi/glos-do-reklamy', {
    title: 'Głos do reklamy | Spoty radiowe, TV, social media | Powitania.pl',
    description: 'Przyciągnij uwagę słuchaczy - wybierz głos do reklamy, który sprzedaje. Profesjonalny lektor do reklamy, różne barwy głosu i ekspresja dopasowana do Twojej marki.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Głos do reklamy', url: '/nagrania-lektorskie/glos-do-reklamy/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Głos do reklamy - nagrania lektorskie',
      'description': `Profesjonalne nagrania lektorskie do spotów reklamowych radiowych, telewizyjnych i internetowych. ${res.locals.voiceCount} lektorów, realizacja w 24-48h.`,
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/nagrania-lektorskie/glos-do-reklamy/',
      'serviceType': 'Nagrania lektorskie do reklam'
    }
  });
});

app.get('/nagrania-lektorskie/profesjonalny-lektor-do-filmow/', (req, res) => {
  res.render('uslugi/lektor-do-filmow', {
    title: 'Profesjonalny lektor do filmów | Powitania.pl',
    description: 'Profesjonalny lektor do filmów - naturalny głos, wysoka jakość nagrań, szybka realizacja. Idealny wybór do filmów promocyjnych, instruktażowych dokumentalnych.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Profesjonalny lektor do filmów', url: '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Lektor do filmów - narracje filmowe i korporacyjne',
      'description': 'Profesjonalne nagrania lektorskie do filmów promocyjnych, instruktażowych, korporacyjnych i dokumentalnych. Naturalny głos, szybka realizacja.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/nagrania-lektorskie/profesjonalny-lektor-do-filmow/',
      'serviceType': 'Nagrania lektorskie do filmów i narracji'
    }
  });
});

app.get('/nagrania-lektorskie/zapowiedzi-telefoniczne/', (req, res) => {
  res.render('uslugi/zapowiedzi-telefoniczne', {
    title: 'Zapowiedzi telefoniczne i nagrania do centrali IVR | 24-48h',
    description: `Zapowiedzi telefoniczne i nagrania IVR na centralę (Slican, Platan, VoIP). ${res.locals.voiceCount} lektorów, realizacja 24-48h, od 380 zł netto. Gotowe szablony i wycena.`,
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Zapowiedzi telefoniczne', url: '/nagrania-lektorskie/zapowiedzi-telefoniczne/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Zapowiedzi telefoniczne IVR',
      'description': 'Profesjonalne zapowiedzi telefoniczne IVR: powitania firmowe, menu głosowe, komunikaty poza godzinami pracy. Realizacja w 24-48h, 30+ języków.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/nagrania-lektorskie/zapowiedzi-telefoniczne/',
      'serviceType': 'Zapowiedzi telefoniczne IVR',
      'offers': { '@type': 'Offer', 'price': '380', 'priceCurrency': 'PLN', 'url': 'https://www.powitania.pl/nagrania-lektorskie/zapowiedzi-telefoniczne/' }
    }
  });
});

app.get('/nagrania-lektorskie/audioprzewodniki/', (req, res) => {
  res.render('uslugi/audioprzewodniki', {
    title: 'Audioprzewodniki z lektorem | muzea, QR, aplikacje | Powitania.pl',
    description: 'Profesjonalne nagrania do audioprzewodników: muzea, parki, szlaki. Lektorzy PL + native, integracja z QR/aplikacjami. Wycena w 24h.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Audioprzewodniki', url: '/nagrania-lektorskie/audioprzewodniki/' }
    ]
  });
});

app.get('/sesje-zdalne-nagrania-lektorskie-online/', (req, res) => {
  res.render('uslugi/sesje-zdalne', {
    title: 'Zdalne sesje nagraniowe z lektorem - kontrola live | Powitania.pl',
    description: 'Weź udział w sesji nagraniowej zdalnie. Kontroluj proces nagrania w czasie rzeczywistym przez internet.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Sesje zdalne', url: '/sesje-zdalne-nagrania-lektorskie-online/' }
    ],
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Sesje zdalne - nagrania lektorskie online',
      'description': 'Zdalne sesje nagraniowe przez Zoom, Teams lub Source-Connect. Klient kieruje lektorem na żywo w czasie rzeczywistym. Idealne dla projektów wymagających precyzyjnej reżyserii.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/sesje-zdalne-nagrania-lektorskie-online/',
      'serviceType': 'Zdalne sesje nagraniowe'
    }
  });
});

app.get('/nagranie-ekspresowe/', (req, res) => {
  const voices = loadVoices();
  // Dyżurujący lektorzy - lektorzy z turnaround "24h" i ze zdjęciem, ceny +50%
  const dutyVoices = voices
    .filter(v => v.turnaround && v.turnaround.includes('24') && v.photo)
    .slice(0, 6)
    .map(v => {
      const expressPrices = {};
      if (v.prices) {
        for (const [key, val] of Object.entries(v.prices)) {
          expressPrices[key] = typeof val === 'number' ? Math.round(val * 1.5 / 10) * 10 : val;
        }
      }
      return { ...v, prices: expressPrices };
    });
  res.render('nagranie-ekspresowe', {
    title: 'Nagranie ekspresowe | powitania.pl',
    description: 'Potrzebujesz nagrania lektorskiego jeszcze dziś? Zamów do 14:00, otrzymaj do 18:00. Dyżurujący lektorzy dostępni każdego dnia roboczego.',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagranie ekspresowe', url: '/nagranie-ekspresowe/' }
    ],
    dutyVoices,
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Nagranie ekspresowe - realizacja tego samego dnia',
      'description': 'Nagrania lektorskie ekspresowe: zamów do 14:00, otrzymaj do 18:00. Dostępne również w weekendy i święta. Dopłata ekspresowa 50%.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/nagranie-ekspresowe/',
      'serviceType': 'Nagrania ekspresowe'
    }
  });
});

// Kreator tekstów lektorskich (standalone)
app.get('/kreator/', (req, res) => {
  res.render('kreator', {
    title: 'Kreator tekstów lektorskich - przygotuj skrypt w kilka minut | powitania.pl',
    description: 'Kreator treści lektorskich - przygotuj profesjonalny tekst do nagrania w kilka minut. Spot reklamowy, IVR, narracja, social media. Wybierz typ, opisz potrzebę, dostań warianty dopasowane do timingu.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Kreator tekstów lektorskich', url: '/kreator/' }
    ]
  });
});

// O firmie
app.get('/o-firmie/', (req, res) => {
  res.render('o-firmie', {
    title: 'O firmie | powitania.pl',
    description: 'OPTIMUM Paweł Kowalski - Studio Lektorskie Powitania.pl, działające od 2001 r. Ponad 200 lektorów, 30+ języków, realizacje dla agencji, TV i marek premium.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'O firmie', url: '/o-firmie/' }
    ]
  });
});

// Polityka prywatności
app.get('/polityka-prywatnosci/', (req, res) => {
  res.render('polityka-prywatnosci', {
    title: 'Polityka prywatności | powitania.pl',
    description: 'Polityka prywatności serwisu internetowego powitania.pl. Informacje o przetwarzaniu danych osobowych.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Polityka prywatności', url: '/polityka-prywatnosci/' }
    ]
  });
});

// Regulamin
app.get('/regulamin-serwisu/', (req, res) => {
  res.render('regulamin', {
    title: 'Regulamin serwisu | powitania.pl',
    description: 'Regulamin serwisu internetowego powitania.pl. Warunki korzystania z usług nagrań lektorskich.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Regulamin', url: '/regulamin-serwisu/' }
    ]
  });
});

// === Oferta dedykowana dla Klienta IMS - NIEINDEKSOWANA (poufna, nielinkowana, poza sitemap) ===
// Publiczny widok read-only - to widzi Klient
app.get('/oferta-ims/', imsClientAuth, (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.render('oferta-ims', {
    title: 'Oferta lektorska dla IMS | powitania.pl',
    description: 'Dedykowana oferta lektorska dla Klienta IMS.',
    noindex: true,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Oferta IMS', url: '/oferta-ims/' }
    ],
    ims: loadImsOffer(),
    markupPrice: imsMarkupPrice
  });
});
// Serwowanie plikow demo mp3 z wolumenu (data/ims-demos, poza public/).
// Dostep tylko po logowaniu (Klient lub operator). Sciezka nazwy scisle walidowana.
app.get('/oferta-ims/demo-plik/:name', imsAnyAuth, (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const name = path.basename(String(req.params.name || ''));
  if (!/^ims-\d+-\d+-[01]\.mp3$/.test(name)) return res.status(404).send('Nie znaleziono.');
  res.sendFile(name, { root: imsAudioDir }, function (err) {
    if (err && !res.headersSent) res.status(404).send('Nie znaleziono.');
  });
});
// Serwowanie probek portfolio (assets/ims-portfolio/). Sa shipowane z git
// (poza data/ - nie wpada na volume mount). Auth + scisla walidacja nazwy.
const imsPortfolioDir = path.join(__dirname, 'assets', 'ims-portfolio');
app.get('/oferta-ims/portfolio-plik/:name', imsAnyAuth, (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const name = path.basename(String(req.params.name || ''));
  if (!/^[a-z0-9-]+\.mp3$/.test(name)) return res.status(404).send('Nie znaleziono.');
  res.sendFile(name, { root: imsPortfolioDir }, function (err) {
    if (err && !res.headersSent) res.status(404).send('Nie znaleziono.');
  });
});
// Edycja (logowanie ims / ofertaims2026) - dla pracownika
app.get('/oferta-ims/edytuj/', imsAuth, (req, res) => {
  res.render('oferta-ims-edit', {
    title: 'Edycja oferty IMS',
    description: '',
    noindex: true,
    breadcrumbs: [],
    ims: loadImsOffer(),
    saved: req.query.saved === '1',
    err: req.query.err || ''
  });
});
// Zapis pol tekstowych (stawki / notatki)
app.post('/oferta-ims/zapisz/', imsAuth, (req, res) => {
  const data = loadImsOffer();
  if (!data) return res.redirect('/oferta-ims/edytuj/?err=brak-danych');
  if (data.locked) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Oferta zablokowana'));
  data.languages.forEach((g, li) => g.lektorzy.forEach((v, vi) => {
    const nm = req.body['name_' + li + '_' + vi];
    const r = req.body['radio_' + li + '_' + vi];
    const gal = req.body['gallery_' + li + '_' + vi];
    const nt = req.body['note_' + li + '_' + vi];
    if (nm !== undefined && String(nm).trim() !== '') v.name = String(nm).trim();
    if (r !== undefined) v.radio = imsNormPrice(r);
    if (gal !== undefined) v.gallery = imsNormPrice(gal);
    if (nt !== undefined) v.note = String(nt).trim();
  }));
  saveImsOffer(data);
  res.redirect('/oferta-ims/edytuj/?saved=1');
});
// Upload demo mp3 (slot 0 lub 1) dla danego lektora
app.post('/oferta-ims/demo/', imsAuth, (req, res) => {
  imsUpload(req, res, function (e) {
    if (e) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent(e.message || 'Blad uploadu'));
    const data = loadImsOffer();
    if (!data) return res.redirect('/oferta-ims/edytuj/?err=brak-danych');
    if (data.locked) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Oferta zablokowana'));
    const li = parseInt(req.body.li, 10), vi = parseInt(req.body.vi, 10);
    const slot = req.body.slot === '1' ? 1 : 0;
    const g = data.languages[li];
    const v = g && g.lektorzy[vi];
    if (!v || !req.file) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Zly cel uploadu'));
    const finalName = 'ims-' + li + '-' + vi + '-' + slot + '.mp3';
    fs.renameSync(req.file.path, path.join(imsAudioDir, finalName));
    if (!Array.isArray(v.demos)) v.demos = [];
    v.demos[slot] = '/oferta-ims/demo-plik/' + finalName + '?v=' + Date.now();
    saveImsOffer(data);
    res.redirect('/oferta-ims/edytuj/?saved=1');
  });
});
// Blokada / odblokowanie (po zablokowaniu edycja wstrzymana, Klient widzi finalna wersje)
app.post('/oferta-ims/lock/', imsAuth, (req, res) => {
  const data = loadImsOffer();
  if (!data) return res.redirect('/oferta-ims/edytuj/?err=brak-danych');
  data.locked = !data.locked;
  saveImsOffer(data);
  res.redirect('/oferta-ims/edytuj/?saved=1');
});
// Dodanie pustej pozycji lektora do jezyka (operator)
app.post('/oferta-ims/dodaj/', imsAuth, (req, res) => {
  const data = loadImsOffer();
  if (!data) return res.redirect('/oferta-ims/edytuj/?err=brak-danych');
  if (data.locked) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Oferta zablokowana'));
  const li = parseInt(req.body.li, 10);
  const g = data.languages[li];
  if (!g) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Zly jezyk'));
  if (!Array.isArray(g.lektorzy)) g.lektorzy = [];
  g.lektorzy.push({ name: 'Nowy lektor', radio: '', gallery: '', note: '', demos: [] });
  saveImsOffer(data);
  res.redirect('/oferta-ims/edytuj/?saved=1#lek-' + li + '-' + (g.lektorzy.length - 1));
});
// Usuniecie pozycji lektora (operator)
app.post('/oferta-ims/usun/', imsAuth, (req, res) => {
  const data = loadImsOffer();
  if (!data) return res.redirect('/oferta-ims/edytuj/?err=brak-danych');
  if (data.locked) return res.redirect('/oferta-ims/edytuj/?err=' + encodeURIComponent('Oferta zablokowana'));
  const li = parseInt(req.body.li, 10), vi = parseInt(req.body.vi, 10);
  const g = data.languages[li];
  if (g && Array.isArray(g.lektorzy) && g.lektorzy[vi]) g.lektorzy.splice(vi, 1);
  saveImsOffer(data);
  res.redirect('/oferta-ims/edytuj/?saved=1#lang-' + (isNaN(li) ? '' : li));
});

// Blog / Aktualności - lista postów
app.get('/aktualnosci-pl/', (req, res) => {
  const posts = loadBlogPosts();
  const perPage = 10;
  const currentPage = 1;
  const totalPages = Math.ceil(posts.length / perPage);
  const pagePosts = posts.slice(0, perPage);
  res.render('aktualnosci', {
    title: 'Aktualności | powitania.pl',
    description: 'Nowości ze studia nagrań lektorskich, nowi lektorzy, porady i artykuły branżowe.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Aktualności', url: '/aktualnosci-pl/' }
    ],
    posts: pagePosts,
    currentPage,
    totalPages
  });
});

// Blog - paginacja
app.get('/aktualnosci-pl/strona/:page/', (req, res) => {
  const posts = loadBlogPosts();
  const perPage = 10;
  const currentPage = parseInt(req.params.page) || 1;
  if (currentPage < 1) return res.redirect('/aktualnosci-pl/');
  const totalPages = Math.ceil(posts.length / perPage);
  if (currentPage > totalPages) return res.redirect('/aktualnosci-pl/');
  const pagePosts = posts.slice((currentPage - 1) * perPage, currentPage * perPage);
  res.render('aktualnosci', {
    title: 'Aktualności - strona ' + currentPage + ' | powitania.pl',
    description: 'Nowości ze studia nagrań lektorskich, nowi lektorzy, porady i artykuły branżowe.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Aktualności', url: '/aktualnosci-pl/' }
    ],
    posts: pagePosts,
    currentPage,
    totalPages
  });
});

// Blog - pojedynczy post
app.get('/aktualnosci-pl/:slug/', (req, res) => {
  const posts = loadBlogPosts();
  const idx = posts.findIndex(p => p.slug === req.params.slug);
  if (idx === -1) {
    return res.status(404).render('404', {
      title: 'Nie znaleziono artykułu | powitania.pl',
      description: 'Artykuł o podanym adresie nie istnieje.'
    });
  }
  const post = posts[idx];
  res.render('blog-post', {
    // metaTitle - pełny override (bez sufiksu), używaj gdy artykuł wymaga ścisłej
    // kontroli SEO title; w przeciwnym razie standardowo: seoTitle/title + suffix
    title: post.metaTitle || ((post.seoTitle || post.title) + ' | powitania.pl'),
    // metaDescription - SEO override; jeśli brak, używamy excerpt
    description: post.metaDescription || post.excerpt,
    noindex: !!post.noindex,
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Aktualności', url: '/aktualnosci-pl/' },
      { name: post.title, url: '/aktualnosci-pl/' + post.slug + '/' }
    ],
    post,
    prevPost: idx > 0 ? posts[idx - 1] : null,
    nextPost: idx < posts.length - 1 ? posts[idx + 1] : null
  });
});

// Potwierdzenie płatności online
app.get('/zamowienie-oplacone/', (req, res) => {
  res.render('payment-success', {
    title: 'Zamówienie opłacone | powitania.pl',
    description: '',
    paid: true
  });
});

// Zamówienie przyjęte (płatność w trakcie przetwarzania)
app.get('/zamowienie-przyjete/', (req, res) => {
  res.render('payment-success', {
    title: 'Zamówienie przyjęte | powitania.pl',
    description: '',
    paid: false
  });
});

// 301 Redirects - stare URL-e bloga (WordPress category)
app.get('/category/aktualnosci-pl/', (req, res) => res.redirect(301, '/aktualnosci-pl/'));
app.get('/category/aktualnosci-pl/page/:page/', (req, res) => res.redirect(301, '/aktualnosci-pl/strona/' + req.params.page + '/'));

// 301 Redirects - portfolio (stare URL-e → nowe podstrony usług)
app.get('/portfolio/', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));
app.get('/portfolio/zapowiedzi-telefoniczne/', (req, res) => res.redirect(301, '/nagrania-lektorskie/zapowiedzi-telefoniczne/'));
app.get('/portfolio/reklama-radiowa/', (req, res) => res.redirect(301, '/nagrania-lektorskie/glos-do-reklamy/'));
app.get('/portfolio/lektorzy-online/', (req, res) => res.redirect(301, '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/'));
app.get('/portfolio/*', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));

// 301 Redirects - stare WordPress sitemap i inne strony powodujące 404
app.get('/page-sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/post-sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/zamowienie-nagrania/', (req, res) => res.redirect(301, '/cennik-nagran-lektorskich/'));

// Partner pages - /p/:slug/
app.get('/p/:slug/', (req, res) => {
  const partners = loadPartners();
  const partner = partners.find(p => p.slug === req.params.slug && p.active);
  if (!partner) {
    return res.status(404).render('placeholder', {
      title: '404 | powitania.pl',
      description: '',
      heading: 'Nie znaleziono',
      message: 'Strona partnera nie istnieje.'
    });
  }

  let voices = loadVoices().filter(v => v.photo && v.audio);
  // Apply partner filters
  if (partner.filters.gender) voices = voices.filter(v => v.gender === partner.filters.gender);
  if (partner.filters.languages && partner.filters.languages.length) {
    voices = voices.filter(v => v.languages && v.languages.some(l => partner.filters.languages.includes(l)));
  }
  if (partner.filters.famous) voices = voices.filter(v => v.famous);
  if (partner.filters.native) voices = voices.filter(v => v.native);
  if (partner.filters.hidePrice) voices = voices.filter(v => !v.hidePrice);

  // Remove X-Frame-Options so partner page can be embedded in iframe
  res.removeHeader('X-Frame-Options');

  res.render('partner-page', { partner, voices });
});

// Legacy partner iframe routes → redirect to bank-glosow
app.get('/bank/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/glosy-meskie/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/glosy-zenskie/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/natives/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/znani-i-lubiani/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/*/page/*', (req, res) => res.redirect(301, '/bank-glosow/'));

// === English version (Phase 1) ===
app.get('/en/', (req, res) => {
  const voiceCount = res.locals.voiceCount;
  res.render('en/index', {
    title: `Voice-Over Services & Studio since 2001 - ${voiceCount} talents`,
    description: `Professional voiceover studio offering complete voice-over services since 2001. ${voiceCount} voice talents for ads, films, IVR, audiobooks. Quote in 30 minutes.`,
    voices: loadVoices(),
    posts: loadBlogPosts().slice(0, 6)
  });
});

app.get('/en/voice-bank/', (req, res) => {
  // Konwersja prices PLN -> EUR per voice (template uzywa juz-EUR wartosci, bez wlasnej konwersji)
  const voicesEur = loadVoices().map(v => ({ ...v, prices: convertPricesToEur(v.prices) }));
  res.render('en/bank-glosow', {
    title: 'Voice Bank | Professional Voice Artists | Powitania.pl',
    description: `Voice bank Powitania.pl - ${res.locals.voiceCount} professional voice artists in 30+ languages. Listen to samples, filter by language, gender, and style. Voiceover studio since 2001.`,
    pageHeroTransparent: true,
    mainClass: 'bank-dark',
    voices: voicesEur
  });
});

app.get('/en/pricing/', (req, res) => {
  res.render('en/cennik', {
    pageHeroTransparent: true,
    title: 'Voiceover & Voice Services Pricing from EUR 70 | Powitania.pl',
    description: `Voiceover recording pricing: radio ad from EUR 70, narration from EUR 80/page, IVR from EUR 90, audiobook from EUR 15/page. ${res.locals.voiceCount} voice artists, 24-48h delivery.`
  });
});

app.get('/en/contact/', (req, res) => {
  res.render('en/kontakt', {
    pageHeroTransparent: true,
    title: 'Contact | Powitania.pl',
    description: 'Contact Powitania.pl Voiceover Studio. Professional voice recordings in 24-48h, 200+ voice artists, 30+ languages. We reply within 2 hours on weekdays.'
  });
});

app.get('/en/privacy-policy/', (req, res) => {
  res.render('en/privacy-policy', {
    title: 'Privacy Policy | Powitania.pl',
    description: 'Privacy Policy for the Powitania.pl voiceover studio. Learn how we process personal data under GDPR — controller, purposes, retention, user rights, cookies.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Privacy Policy', url: '/en/privacy-policy/' }
    ]
  });
});

app.get('/en/voiceover-services/', (req, res) => {
  res.render('en/voiceover-services', {
    pageHeroTransparent: true,
    title: `Voice-Over Recordings - Ads, IVR, Films, Audiobooks | 24-48h`,
    description: `Professional voice-over recordings since 2001. ${res.locals.voiceCount} voice artists in 30+ languages. Commercials, films, IVR, audiobooks. 48h turnaround. Free quote.`,
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' }
    ]
  });
});

app.get('/en/voiceover-services/voice-for-advertising/', (req, res) => {
  res.render('en/voice-for-advertising', {
    pageHeroTransparent: true,
    title: 'Voice for Advertising | Radio, TV & social media spots | Powitania.pl',
    description: 'Hire recognisable voice artists for your advertising spots. Radio, TV, social media - professional voiceover recordings that sell.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' },
      { name: 'Voice for Advertising', url: '/en/voiceover-services/voice-for-advertising/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Voice for Advertising - Radio & TV Voiceover',
      'description': `Professional voiceover recordings for radio, TV and online advertising spots. ${res.locals.voiceCount} voice artists, 30+ languages, 24-48h turnaround.`,
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/voiceover-services/voice-for-advertising/',
      'serviceType': 'Advertising Voiceover'
    }
  });
});

app.get('/en/voiceover-services/film-voiceover/', (req, res) => {
  res.render('en/film-voiceover', {
    pageHeroTransparent: true,
    title: 'Professional Film Voiceover | Narration & Audio-Video | Powitania.pl',
    description: 'Professional film voiceover - narration for corporate, instructional, e-learning and promotional videos. Audio-video editing included.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' },
      { name: 'Film Voiceover', url: '/en/voiceover-services/film-voiceover/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Film Voiceover & Narration',
      'description': 'Professional voiceover narration for corporate, instructional, e-learning, documentary and promotional films. Natural voice, fast turnaround.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/voiceover-services/film-voiceover/',
      'serviceType': 'Film Voiceover and Narration'
    }
  });
});

app.get('/en/voiceover-services/phone-announcements/', (req, res) => {
  res.render('en/phone-announcements', {
    pageHeroTransparent: true,
    title: 'Phone announcements & IVR recordings for PBX | 24-48h',
    description: `Phone announcements and IVR voiceover for your PBX (Slican, Platan, VoIP). ${res.locals.voiceCount} voice artists, 24-48h delivery, ready-made script templates.`,
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' },
      { name: 'Phone Announcements', url: '/en/voiceover-services/phone-announcements/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'IVR Phone Announcements & On-Hold Messages',
      'description': 'Professional IVR recordings and phone announcements: company greetings, voice menus, after-hours messages, on-hold music. Multilingual support, 30+ languages.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/voiceover-services/phone-announcements/',
      'serviceType': 'IVR Phone Announcements',
      'offers': { '@type': 'Offer', 'price': '380', 'priceCurrency': 'PLN', 'url': 'https://www.powitania.pl/en/voiceover-services/phone-announcements/' }
    }
  });
});

app.get('/en/voiceover-services/audio-guides/', (req, res) => {
  res.render('en/audio-guides', {
    pageHeroTransparent: true,
    title: 'Audio guides voiceover | museums, QR, apps | Powitania.pl',
    description: 'Professional voiceover recordings for audio guides: museums, parks, trails. Polish + native voice artists, integration with QR/apps. Quote within 24h.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' },
      { name: 'Audio Guides', url: '/en/voiceover-services/audio-guides/' }
    ]
  });
});

app.get('/en/advertising-jingles/', (req, res) => {
  res.render('en/advertising-jingles', {
    pageHeroTransparent: true,
    title: 'Advertising Jingle Production | Sung Spots & Audio Branding | Powitania.pl',
    description: 'Custom advertising jingles and sung spots for radio, TV, social media and podcasts. Professional audio production with clear broadcast rights. Free quote.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Advertising jingles', url: '/en/advertising-jingles/' }
    ],
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Advertising jingle and music production',
      'description': 'Professional music production for advertising: jingles, sung advertising spots (radio, TV, social media), podcast intros and stings, event music, audio branding. Creative control, selection, editing and mastering, clear broadcast rights.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/advertising-jingles/',
      'serviceType': 'Advertising jingle production'
    }
  });
});

app.get('/en/remote-sessions/', (req, res) => {
  res.render('en/remote-sessions', {
    pageHeroTransparent: true,
    title: 'Remote Recording Sessions | Online Voiceover | Powitania.pl',
    description: 'Join a voiceover recording session remotely. Full real-time control over the process from anywhere in the world.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Remote Sessions', url: '/en/remote-sessions/' }
    ],
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Remote Voiceover Recording Sessions',
      'description': 'Remote recording sessions via Zoom, Teams or Source-Connect. Direct the voice artist live in real time from anywhere in the world.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/remote-sessions/',
      'serviceType': 'Remote Recording Sessions'
    }
  });
});

// EN Kreator (standalone)
app.get('/en/kreator/', (req, res) => {
  res.render('en/kreator', {
    title: 'Voiceover Script Creator - prepare your script in minutes | Powitania.pl',
    description: 'Voiceover script creator - prepare a professional script in minutes. Ad spot, IVR, narration, social media. Choose type, describe your need, get text variants tailored to timing.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Script Creator', url: '/en/kreator/' }
    ]
  });
});

app.get('/en/express-recording/', (req, res) => {
  const voices = loadVoices();
  // Express +50% w PLN, potem konwersja na EUR (zaokraglenie w gore do 5 EUR)
  const dutyVoices = voices
    .filter(v => v.turnaround && v.turnaround.includes('24') && v.photo)
    .slice(0, 6)
    .map(v => {
      const expressPrices = {};
      if (v.prices) {
        for (const [key, val] of Object.entries(v.prices)) {
          expressPrices[key] = typeof val === 'number' ? plnToEur(val * 1.5) : val;
        }
      }
      return { ...v, prices: expressPrices };
    });
  res.render('en/express-recording', {
    title: 'Express Recording | Same-Day Voiceover | Powitania.pl',
    description: 'Need a voiceover recording today? Order by 2 PM and receive by 6 PM. On-duty voice artists available for immediate production.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Express Recording', url: '/en/express-recording/' }
    ],
    dutyVoices,
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Express Voiceover Recording - Same-Day Delivery',
      'description': 'Same-day voiceover recordings: order by 2 PM, receive by 6 PM. Available on weekends and public holidays. Express surcharge applies.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/express-recording/',
      'serviceType': 'Express Voiceover Recording'
    }
  });
});

// EN - News / Blog
// W EN listach i routes pokazujemy WYŁĄCZNIE posty z pełnym tłumaczeniem
// (titleEn + contentEn) - posty PL-only nie mają sensu na EN i powodowały
// fallback do polskiego tytułu na liście oraz pustkę po kliknięciu.
function loadEnBlogPosts() {
  return loadBlogPosts().filter(p => p.titleEn && p.contentEn);
}

app.get('/en/news/', (req, res) => {
  const posts = loadEnBlogPosts();
  const perPage = 10;
  const currentPage = 1;
  const totalPages = Math.ceil(posts.length / perPage);
  const pagePosts = posts.slice(0, perPage);
  res.render('en/news', {
    title: 'News | Powitania.pl',
    description: 'Studio updates, new voice artists, tips and industry articles from our voiceover recording studio.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'News', url: '/en/news/' }
    ],
    posts: pagePosts,
    currentPage,
    totalPages
  });
});

app.get('/en/news/page/:page/', (req, res) => {
  const posts = loadEnBlogPosts();
  const perPage = 10;
  const currentPage = parseInt(req.params.page) || 1;
  if (currentPage < 1) return res.redirect('/en/news/');
  const totalPages = Math.ceil(posts.length / perPage);
  if (currentPage > totalPages) return res.redirect('/en/news/');
  const pagePosts = posts.slice((currentPage - 1) * perPage, currentPage * perPage);
  res.render('en/news', {
    title: 'News - page ' + currentPage + ' | Powitania.pl',
    description: 'Studio updates, new voice artists, tips and industry articles.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'News', url: '/en/news/' }
    ],
    posts: pagePosts,
    currentPage,
    totalPages
  });
});

app.get('/en/news/:slug/', (req, res) => {
  const posts = loadEnBlogPosts();
  const reqSlug = req.params.slug;
  // Canonical match: po slugEn (z fallback do slug dla niezmigrowanych)
  let idx = posts.findIndex(p => (p.slugEn || p.slug) === reqSlug);
  if (idx === -1) {
    // Może URL używa starego PL sluga? Jeśli tak -> 301 do canonical EN URL
    const legacyIdx = posts.findIndex(p => p.slug === reqSlug && p.slugEn && p.slugEn !== p.slug);
    if (legacyIdx !== -1) {
      return res.redirect(301, '/en/news/' + posts[legacyIdx].slugEn + '/');
    }
    return res.status(404).render('404', {
      title: 'Article not found | Powitania.pl',
      description: 'The article at this address does not exist.'
    });
  }
  const post = posts[idx];
  const enSlug = post.slugEn || post.slug;
  res.render('en/blog-post', {
    title: post.metaTitleEn || ((post.seoTitleEn || post.titleEn) + ' | Powitania.pl'),
    description: post.metaDescriptionEn || post.excerptEn || post.excerpt,
    noindex: !!post.noindex,
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'News', url: '/en/news/' },
      { name: post.titleEn, url: '/en/news/' + enSlug + '/' }
    ],
    post,
    prevPost: idx > 0 ? posts[idx - 1] : null,
    nextPost: idx < posts.length - 1 ? posts[idx + 1] : null
  });
});

// EN - Voice artist profile
// Konwersja PLN -> EUR. Stawka 4.20, zaokraglanie ZAWSZE w GORE do nastepnego 5 EUR
// (umowa biznesowa: nie zanizamy ceny po konwersji).
var EUR_RATE = 4.20;
function plnToEur(pln) {
  if (typeof pln !== 'number') return pln;
  var eur = pln / EUR_RATE;
  return Math.ceil(eur / 5) * 5;
}
function convertPricesToEur(prices) {
  if (!prices) return {};
  var eurPrices = {};
  for (var key in prices) {
    eurPrices[key] = typeof prices[key] === 'number' ? plnToEur(prices[key]) : prices[key];
  }
  return eurPrices;
}
app.get('/en/voice-artists/:slug/', (req, res) => {
  const voices = loadVoices();
  const lektor = voices.find(v => v.id === req.params.slug);
  if (!lektor) {
    // Auto-redirect dla legacy WP-plugin slugs z numerycznym suffixem (-2, -3, ...)
    // Jeśli slug bez suffixu istnieje w bazie, redirectuj 301 zamiast 404.
    // Pokrywa ~22 slugów typu daniel-2, lukasz-2, alicja-2 z GSC audit.
    const m = req.params.slug.match(/^(.+)-\d+$/);
    if (m) {
      const baseSlug = m[1];
      const baseLektor = voices.find(v => v.id === baseSlug);
      if (baseLektor) return res.redirect(301, '/en/voice-artists/' + baseSlug + '/');
    }
    return res.status(404).render('placeholder', {
      title: '404 | powitania.pl',
      description: 'Voice artist not found',
      heading: 'Voice artist not found',
      message: 'The voice artist you are looking for does not exist. <a href="/en/voice-bank/" class="text-accent hover:underline">Back to Voice Bank</a>.'
    });
  }
  // Convert prices to EUR for EN version
  const lektorEn = { ...lektor, prices: convertPricesToEur(lektor.prices) };
  // Similar voice artists: same gender, random 5
  const similar = voices
    .filter(v => v.id !== lektor.id && v.gender === lektor.gender && v.photo)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  // Auto-generate EN title & description from lektor data
  const enGender = lektor.gender === 'm' ? 'Male' : 'Female';
  const enLangs = (lektor.languages || []).join(', ');
  let enTitle;
  if (lektor.native && lektor.nativeLanguage) {
    enTitle = `${lektor.name} - Native ${lektor.nativeLanguage} Voice Artist | Powitania.pl`;
  } else if (lektor.native && lektor.languages && lektor.languages.length) {
    enTitle = `${lektor.name} - Native ${lektor.languages[0]} Voice Artist | Powitania.pl`;
  } else if (lektor.famous) {
    enTitle = `${lektor.name} - Celebrity Voice Artist | Powitania.pl`;
  } else {
    enTitle = `${lektor.name} - ${enGender} Voice Artist${enLangs ? ', ' + enLangs : ''} | Powitania.pl`;
  }
  const enPrices = lektorEn.prices || {};
  const enPriceParts = [];
  if (enPrices.ivr_100) enPriceParts.push(`IVR from ${enPrices.ivr_100} EUR`);
  if (enPrices.spot_radio_local) enPriceParts.push(`ad spots from ${enPrices.spot_radio_local} EUR`);
  if (enPrices.narration_1page) enPriceParts.push(`narration from ${enPrices.narration_1page} EUR`);
  const enApps = (lektor.applications || []).join(', ');
  const enDesc = [
    lektor.name + (lektor.native ? ` - native ${enLangs} voice artist` : ` - ${enGender.toLowerCase()} voice artist`) + (lektor.age ? `, ${lektor.age}` : '') + '.',
    enApps ? enApps + '.' : '',
    enPriceParts.length ? enPriceParts.join(', ') + '.' : '',
    `Listen to samples and order online. Delivery: ${lektor.turnaround || '24-48h'}.`
  ].filter(Boolean).join(' ');
  const finalTitle = lektor.seoTitleEn || enTitle;
  const finalDesc = lektor.seoDescriptionEn || enDesc;
  res.render('en/voice-artist', {
    title: finalTitle,
    description: finalDesc,
    ogImage: lektor.photo ? ('https://www.powitania.pl' + lektor.photo) : undefined,
    mainClass: 'lektor-dark',
    pageHeroTransparent: true,
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voice Bank', url: '/en/voice-bank/' },
      { name: lektor.name, url: '/en/voice-artists/' + lektor.id + '/' }
    ],
    lektor: lektorEn,
    similar: similar,
    isExpress: req.query.express === '1',
    melodies: loadMelodies(),
    eurRate: EUR_RATE
  });
});

// 301 Redirects - stare EN URL-e (WordPress / dev.powitania.pl patterns)
app.get('/en/lectors/:slug/', (req, res) => res.redirect(301, '/en/voice-artists/' + req.params.slug + '/'));
app.get('/en/lectors/', (req, res) => res.redirect(301, '/en/voice-bank/'));
app.get('/en/price-list/', (req, res) => res.redirect(301, '/en/pricing/'));
app.get('/en/voice-recordings/', (req, res) => res.redirect(301, '/en/voiceover-services/'));
app.get('/en/search/*', (req, res) => res.redirect(301, '/en/'));
app.get('/en/thank-you/feed/', (req, res) => res.redirect(301, '/en/'));
app.get('/en/thank-you/', (req, res) => res.redirect(301, '/en/'));

// 301 Redirects - EN URL-e z audytu SEO (23.04.2026) - stare warianty nazw indeksowane przez Google
// Target URL-e zweryfikowane curl-em (200 OK) przed dodaniem redirectów.
app.get('/en/voice-actors/:slug/', (req, res) => res.redirect(301, '/en/voice-artists/' + req.params.slug + '/'));
app.get('/en/phone-announcements/', (req, res) => res.redirect(301, '/en/voiceover-services/phone-announcements/'));
app.get('/en/voice-for-advertising/', (req, res) => res.redirect(301, '/en/voiceover-services/voice-for-advertising/'));
app.get('/en/professional-voiceover-for-films/', (req, res) => res.redirect(301, '/en/voiceover-services/film-voiceover/'));

// 301 Redirects - GSC audit 2026-05-10: legacy WP-plugin EN URL-e (296 imp/90d, 5 clicks recovery)
// /en/about-us/ + /en/reviews/ → cross-language /o-firmie/ (brak EN about page; 119 imp/90d, top problem)
app.get('/en/about-us/', (req, res) => res.redirect(301, '/o-firmie/'));
app.get('/en/reviews/', (req, res) => res.redirect(301, '/o-firmie/'));
// Stare paths z poprzedniego WP themu /en/portfo-en/* → /en/voiceover-services/*
app.get('/en/portfo-en/radio-advertising/', (req, res) => res.redirect(301, '/en/voiceover-services/voice-for-advertising/'));
app.get('/en/portfo-en/multimedia-and-www/', (req, res) => res.redirect(301, '/en/voiceover-services/'));
app.get('/en/portfo-en/phone-answering-systems/', (req, res) => res.redirect(301, '/en/voiceover-services/phone-announcements/'));
// /en/bank-en/* → /en/voice-bank/ (root, bo subpaths female/male NIE istnieją w obecnej strukturze)
app.get('/en/bank-en/female-voices/', (req, res) => res.redirect(301, '/en/voice-bank/'));
app.get('/en/bank-en/male-voices/', (req, res) => res.redirect(301, '/en/voice-bank/'));
app.get('/en/bank-en/known-and-famous/', (req, res) => res.redirect(301, '/en/voice-bank/'));
// FAQ - mamy tylko /faq-pl/ (brak EN equivalent), redirect na PL FAQ
app.get('/en/faq2-en/', (req, res) => res.redirect(301, '/faq-pl/'));
// Pozostałe EN gaps → /en/ homepage
app.get('/en/partnership/', (req, res) => res.redirect(301, '/en/'));
app.get('/en/newsletter-en/', (req, res) => res.redirect(301, '/en/'));
app.get('/en/add-lector/', (req, res) => res.redirect(301, '/en/'));
// Old EN news posts → /en/news/ index (UWAGA: native-speakers-wanted i voiceover-recording-for-electronic-brain są celowe 410, nie ruszać; new-functionality-mix-it-yourself jest dodany wcześniej w grupie 410 bo musi byc przed dynamic /en/news/:slug/ route)
app.get('/en/uncategorized-en/alison-and-juliya-joined-us/', (req, res) => res.redirect(301, '/en/news/'));

// EN catch-all → 404 (zamiast wcześniejszego 302 → /en/, co tworzyło soft-404 i duplikaty homepage EN w indeksie Google)
app.get('/en/*', (req, res) => {
  res.status(404).render('en/404', {
    title: 'Page not found | Powitania.pl',
    description: 'The page you are looking for does not exist.'
  });
});

// Sitemap.xml - dynamiczny
app.get('/sitemap.xml', (req, res) => {
  const voices = loadVoices();
  const baseUrl = 'https://www.powitania.pl';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/bank-glosow/', priority: '0.9', changefreq: 'weekly' },
    { url: '/bank-glosow/meskie/', priority: '0.8', changefreq: 'weekly' },
    { url: '/bank-glosow/zenskie/', priority: '0.8', changefreq: 'weekly' },
    { url: '/nagrania-lektorskie/', priority: '0.8', changefreq: 'monthly' },
    { url: '/produkcja-jingli-reklamowych/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/glos-do-reklamy/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/zapowiedzi-telefoniczne/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/audioprzewodniki/', priority: '0.8', changefreq: 'monthly' },
    { url: '/sesje-zdalne-nagrania-lektorskie-online/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagranie-ekspresowe/', priority: '0.7', changefreq: 'monthly' },
    { url: '/kreator/', priority: '0.7', changefreq: 'monthly' },
    { url: '/cennik-nagran-lektorskich/', priority: '0.7', changefreq: 'monthly' },
    { url: '/kontakt/', priority: '0.7', changefreq: 'monthly' },
    { url: '/opinie/', priority: '0.7', changefreq: 'monthly' },
    { url: '/faq-pl/', priority: '0.6', changefreq: 'monthly' },
    { url: '/o-firmie/', priority: '0.6', changefreq: 'monthly' },
    { url: '/aktualnosci-pl/', priority: '0.7', changefreq: 'weekly' },
    { url: '/polityka-prywatnosci/', priority: '0.3', changefreq: 'yearly' },
    { url: '/regulamin-serwisu/', priority: '0.3', changefreq: 'yearly' },
    // /bank/* routes now redirect to /bank-glosow/ - removed from sitemap
    // English version
    { url: '/en/', priority: '0.8', changefreq: 'weekly' },
    { url: '/en/voice-bank/', priority: '0.7', changefreq: 'weekly' },
    { url: '/en/voiceover-services/', priority: '0.7', changefreq: 'monthly' },
    { url: '/en/voiceover-services/voice-for-advertising/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/voiceover-services/film-voiceover/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/voiceover-services/phone-announcements/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/voiceover-services/audio-guides/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/advertising-jingles/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/remote-sessions/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/express-recording/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/kreator/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/pricing/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/contact/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/news/', priority: '0.5', changefreq: 'weekly' },
    { url: '/en/privacy-policy/', priority: '0.3', changefreq: 'yearly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  staticPages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  voices.forEach(v => {
    xml += `  <url>\n    <loc>${baseUrl}/lektorzy/${v.id}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/en/voice-artists/${v.id}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.4</priority>\n  </url>\n`;
  });

  // Blog posts
  const blogPosts = loadBlogPosts();
  blogPosts.forEach(p => {
    // Pomijamy posty z noindex - sitemap + noindex to sprzeczny sygnał dla Google
    if (p.noindex) return;
    xml += `  <url>\n    <loc>${baseUrl}/aktualnosci-pl/${p.slug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.4</priority>\n  </url>\n`;
    // EN blog posts (only those with full English translation) - URL używa slugEn (z fallback do slug)
    if (p.titleEn && p.contentEn) {
      const enSlug = p.slugEn || p.slug;
      xml += `  <url>\n    <loc>${baseUrl}/en/news/${enSlug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
    }
  });

  xml += '</urlset>';

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// 301 Redirects - stare WordPress root-level profile lektorów (np. /marcin/ → /lektorzy/marcin/)
// Dynamiczne sprawdzanie - jeśli slug istnieje w voices.json, przekieruj do /lektorzy/:slug/
app.get('/:slug/', (req, res, next) => {
  const slug = req.params.slug;
  // Nie przechwytuj ścieżek z kropką (pliki statyczne) ani znanych prefixów
  if (slug.includes('.')) return next();
  const voices = loadVoices();
  const voice = voices.find(v => v.id === slug);
  if (voice) {
    return res.redirect(301, '/lektorzy/' + slug + '/');
  }
  next();
});

// 404 catch-all - MUSI być ostatnim routem
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Nie znaleziono strony | powitania.pl',
    description: 'Strona o podanym adresie nie istnieje.'
  });
});

app.listen(PORT, () => {
  console.log(`powitania.pl running on http://localhost:${PORT}`);
});
