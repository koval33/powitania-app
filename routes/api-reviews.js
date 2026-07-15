const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendMail } = require('../lib/mailer');
const { logInquiry } = require('../lib/inquiry-logger');

const reviewsPath = path.join(__dirname, '..', 'data', 'reviews.json');

function loadReviews() {
  return JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
}

function saveReviews(data) {
  fs.writeFileSync(reviewsPath, JSON.stringify(data, null, 2), 'utf8');
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// POST /api/reviews/add - klient dodaje opinię (domyślnie approved: false)
router.post('/add', (req, res) => {
  const { company, author, text, link } = req.body;

  if (!company || !text) {
    return res.status(400).json({ ok: false, error: 'Nazwa firmy i treść opinii są wymagane.' });
  }

  // Walidacja linku - tylko http(s)
  let cleanLink = '';
  if (link && typeof link === 'string') {
    cleanLink = link.trim();
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) {
      cleanLink = 'https://' + cleanLink;
    }
  }

  const reviews = loadReviews();
  const maxId = reviews.reduce((max, r) => Math.max(max, r.id || 0), 0);

  const newReview = {
    id: maxId + 1,
    company: company.trim(),
    author: (author || '').trim(),
    text: text.trim(),
    link: cleanLink,
    approved: false,
    createdAt: new Date().toISOString()
  };

  reviews.unshift(newReview);
  saveReviews(reviews);

  // Powiadomienie do biura - bez tego nowa opinia siedzi w "Oczekujacych" niezauwazona,
  // dopoki ktos recznie nie zajrzy do panelu. Nieblokujace: zapis juz sie udal, wiec
  // ewentualny blad maila nie moze zepsuc odpowiedzi dla klienta.
  sendMail({
    replyTo: newReview.link || undefined,
    subject: `📝 [NOWA OPINIA - do zatwierdzenia] ${newReview.company}`,
    html: `
      <h2>Nowa opinia do zatwierdzenia</h2>
      <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:bold">
        Opinia czeka na akceptacje w panelu: <a href="https://www.powitania.pl/admin/opinie/">/admin/opinie/</a>
      </div>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Firma:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(newReview.company)}</td></tr>
        ${newReview.author ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Autor:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(newReview.author)}</td></tr>` : ''}
        ${newReview.link ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Link:</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="${esc(newReview.link)}">${esc(newReview.link)}</a></td></tr>` : ''}
      </table>
      <h3>Tresc opinii:</h3>
      <p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(newReview.text)}</p>
      <p style="color:#999;font-size:12px">Wyslano z powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
    `
  })
    .then(() => logInquiry({
      type: 'review',
      data: { company: newReview.company, author: newReview.author || null, reviewId: newReview.id },
      mail_status: 'sent', mail_error: null
    }))
    .catch(err => {
      console.error('[Reviews] Notification email error:', err);
      logInquiry({
        type: 'review',
        data: { company: newReview.company, author: newReview.author || null, reviewId: newReview.id },
        mail_status: 'failed', mail_error: String(err.message || err)
      });
    });

  res.json({ ok: true, message: 'Dziękujemy za opinię! Zostanie opublikowana po weryfikacji.' });
});

module.exports = router;
