const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const REVIEWS_PATH = path.join(__dirname, '..', 'data', 'reviews.json');

function loadReviews() {
  return JSON.parse(fs.readFileSync(REVIEWS_PATH, 'utf8'));
}

function saveReviews(data) {
  fs.writeFileSync(REVIEWS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// --- Auth middleware (taki sam jak w admin.js) ---
function requireAuth(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD || 'powitania2024';

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Wymagane logowanie');
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user === 'admin' && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  return res.status(401).send('Nieprawidłowe hasło');
}

router.use(requireAuth);

// --- Lista opinii ---
router.get('/', (req, res) => {
  const reviews = loadReviews();
  const pending = reviews.filter(r => !r.approved);
  const approved = reviews.filter(r => r.approved);

  res.render('admin/opinie', {
    title: 'Admin — Opinie',
    reviews,
    pending,
    approved,
    msg: req.query.msg || null
  });
});

// --- Zatwierdź opinię ---
router.post('/zatwierdz/:id/', (req, res) => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.id === parseInt(req.params.id));
  if (!review) return res.redirect('/admin/opinie/?msg=Nie+znaleziono');

  review.approved = true;
  saveReviews(reviews);
  res.redirect('/admin/opinie/?msg=Zatwierdzono+opinię+od+' + encodeURIComponent(review.company));
});

// --- Cofnij zatwierdzenie ---
router.post('/cofnij/:id/', (req, res) => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.id === parseInt(req.params.id));
  if (!review) return res.redirect('/admin/opinie/?msg=Nie+znaleziono');

  review.approved = false;
  saveReviews(reviews);
  res.redirect('/admin/opinie/?msg=Cofnięto+zatwierdzenie+opinii+od+' + encodeURIComponent(review.company));
});

// --- Usuń opinię ---
router.post('/usun/:id/', (req, res) => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.id === parseInt(req.params.id));
  if (!review) return res.redirect('/admin/opinie/?msg=Nie+znaleziono');

  const company = review.company;
  const filtered = reviews.filter(r => r.id !== parseInt(req.params.id));
  saveReviews(filtered);
  res.redirect('/admin/opinie/?msg=Usunięto+opinię+od+' + encodeURIComponent(company));
});

module.exports = router;
