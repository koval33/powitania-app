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

// Page routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'powitania.pl — Profesjonalne nagrania lektorskie',
    description: 'Przygotuj tekst, wybierz lektora, zamów nagranie. Ponad 230 profesjonalnych lektorów, 30+ języków, 24 lata doświadczenia.'
  });
});

app.get('/bank-glosow/', (req, res) => {
  res.render('placeholder', {
    title: 'Bank głosów — powitania.pl',
    description: 'Ponad 230 profesjonalnych lektorów w 30+ językach.',
    heading: 'Bank głosów',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
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
  res.render('placeholder', {
    title: 'Cennik — powitania.pl',
    description: 'Cennik usług nagrań lektorskich.',
    heading: 'Cennik',
    message: 'Ta sekcja jest w przygotowaniu. Wróć wkrótce!'
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
