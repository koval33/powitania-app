require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Przekierowanie: powitania.pl → www.powitania.pl (301)
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host === 'powitania.pl' || host === 'powitania-app-production.up.railway.app') {
    return res.redirect(301, 'https://www.powitania.pl' + req.originalUrl);
  }
  next();
});

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Data — dynamiczne ładowanie (admin może edytować)
const fs = require('fs');

// Inicjalizacja plików danych z seedów (Railway volume montuje pusty katalog)
// Pliki użytkownika (reviews, voices, partners) — kopiowane tylko jeśli nie istnieją
// Pliki deweloperskie (blog-posts, melodies) — zawsze nadpisywane z repo
const dataDir = path.join(__dirname, 'data');
const seedDir = path.join(__dirname, 'data-seed');
const alwaysOverwrite = ['blog-posts.json', 'melodies.json', 'voices.json', 'partners.json'];
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
function loadVoices() {
  return JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
}
function loadReviews() {
  return JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
}
function loadBlogPosts() {
  return JSON.parse(fs.readFileSync(blogPath, 'utf8'));
}
function loadPartners() {
  try { return JSON.parse(fs.readFileSync(partnersPath, 'utf8')); }
  catch { return []; }
}
function loadMelodies() {
  try { return JSON.parse(fs.readFileSync(melodiesPath, 'utf8')); }
  catch { return []; }
}

// Healthcheck — monitorowany przez UptimeRobot
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
  res.locals.reviewCount = loadReviews().filter(r => r.approved).length;
  res.locals.gtmId = process.env.GTM_ID || '';
  res.locals.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || '';

  // Hreflang: PL ↔ EN URL mapping for SEO
  var hreflangMap = {
    '/': '/en/',
    '/bank-glosow/': '/en/voice-bank/',
    '/cennik/': '/en/pricing/',
    '/kontakt/': '/en/contact/',
    '/nagrania-lektorskie/': '/en/voiceover-services/',
    '/uslugi/glos-do-reklamy/': '/en/voiceover-services/voice-for-advertising/',
    '/uslugi/lektor-do-filmow/': '/en/voiceover-services/film-voiceover/',
    '/uslugi/zapowiedzi-telefoniczne/': '/en/voiceover-services/phone-announcements/',
    '/uslugi/sesje-zdalne/': '/en/remote-sessions/',
    '/nagranie-ekspresowe/': '/en/express-recording/',
    '/aktualnosci/': '/en/news/'
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

  if (res.locals.isEmbed) {
    res.removeHeader('X-Frame-Options');
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  next();
});

// Auto-redirect non-Polish browsers to English version (only on homepage)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path !== '/') return next();
  // Respect explicit language preference
  if (req.query.lang === 'pl') return next();
  // Don't redirect bots/crawlers (they should index PL as canonical)
  // Includes AI crawlers: GPTBot, ClaudeBot, PerplexityBot, Bytespider, Google-Extended
  const ua = req.headers['user-agent'] || '';
  if (/bot|crawl|spider|slurp|google|bing|yandex|lighthouse|pagespeed|gtmetrix|pingdom|webpagetest|GPTBot|ChatGPT|ClaudeBot|Claude-Web|PerplexityBot|Bytespider|CCBot|Google-Extended/i.test(ua)) return next();
  // Check Accept-Language header
  const lang = req.headers['accept-language'] || '';
  if (!lang.match(/pl/i)) {
    return res.redirect(302, '/en/');
  }
  next();
});

// 301 Redirects — zachowanie starych URL-ów (20 lat SEO history)
app.get('/lektor/:slug/', (req, res) => res.redirect(301, '/lektorzy/' + req.params.slug + '/'));

// Slug cleanup — 301 ze starych slugów z cyframi na czyste
app.get('/lektorzy/dorota-3/',         (req, res) => res.redirect(301, '/lektorzy/dorota-radio/'));
app.get('/lektorzy/michal-5/',         (req, res) => res.redirect(301, '/lektorzy/michal-wszechstronny/'));
app.get('/lektorzy/patryk-2-2/',       (req, res) => res.redirect(301, '/lektorzy/patryk-baryton/'));
app.get('/lektorzy/patryk-2/',         (req, res) => res.redirect(301, '/lektorzy/patryk-baryton/'));
app.get('/lektorzy/anna-2-2/',         (req, res) => res.redirect(301, '/lektorzy/anna-narracja/'));
app.get('/lektorzy/anna-2/',           (req, res) => res.redirect(301, '/lektorzy/anna-narracja/'));
app.get('/lektorzy/marcin-2/',         (req, res) => res.redirect(301, '/lektorzy/marcin-dubbing/'));
app.get('/lektorzy/krzysztof-2/',      (req, res) => res.redirect(301, '/lektorzy/krzysztof-niski-glos/'));
app.get('/lektorzy/maciej-3/',         (req, res) => res.redirect(301, '/lektorzy/maciej-szeptanka/'));

// 1.1 Zombie URLs — stare WordPress attachment paths indeksowane przez Google
app.get('/lektorzy/kuba-bielak.webp',        (req, res) => res.redirect(301, '/lektorzy/kuba-bielak/'));
app.get('/lektorzy/lukasz-nowicki.webp',      (req, res) => res.redirect(301, '/lektorzy/lukasz-nowicki/'));
app.get('/lektorzy/przemyslaw-skowron.webp',  (req, res) => res.redirect(301, '/lektorzy/przemyslaw-skowron/'));
app.get('/lektorzy/maciej-jablonski.webp',    (req, res) => res.redirect(301, '/lektorzy/maciej-jablonski/'));
app.get('/lektorzy/jacek-brzostynski.webp',   (req, res) => res.redirect(301, '/lektorzy/jacek-brzostynski/'));
app.get('/lektorzy/stanislaw-olejniczak.webp',(req, res) => res.redirect(301, '/lektorzy/stanislaw-olejniczak/'));
// Usunięci lektorzy — 410 Gone (Google usuwa z indeksu)
app.get('/lektorzy/slawek-2/', (req, res) => res.status(410).end());
app.get('/lektorzy/zosia/',    (req, res) => res.status(410).end());
app.get('/lektorzy/barbara/',  (req, res) => res.status(410).end());
app.get('/lektorzy/mikolaj/',  (req, res) => res.status(410).end());
app.get('/faq/', (req, res) => res.redirect(301, '/faq-pl/'));
app.get('/sesje-zdalne/', (req, res) => res.redirect(301, '/sesje-zdalne-nagrania-lektorskie-online/'));
app.get('/nagrania-lektorskie/lektor-do-filmow/', (req, res) => res.redirect(301, '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/'));
app.get('/lista-lektorow/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/szukaj/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/ceny-lektora/', (req, res) => res.redirect(301, '/cennik/'));
app.get('/ceny-lektora', (req, res) => res.redirect(301, '/cennik/'));
app.get('/voice-over/', (req, res) => res.redirect(301, '/'));
app.get('/twoj-bank-glosow/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/nagranie/', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));
app.get('/referencje/', (req, res) => res.redirect(301, '/opinie/'));
app.get('/search/*', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/search/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/uncategorized-pl/*', (req, res) => res.redirect(301, '/aktualnosci-pl/'));

// 301 Redirects — WordPress feed/RSS URLs (nie istnieją w nowym serwisie)
app.get('*/feed/rss2/', (req, res) => res.redirect(301, '/'));
app.get('*/feed/', (req, res) => res.redirect(301, '/'));

// 301 Redirects — stare WordPress URLs powodujące 5xx w Google Search Console
app.get('/wp-content/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-includes/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-admin/*', (req, res) => res.redirect(301, '/'));
app.get('/wp-login.php', (req, res) => res.redirect(301, '/'));

// 301 Redirects — strony systemowe (nie istnieją w nowym serwisie)
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

// API: sprawdź dostępność filmów YouTube (proxy oEmbed — CORS)
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

// Health check — kreator (testuje połączenie z Anthropic API)
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

// Admin
app.use('/admin/lektorzy', require('./routes/admin'));
app.use('/admin/opinie', require('./routes/admin-opinie'));
app.use('/admin/partnerzy', require('./routes/admin-partnerzy'));

// Page routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Profesjonalne Studio Lektorskie Powitania.pl — od 2001 roku | 230+ lektorów',
    description: 'Studio lektorskie Powitania.pl — 230+ profesjonalnych lektorów w 30+ językach. Spoty reklamowe, zapowiedzi telefoniczne IVR, audiobooki, narracje filmowe. 8600+ zrealizowanych nagrań. Klienci: Allegro, DHL, TVN, Volvo.',
    voices: loadVoices(),
    posts: loadBlogPosts().slice(0, 6)
  });
});

app.get('/bank-glosow/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Bank głosów lektorskich | Baza lektorów | Głosy lektorskie | Powitania.pl',
    description: 'Profesjonalny bank głosów. Największa baza głosów lektorskich. Przykładowe nagrania lektorskie. Doświadczeni lektorzy. Zachęcamy do realizacji nagrań!',
    voices: loadVoices()
  });
});

// 1.2 Gender-specific URLs
app.get('/bank-glosow/meskie/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Głosy męskie — 143 lektorów do nagrań | powitania.pl',
    description: 'Bank głosów męskich. 143 profesjonalnych lektorów — dokumentalny, reklamowy, narracyjny. Odsłuchaj próbki i zamów nagranie. Studio powitania.pl od 2001.',
    voices: loadVoices().filter(v => v.gender === 'm'),
    genderSegment: 'm',
    pageH1: 'Głosy męskie do nagrań'
  });
});
app.get('/bank-glosow/zenskie/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Głosy żeńskie — 91 lektorek do nagrań | powitania.pl',
    description: 'Bank głosów żeńskich. 91 profesjonalnych lektorek — ciepły, elegancki, dynamiczny. Odsłuchaj próbki i zamów nagranie. Studio powitania.pl od 2001.',
    voices: loadVoices().filter(v => v.gender === 'f'),
    genderSegment: 'f',
    pageH1: 'Głosy żeńskie do nagrań'
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
    title: lektor.seoTitle || (lektor.name + ' — Lektor | powitania.pl'),
    description: lektor.seoDescription || lektor.description || ('Profil lektora ' + lektor.name + '. Odsłuchaj próbki głosowe i zamów nagranie.'),
    ogImage: lektor.photo ? ('https://www.powitania.pl' + lektor.photo) : undefined,
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

app.get('/cennik/', (req, res) => {
  res.render('cennik', {
    title: 'Lektor | Cena | Nagrania lektorskie cennik | Powitania.pl',
    description: 'Profesjonalne nagrania lektorskie. Poznaj cennik! Rozbudowana baza, najlepsi lektorzy. Doświadczenie i szybka realizacja. Zapraszamy do zapoznania się z ofertą.'
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
    description: 'Skontaktuj się z nami. Odpowiadamy w ciągu 2 godzin.'
  });
});

app.get('/opinie/', (req, res) => {
  const allReviews = loadReviews();
  const reviews = allReviews.filter(r => r.approved);
  res.render('opinie', {
    title: 'Opinie Klientów | powitania.pl',
    description: 'Przeczytaj opinie naszych Klientów. Ponad ' + reviews.length + ' opinii od Klientów z całej Polski.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Opinie', url: '/opinie/' }
    ],
    reviews
  });
});

app.get('/nagrania-lektorskie/', (req, res) => {
  res.render('nagrania-lektorskie', {
    title: 'Nagrania lektorskie | Lektor, głos do reklamy | Powitania.pl',
    description: 'Najlepsze nagrania lektorskie, znane głosy do reklamy. Audiobooki, komunikaty lektorskie. Zapoznaj się z naszą bazą i wybierz lektora do reklamy. Zapraszamy!',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' }
    ]
  });
});

// Service subpages
app.get('/nagrania-lektorskie/glos-do-reklamy/', (req, res) => {
  res.render('uslugi/glos-do-reklamy', {
    title: 'Głos do reklamy | Lektor do reklamy | Powitania.pl',
    description: 'Przyciągnij uwagę słuchaczy – wybierz głos do reklamy, który sprzedaje. Profesjonalny lektor do reklamy, różne barwy głosu i ekspresja dopasowana do Twojej marki.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Głos do reklamy', url: '/nagrania-lektorskie/glos-do-reklamy/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Głos do reklamy — nagrania lektorskie',
      'description': 'Profesjonalne nagrania lektorskie do spotów reklamowych radiowych, telewizyjnych i internetowych. Ponad 230 lektorów, realizacja w 24-48h.',
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
    description: 'Profesjonalny lektor do filmów – naturalny głos, wysoka jakość nagrań, szybka realizacja. Idealny wybór do filmów promocyjnych, instruktażowych dokumentalnych.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Profesjonalny lektor do filmów', url: '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Lektor do filmów — narracje filmowe i korporacyjne',
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
    title: 'Zapowiedzi telefoniczne | Powitania telefoniczne | Powitania.pl',
    description: 'Najwyższej jakości zapowiedzi telefoniczne. Realizacja we współpracy z klientem. Pomoc w redagowaniu tekstów. Zachęcamy do realizacji nagrań.',
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
      'serviceType': 'Zapowiedzi telefoniczne IVR'
    }
  });
});

app.get('/sesje-zdalne-nagrania-lektorskie-online/', (req, res) => {
  res.render('uslugi/sesje-zdalne', {
    title: 'Sesje zdalne — Nagrania lektorskie online | powitania.pl',
    description: 'Weź udział w sesji nagraniowej zdalnie. Kontroluj proces nagrania w czasie rzeczywistym przez internet.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Sesje zdalne', url: '/sesje-zdalne-nagrania-lektorskie-online/' }
    ],
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Sesje zdalne — nagrania lektorskie online',
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
  // Dyżurujący lektorzy — lektorzy z turnaround "24h" i ze zdjęciem, ceny +50%
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
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagranie ekspresowe', url: '/nagranie-ekspresowe/' }
    ],
    dutyVoices,
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Nagranie ekspresowe — realizacja tego samego dnia',
      'description': 'Nagrania lektorskie ekspresowe: zamów do 14:00, otrzymaj do 18:00. Dostępne również w weekendy i święta. Dopłata ekspresowa 50%.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'PL',
      'url': 'https://www.powitania.pl/nagranie-ekspresowe/',
      'serviceType': 'Nagrania ekspresowe'
    }
  });
});

// O firmie
app.get('/o-firmie/', (req, res) => {
  res.render('o-firmie', {
    title: 'O firmie | powitania.pl',
    description: 'OPTIMUM Paweł Kowalski — studio nagrań lektorskich działające od 2001 roku. Ponad 230 lektorów, 30+ języków.',
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

// Blog / Aktualności — lista postów
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

// Blog — paginacja
app.get('/aktualnosci-pl/strona/:page/', (req, res) => {
  const posts = loadBlogPosts();
  const perPage = 10;
  const currentPage = parseInt(req.params.page) || 1;
  if (currentPage < 1) return res.redirect('/aktualnosci-pl/');
  const totalPages = Math.ceil(posts.length / perPage);
  if (currentPage > totalPages) return res.redirect('/aktualnosci-pl/');
  const pagePosts = posts.slice((currentPage - 1) * perPage, currentPage * perPage);
  res.render('aktualnosci', {
    title: 'Aktualności — strona ' + currentPage + ' | powitania.pl',
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

// Blog — pojedynczy post
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
    title: post.title + ' | powitania.pl',
    description: post.excerpt,
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

// 301 Redirects — stare URL-e bloga (WordPress category)
app.get('/category/aktualnosci-pl/', (req, res) => res.redirect(301, '/aktualnosci-pl/'));
app.get('/category/aktualnosci-pl/page/:page/', (req, res) => res.redirect(301, '/aktualnosci-pl/strona/' + req.params.page + '/'));

// 301 Redirects — portfolio (stare URL-e → nowe podstrony usług)
app.get('/portfolio/', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));
app.get('/portfolio/zapowiedzi-telefoniczne/', (req, res) => res.redirect(301, '/nagrania-lektorskie/zapowiedzi-telefoniczne/'));
app.get('/portfolio/reklama-radiowa/', (req, res) => res.redirect(301, '/nagrania-lektorskie/glos-do-reklamy/'));
app.get('/portfolio/lektorzy-online/', (req, res) => res.redirect(301, '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/'));
app.get('/portfolio/*', (req, res) => res.redirect(301, '/nagrania-lektorskie/'));

// 301 Redirects — stare WordPress sitemap i inne strony powodujące 404
app.get('/page-sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/post-sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/zamowienie-nagrania/', (req, res) => res.redirect(301, '/cennik/'));

// Partner pages — /p/:slug/
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
app.get('/bank/glosy-meskie/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/glosy-zenskie/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/natives/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/znani-i-lubiani/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/bank/*/page/*', (req, res) => res.redirect(301, '/bank-glosow/'));

// === English version (Phase 1) ===
app.get('/en/', (req, res) => {
  res.render('en/index', {
    title: 'Professional Voiceover Studio Powitania.pl — since 2001 | 230+ voice artists',
    description: 'Powitania.pl voiceover studio — 230+ professional voice artists in 30+ languages. Advertising spots, IVR phone announcements, audiobooks, film narration. 8600+ projects completed. Clients: Allegro, DHL, TVN, Volvo.',
    voices: loadVoices(),
    posts: loadBlogPosts().slice(0, 6)
  });
});

app.get('/en/voice-bank/', (req, res) => {
  res.render('en/bank-glosow', {
    title: 'Voice Bank | Professional Voice Artists | Powitania.pl',
    description: 'Browse our voice bank with over 230 professional voice artists. Listen to samples, filter by language, gender, and style.',
    voices: loadVoices()
  });
});

app.get('/en/pricing/', (req, res) => {
  res.render('en/cennik', {
    title: 'Pricing | Voiceover Recordings | Powitania.pl',
    description: 'Professional voiceover recording prices. Transparent pricing for advertising spots, IVR, film narration, and more.'
  });
});

app.get('/en/contact/', (req, res) => {
  res.render('en/kontakt', {
    title: 'Contact | Powitania.pl',
    description: 'Get in touch with our voiceover studio. We respond within 2 hours.'
  });
});

app.get('/en/voiceover-services/', (req, res) => {
  res.render('en/voiceover-services', {
    title: 'Voiceover Recordings | Professional Voice Artists | Powitania.pl',
    description: 'Professional voiceover recordings: phone announcements, advertising spots, film narration, audiobooks, e-learning. Over 230 voice artists in 30+ languages.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' }
    ]
  });
});

app.get('/en/voiceover-services/voice-for-advertising/', (req, res) => {
  res.render('en/voice-for-advertising', {
    title: 'Voice for Advertising | Radio & TV Spots | Powitania.pl',
    description: 'Hire recognisable voice artists for your advertising spots. Radio, TV, social media — professional voiceover recordings that sell.',
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'Voiceover Services', url: '/en/voiceover-services/' },
      { name: 'Voice for Advertising', url: '/en/voiceover-services/voice-for-advertising/' }
    ],
    voices: loadVoices(),
    serviceSchema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Voice for Advertising — Radio & TV Voiceover',
      'description': 'Professional voiceover recordings for radio, TV and online advertising spots. 230+ voice artists, 30+ languages, 24-48h turnaround.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/voiceover-services/voice-for-advertising/',
      'serviceType': 'Advertising Voiceover'
    }
  });
});

app.get('/en/voiceover-services/film-voiceover/', (req, res) => {
  res.render('en/film-voiceover', {
    title: 'Professional Film Voiceover | Narration & Audio-Video | Powitania.pl',
    description: 'Professional film voiceover — narration for corporate, instructional, e-learning and promotional videos. Audio-video editing included.',
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
    title: 'Phone Announcements | IVR Recordings | Powitania.pl',
    description: 'Professional IVR recordings and phone announcements. Company greetings, voice menus, after-hours messages. Multilingual support.',
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
      'serviceType': 'IVR Phone Announcements'
    }
  });
});

app.get('/en/remote-sessions/', (req, res) => {
  res.render('en/remote-sessions', {
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

app.get('/en/express-recording/', (req, res) => {
  const voices = loadVoices();
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
      'name': 'Express Voiceover Recording — Same-Day Delivery',
      'description': 'Same-day voiceover recordings: order by 2 PM, receive by 6 PM. Available on weekends and public holidays. Express surcharge applies.',
      'provider': { '@type': 'Organization', 'name': 'Powitania.pl', 'url': 'https://www.powitania.pl' },
      'areaServed': 'Worldwide',
      'url': 'https://www.powitania.pl/en/express-recording/',
      'serviceType': 'Express Voiceover Recording'
    }
  });
});

// EN — News / Blog
app.get('/en/news/', (req, res) => {
  const posts = loadBlogPosts();
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
  const posts = loadBlogPosts();
  const perPage = 10;
  const currentPage = parseInt(req.params.page) || 1;
  if (currentPage < 1) return res.redirect('/en/news/');
  const totalPages = Math.ceil(posts.length / perPage);
  if (currentPage > totalPages) return res.redirect('/en/news/');
  const pagePosts = posts.slice((currentPage - 1) * perPage, currentPage * perPage);
  res.render('en/news', {
    title: 'News — page ' + currentPage + ' | Powitania.pl',
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
  const posts = loadBlogPosts();
  const idx = posts.findIndex(p => p.slug === req.params.slug);
  if (idx === -1) {
    return res.status(404).render('404', {
      title: 'Article not found | Powitania.pl',
      description: 'The article at this address does not exist.'
    });
  }
  const post = posts[idx];
  res.render('en/blog-post', {
    title: (post.titleEn || post.title) + ' | Powitania.pl',
    description: post.excerptEn || post.excerpt,
    noindex: !post.contentEn,
    breadcrumbs: [
      { name: 'Home', url: '/en/' },
      { name: 'News', url: '/en/news/' },
      { name: post.titleEn || post.title, url: '/en/news/' + post.slug + '/' }
    ],
    post,
    prevPost: idx > 0 ? posts[idx - 1] : null,
    nextPost: idx < posts.length - 1 ? posts[idx + 1] : null
  });
});

// EN — Voice artist profile
var EUR_RATE = 4.25;
function plnToEur(pln) {
  if (typeof pln !== 'number') return pln;
  var eur = pln / EUR_RATE;
  // Round to nearest 5 for amounts >= 25, otherwise round to nearest integer
  return eur >= 25 ? Math.round(eur / 5) * 5 : Math.round(eur);
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
  res.render('en/voice-artist', {
    title: lektor.name + ' — Voice Artist | Powitania.pl',
    description: lektor.descriptionEn || lektor.description || ('Voice artist profile: ' + lektor.name + '. Listen to voice samples and order a recording.'),
    ogImage: lektor.photo ? ('https://www.powitania.pl' + lektor.photo) : undefined,
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

// 301 Redirects — stare EN URL-e (WordPress / dev.powitania.pl patterns)
app.get('/en/lectors/:slug/', (req, res) => res.redirect(301, '/en/voice-artists/' + req.params.slug + '/'));
app.get('/en/lectors/', (req, res) => res.redirect(301, '/en/voice-bank/'));
app.get('/en/search/*', (req, res) => res.redirect(301, '/en/'));
app.get('/en/thank-you/feed/', (req, res) => res.redirect(301, '/en/'));
app.get('/en/thank-you/', (req, res) => res.redirect(301, '/en/'));

// EN — strony bez dedykowanego tłumaczenia → redirect na główną EN
app.get('/en/*', (req, res) => res.redirect(302, '/en/'));

// Sitemap.xml — dynamiczny
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
    { url: '/nagrania-lektorskie/glos-do-reklamy/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/profesjonalny-lektor-do-filmow/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagrania-lektorskie/zapowiedzi-telefoniczne/', priority: '0.8', changefreq: 'monthly' },
    { url: '/sesje-zdalne-nagrania-lektorskie-online/', priority: '0.8', changefreq: 'monthly' },
    { url: '/nagranie-ekspresowe/', priority: '0.7', changefreq: 'monthly' },
    { url: '/cennik/', priority: '0.7', changefreq: 'monthly' },
    { url: '/kontakt/', priority: '0.7', changefreq: 'monthly' },
    { url: '/opinie/', priority: '0.7', changefreq: 'monthly' },
    { url: '/faq-pl/', priority: '0.6', changefreq: 'monthly' },
    { url: '/o-firmie/', priority: '0.6', changefreq: 'monthly' },
    { url: '/aktualnosci-pl/', priority: '0.7', changefreq: 'weekly' },
    { url: '/polityka-prywatnosci/', priority: '0.3', changefreq: 'yearly' },
    { url: '/regulamin-serwisu/', priority: '0.3', changefreq: 'yearly' },
    // /bank/* routes now redirect to /bank-glosow/ — removed from sitemap
    // English version
    { url: '/en/', priority: '0.8', changefreq: 'weekly' },
    { url: '/en/voice-bank/', priority: '0.7', changefreq: 'weekly' },
    { url: '/en/voiceover-services/', priority: '0.7', changefreq: 'monthly' },
    { url: '/en/voiceover-services/voice-for-advertising/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/voiceover-services/film-voiceover/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/voiceover-services/phone-announcements/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/remote-sessions/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/express-recording/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/pricing/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/contact/', priority: '0.6', changefreq: 'monthly' },
    { url: '/en/news/', priority: '0.5', changefreq: 'weekly' },
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
    xml += `  <url>\n    <loc>${baseUrl}/aktualnosci-pl/${p.slug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.4</priority>\n  </url>\n`;
    // EN blog posts (only those with full English translation)
    if (p.titleEn && p.contentEn) {
      xml += `  <url>\n    <loc>${baseUrl}/en/news/${p.slug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
    }
  });

  xml += '</urlset>';

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// 301 Redirects — stare WordPress root-level profile lektorów (np. /marcin/ → /lektorzy/marcin/)
// Dynamiczne sprawdzanie — jeśli slug istnieje w voices.json, przekieruj do /lektorzy/:slug/
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

// 404 catch-all — MUSI być ostatnim routem
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Nie znaleziono strony | powitania.pl',
    description: 'Strona o podanym adresie nie istnieje.'
  });
});

app.listen(PORT, () => {
  console.log(`powitania.pl running on http://localhost:${PORT}`);
});
