require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
app.get('/voice-over/', (req, res) => res.redirect(301, '/'));
app.get('/twoj-bank-glosow/', (req, res) => res.redirect(301, '/bank-glosow/'));
app.get('/sitemap.html', (req, res) => res.redirect(301, '/sitemap.xml'));

// API routes
app.use('/api/kreator', require('./routes/api-kreator'));
app.use('/api/contact', require('./routes/api-contact'));
app.use('/api/reviews', require('./routes/api-reviews'));

// Admin
app.use('/admin/lektorzy', require('./routes/admin'));
app.use('/admin/opinie', require('./routes/admin-opinie'));

// Data — dynamiczne ładowanie (admin może edytować)
const fs = require('fs');
const voicesPath = path.join(__dirname, 'data', 'voices.json');
const reviewsPath = path.join(__dirname, 'data', 'reviews.json');
function loadVoices() {
  return JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
}
function loadReviews() {
  return JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
}

// Page routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Studio, usługi lektorskie | Lektor, głos do reklamy | powitania.pl',
    description: 'Przygotuj tekst, wybierz lektora, zamów nagranie. Ponad 230 profesjonalnych lektorów, 30+ języków, 24 lata doświadczenia.',
    voices: loadVoices()
  });
});

app.get('/bank-glosow/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Bank głosów lektorskich | Baza lektorów | powitania.pl',
    description: 'Ponad 230 profesjonalnych lektorów w 30+ językach. Odsłuchaj próbki i znajdź idealny głos.',
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
    similar: similar
  });
});

app.get('/cennik/', (req, res) => {
  res.render('cennik', {
    title: 'Cennik | Lektor, atrakcyjna cena | powitania.pl',
    description: 'Cennik usług nagrań lektorskich. Przejrzyste ceny dla dwóch grup cenowych.'
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
    title: 'Opinie klientów | powitania.pl',
    description: 'Przeczytaj opinie naszych klientów. Ponad ' + reviews.length + ' firm i instytucji zaufało naszemu studiu nagrań lektorskich.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Opinie', url: '/opinie/' }
    ],
    reviews
  });
});

app.get('/nagrania-lektorskie/', (req, res) => {
  res.render('nagrania-lektorskie', {
    title: 'Nagrania lektorskie | Cennik | powitania.pl',
    description: 'Najlepsze nagrania lektorskie, znane głosy, doświadczeni lektorzy. Audiobooki, komunikaty lektorskie, spoty reklamowe, zapowiedzi telefoniczne.',
    breadcrumbs: [
      { name: 'Strona główna', url: '/' },
      { name: 'Nagrania lektorskie', url: '/nagrania-lektorskie/' }
    ]
  });
});

// Service subpages
app.get('/nagrania-lektorskie/glos-do-reklamy/', (req, res) => {
  res.render('uslugi/glos-do-reklamy', {
    title: 'Głos do reklamy — Spoty reklamowe | powitania.pl',
    description: 'Profesjonalne spoty reklamowe radiowe, telewizyjne i internetowe. Zatrudnij rozpoznawalne głosy lektorów i stwórz skuteczną reklamę.',
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
    title: 'Profesjonalny lektor do filmów | powitania.pl',
    description: 'Narracja lektorska do filmów instruktażowych, korporacyjnych, e-learningowych i promocyjnych. Montaż audio-video w pakiecie.',
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
  // Dyżurujący lektorzy — lektorzy z turnaround "24h" i ze zdjęciem
  const dutyVoices = voices
    .filter(v => v.turnaround && v.turnaround.includes('24') && v.photo)
    .slice(0, 6);
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

// Partner iframe routes (E2 — placeholder)
app.get('/bank/glosy-meskie/', (req, res) => {
  res.render('placeholder', { title: 'Głosy męskie', description: '', heading: 'Głosy męskie', message: 'W przygotowaniu.' });
});
app.get('/bank/glosy-zenskie/', (req, res) => {
  res.render('placeholder', { title: 'Głosy żeńskie', description: '', heading: 'Głosy żeńskie', message: 'W przygotowaniu.' });
});
app.get('/bank/natives/', (req, res) => {
  res.render('placeholder', { title: 'Natives', description: '', heading: 'Native speakers', message: 'W przygotowaniu.' });
});
app.get('/bank/znani-i-lubiani/', (req, res) => {
  res.render('placeholder', { title: 'Znani i lubiani', description: '', heading: 'Znani i lubiani', message: 'W przygotowaniu.' });
});

// EN version placeholder
app.get('/en/', (req, res) => {
  res.render('placeholder', { title: 'powitania.pl — Professional voiceover recordings', description: '', heading: 'English version', message: 'Coming soon!' });
});

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
    { url: '/bank/glosy-meskie/', priority: '0.6', changefreq: 'weekly' },
    { url: '/bank/glosy-zenskie/', priority: '0.6', changefreq: 'weekly' },
    { url: '/bank/natives/', priority: '0.6', changefreq: 'weekly' },
    { url: '/bank/znani-i-lubiani/', priority: '0.6', changefreq: 'weekly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  staticPages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  voices.forEach(v => {
    xml += `  <url>\n    <loc>${baseUrl}/lektorzy/${v.id}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
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
