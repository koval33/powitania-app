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

// API routes
app.use('/api/kreator', require('./routes/api-kreator'));
app.use('/api/contact', require('./routes/api-contact'));

// Admin
app.use('/admin/lektorzy', require('./routes/admin'));

// Data — dynamiczne ładowanie (admin może edytować)
const fs = require('fs');
const voicesPath = path.join(__dirname, 'data', 'voices.json');
function loadVoices() {
  return JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
}

// Page routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'powitania.pl — Profesjonalne nagrania lektorskie',
    description: 'Przygotuj tekst, wybierz lektora, zamów nagranie. Ponad 230 profesjonalnych lektorów, 30+ języków, 24 lata doświadczenia.',
    voices: loadVoices()
  });
});

app.get('/bank-glosow/', (req, res) => {
  res.render('bank-glosow', {
    title: 'Bank głosów — powitania.pl',
    description: 'Ponad 230 profesjonalnych lektorów w 30+ językach. Odsłuchaj próbki i znajdź idealny głos.',
    voices: loadVoices()
  });
});

app.get('/lektor/:slug/', (req, res) => {
  res.render('placeholder', {
    title: 'Lektor — powitania.pl',
    description: 'Profil lektora',
    heading: 'Profil lektora',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
  });
});

app.get('/cennik/', (req, res) => {
  res.render('cennik', {
    title: 'Cennik — powitania.pl',
    description: 'Cennik usług nagrań lektorskich. Przejrzyste ceny dla dwóch grup cenowych.'
  });
});

app.get('/faq/', (req, res) => {
  res.render('placeholder', {
    title: 'FAQ — powitania.pl',
    description: 'Najczęściej zadawane pytania.',
    heading: 'FAQ',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
  });
});

app.get('/kontakt/', (req, res) => {
  res.render('placeholder', {
    title: 'Kontakt — powitania.pl',
    description: 'Skontaktuj się z nami.',
    heading: 'Kontakt',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
  });
});

app.get('/opinie/', (req, res) => {
  res.render('placeholder', {
    title: 'Opinie — powitania.pl',
    description: 'Co mówią nasi klienci.',
    heading: 'Opinie',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
  });
});

app.get('/nagrania-lektorskie/', (req, res) => {
  res.render('placeholder', {
    title: 'Nagrania lektorskie — powitania.pl',
    description: 'Profesjonalne nagrania lektorskie: IVR, spoty radiowe i TV, e-learning, audiobooki, podcasty.',
    heading: 'Nagrania lektorskie',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
  });
});

// Service subpages
app.get('/nagrania-lektorskie/glos-do-reklamy/', (req, res) => {
  res.render('uslugi/glos-do-reklamy', {
    title: 'Głos do reklamy — Spoty reklamowe | powitania.pl',
    description: 'Profesjonalne spoty reklamowe radiowe, telewizyjne i internetowe. Zatrudnij rozpoznawalne głosy lektorów i stwórz skuteczną reklamę.',
    voices: loadVoices()
  });
});

app.get('/nagrania-lektorskie/lektor-do-filmow/', (req, res) => {
  res.render('uslugi/lektor-do-filmow', {
    title: 'Profesjonalny lektor do filmów | powitania.pl',
    description: 'Narracja lektorska do filmów instruktażowych, korporacyjnych, e-learningowych i promocyjnych. Montaż audio-video w pakiecie.',
    voices: loadVoices()
  });
});

app.get('/nagrania-lektorskie/zapowiedzi-telefoniczne/', (req, res) => {
  res.render('uslugi/zapowiedzi-telefoniczne', {
    title: 'Zapowiedzi telefoniczne — Nagrania IVR | powitania.pl',
    description: 'Profesjonalne zapowiedzi telefoniczne i nagrania IVR. Buduj profesjonalny wizerunek firmy już od pierwszego połączenia.',
    voices: loadVoices()
  });
});

app.get('/sesje-zdalne/', (req, res) => {
  res.render('uslugi/sesje-zdalne', {
    title: 'Sesje zdalne — Zdalny udział w nagraniu | powitania.pl',
    description: 'Weź udział w sesji nagraniowej zdalnie. Kontroluj proces nagrania w czasie rzeczywistym przez internet.'
  });
});

app.get('/nagranie-ekspresowe/', (req, res) => {
  res.render('placeholder', {
    title: 'Nagranie ekspresowe — powitania.pl',
    description: 'Ekspresowe nagrania lektorskie.',
    heading: 'Nagranie ekspresowe',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
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

app.listen(PORT, () => {
  console.log(`powitania.pl running on http://localhost:${PORT}`);
});
