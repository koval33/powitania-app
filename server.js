require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://www.youtube.com https://www.googletagmanager.com https://www.google-analytics.com https://js.przelewy24.pl; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; media-src 'self' https:; frame-src https://www.youtube.com https://secure.przelewy24.pl https://sandbox.przelewy24.pl; connect-src 'self' https://www.google-analytics.com https://secure.przelewy24.pl https://sandbox.przelewy24.pl;");
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Data — dynamiczne ładowanie (admin może edytować)
const fs = require('fs');
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

  if (res.locals.isEmbed) {
    res.removeHeader('X-Frame-Options');
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  next();
});

// 301 Redirects — zachowanie starych URL-ów (20 lat SEO history)
app.get('/lektor/:slug/', (req, res) => res.redirect(301, '/lektorzy/' + req.params.slug + '/'));
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

// Admin
app.use('/admin/lektorzy', require('./routes/admin'));
app.use('/admin/opinie', require('./routes/admin-opinie'));
app.use('/admin/partnerzy', require('./routes/admin-partnerzy'));

// Page routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Studio lektorskie | Studio nagrań lektorskich | Powitania.pl',
    description: 'Profesjonalne studio lektorskie. Spoty reklamowe. Wysokiej jakości mikrofony i sprzęt studyjny. Znani i lubiani lektorzy! Zapraszamy.',
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
    title: lektor.name + ' — Lektor | powitania.pl',
    description: lektor.description || ('Profil lektora ' + lektor.name + '. Odsłuchaj próbki głosowe i zamów nagranie.'),
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
    title: 'Lektor | Cena | Powitania.pl',
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
    voices: loadVoices()
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
    voices: loadVoices()
  });
});

app.get('/nagrania-lektorskie/zapowiedzi-telefoniczne/', (req, res) => {
  res.render('uslugi/zapowiedzi-telefoniczne', {
    title: 'Zapowiedzi telefoniczne — Nagrania IVR | powitania.pl',
    description: 'Profesjonalne zapowiedzi telefoniczne i nagrania IVR. Buduj profesjonalny wizerunek firmy już od pierwszego połączenia.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' },
      { name: 'Zapowiedzi telefoniczne', url: '/nagrania-lektorskie/zapowiedzi-telefoniczne/' }
    ],
    voices: loadVoices()
  });
});

app.get('/sesje-zdalne-nagrania-lektorskie-online/', (req, res) => {
  res.render('uslugi/sesje-zdalne', {
    title: 'Sesje zdalne — Nagrania lektorskie online | powitania.pl',
    description: 'Weź udział w sesji nagraniowej zdalnie. Kontroluj proces nagrania w czasie rzeczywistym przez internet.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Sesje zdalne', url: '/sesje-zdalne-nagrania-lektorskie-online/' }
    ]
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
    dutyVoices
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

// EN version placeholder
app.get('/en/', (req, res) => {
  res.render('placeholder', { title: 'powitania.pl — Professional voiceover recordings', description: '', heading: 'English version', message: 'Coming soon!' });
});
// EN — wszystkie stare angielskie podstrony → placeholder
app.get('/en/*', (req, res) => res.redirect(301, '/en/'));

// Sitemap.xml — dynamiczny
app.get('/sitemap.xml', (req, res) => {
  const voices = loadVoices();
  const baseUrl = 'https://www.powitania.pl';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/bank-glosow/', priority: '0.9', changefreq: 'weekly' },
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
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  staticPages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  voices.forEach(v => {
    xml += `  <url>\n    <loc>${baseUrl}/lektorzy/${v.id}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  });

  // Blog posts
  const blogPosts = loadBlogPosts();
  blogPosts.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/aktualnosci-pl/${p.slug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.4</priority>\n  </url>\n`;
  });

  xml += '</urlset>';

  res.set('Content-Type', 'application/xml');
  res.send(xml);
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
