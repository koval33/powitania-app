const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const reviewsPath = path.join(__dirname, '..', 'data', 'reviews.json');

function loadReviews() {
  return JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
}

function saveReviews(data) {
  fs.writeFileSync(reviewsPath, JSON.stringify(data, null, 2), 'utf8');
}

// POST /api/reviews/add — klient dodaje opinię (domyślnie approved: false)
router.post('/add', (req, res) => {
  const { company, author, text } = req.body;

  if (!company || !text) {
    return res.status(400).json({ ok: false, error: 'Nazwa firmy i treść opinii są wymagane.' });
  }

  const reviews = loadReviews();
  const maxId = reviews.reduce((max, r) => Math.max(max, r.id || 0), 0);

  const newReview = {
    id: maxId + 1,
    company: company.trim(),
    author: (author || '').trim(),
    text: text.trim(),
    approved: false,
    createdAt: new Date().toISOString()
  };

  reviews.unshift(newReview);
  saveReviews(reviews);

  res.json({ ok: true, message: 'Dziękujemy za opinię! Zostanie opublikowana po weryfikacji.' });
});

module.exports = router;
