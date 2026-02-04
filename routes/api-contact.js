const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { sendMail } = require('../lib/mailer');

// Multer config for inquiry attachments (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.mp3', '.wav', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// "Zamów nagranie" — pełny formularz z danymi firmy
router.post('/order', async (req, res) => {
  const { firmName, name, nip, street, zipCode, city, email, phone, notes, serviceType, industry, generatedText, lektorName, lektorId, totalPrice } = req.body;

  if (!firmName || !name || !email) {
    return res.status(400).json({ ok: false, error: 'Uzupełnij wymagane pola: nazwa firmy, imię i nazwisko, email.' });
  }

  const address = [street, zipCode, city].filter(Boolean).join(', ');

  try {
    // Mail do biura
    await sendMail({
      subject: `[Zamówienie] ${firmName} — ${serviceType || 'nagranie'}${lektorName ? ' — ' + lektorName : ''}`,
      replyTo: email,
      html: `
        <h2>Nowe zamówienie nagrania</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Firma:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(firmName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Zamawiający:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(name)}</td></tr>
          ${nip ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">NIP:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(nip)}</td></tr>` : ''}
          ${address ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Adres:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(address)}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(email)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Telefon:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(phone || '—')}</td></tr>
          ${serviceType ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Typ nagrania:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(serviceType)}</td></tr>` : ''}
          ${lektorName ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Lektor:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lektorName)}${lektorId ? ' (' + esc(lektorId) + ')' : ''}</td></tr>` : ''}
          ${totalPrice ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Wycena:</td><td style="padding:8px;border-bottom:1px solid #eee;color:#10b981;font-weight:bold">${esc(totalPrice)}</td></tr>` : ''}
        </table>
        ${notes ? `<h3>Uwagi:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(notes)}</p>` : ''}
        ${generatedText ? `<h3>Tekst do nagrania:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl — ${new Date().toLocaleString('pl-PL')}</p>
      `
    });

    // Potwierdzenie do klienta
    await sendMail({
      to: email,
      subject: 'Potwierdzenie zamówienia — Powitania',
      html: `
        <h2 style="color:#1a1d23">Dziękujemy za zamówienie!</h2>
        <p>Cześć ${esc(name)},</p>
        <p>Otrzymaliśmy Twoje zamówienie nagrania${lektorName ? ' u lektora <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00–18:00).</p>
        ${totalPrice ? `<p><strong>Wycena:</strong> ${esc(totalPrice)}</p>` : ''}
        ${generatedText ? `<h3 style="color:#1a1d23;margin-top:24px">Twój tekst:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(generatedText)}</pre>` : ''}
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl — tel. +48 605 491 069 — biuro@powitania.pl</p>
      `
    });

    res.json({ ok: true, message: 'Zamówienie wysłane. Odpowiemy w ciągu 2 godzin.' });
  } catch (err) {
    console.error('[contact] Order error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapytaj o wycenę" — lekki formularz
router.post('/inquiry', async (req, res) => {
  const { name, email, phone, description, generatedText, serviceType, industry, lektorName } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, error: 'Podaj adres email.' });
  }

  try {
    // Mail do biura
    await sendMail({
      subject: `[Zapytanie] ${name || 'Klient'} — ${serviceType || 'wycena'}`,
      replyTo: email,
      html: `
        <h2>Zapytanie o wycenę</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Imię:</td><td style="padding:8px">${esc(name || '—')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${esc(email)}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold">Telefon:</td><td style="padding:8px">${esc(phone)}</td></tr>` : ''}
          ${serviceType ? `<tr><td style="padding:8px;font-weight:bold">Typ usługi:</td><td style="padding:8px">${esc(serviceType)}</td></tr>` : ''}
          ${industry ? `<tr><td style="padding:8px;font-weight:bold">Branża:</td><td style="padding:8px">${esc(industry)}</td></tr>` : ''}
          ${lektorName ? `<tr><td style="padding:8px;font-weight:bold">Lektor:</td><td style="padding:8px">${esc(lektorName)}</td></tr>` : ''}
        </table>
        ${description ? `<h3>Opis projektu:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(description)}</p>` : ''}
        ${generatedText ? `<h3>Tekst z kreatora:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl — ${new Date().toLocaleString('pl-PL')}</p>
      `
    });

    // Potwierdzenie do klienta
    await sendMail({
      to: email,
      subject: 'Potwierdzenie zapytania — Powitania',
      html: `
        <h2 style="color:#1a1d23">Dziękujemy za kontakt!</h2>
        <p>Cześć${name ? ' ' + esc(name) : ''},</p>
        <p>Otrzymaliśmy Twoje zapytanie. Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00–18:00).</p>
        ${description ? `<h3 style="color:#1a1d23;margin-top:24px">Twoja wiadomość:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(description)}</p>` : ''}
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl — tel. +48 605 491 069 — biuro@powitania.pl</p>
      `
    });

    res.json({ ok: true, message: 'Dziękujemy! Odpowiemy w ciągu 2 godzin.' });
  } catch (err) {
    console.error('[contact] Inquiry error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapisz tekst" — lead magnet
router.post('/save-text', async (req, res) => {
  const { email, generatedText, serviceType } = req.body;

  if (!email || !generatedText) {
    return res.status(400).json({ ok: false, error: 'Podaj email.' });
  }

  try {
    // Email do klienta
    await sendMail({
      to: email,
      subject: 'Twój tekst z powitania.pl',
      html: `
        <h2>Twój tekst jest gotowy</h2>
        <pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>
        <p style="margin-top:24px">
          <a href="https://powitania.pl/" style="background:#0693e3;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
            Zamów nagranie tego tekstu
          </a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:32px">powitania.pl — Profesjonalne nagrania lektorskie</p>
      `
    });

    // Notyfikacja do biura
    await sendMail({
      subject: `[Lead] Zapisany tekst — ${email}`,
      html: `<p>Klient ${esc(email)} zapisał tekst (${esc(serviceType || '—')}).</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>`
    });

    res.json({ ok: true, message: 'Tekst wysłany na podany adres email.' });
  } catch (err) {
    console.error('[contact] Save-text error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania.' });
  }
});

// "Zapytaj o wycenę" — lektor premium (z załącznikiem)
router.post('/inquiry-premium', upload.single('attachment'), async (req, res) => {
  const { email, description, lektorName, lektorId } = req.body;

  if (!email || !description) {
    return res.status(400).json({ ok: false, error: 'Uzupełnij opis projektu i email.' });
  }

  try {
    const mailOptions = {
      subject: `[Zapytanie premium] ${lektorName || 'Lektor'} — wycena indywidualna`,
      replyTo: email,
      html: `
        <h2>Zapytanie o wycenę — lektor premium</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Lektor:</td><td style="padding:8px">${esc(lektorName || '—')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">ID lektora:</td><td style="padding:8px">${esc(lektorId || '—')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${esc(email)}</td></tr>
        </table>
        <h3>Opis projektu:</h3>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(description)}</p>
        ${req.file ? '<p style="color:#666;font-size:13px">📎 Załącznik: ' + esc(req.file.originalname) + ' (' + Math.round(req.file.size / 1024) + ' KB)</p>' : ''}
        <p style="color:#999;font-size:12px">Wysłano z profilu lektora na powitania.pl — ${new Date().toLocaleString('pl-PL')}</p>
      `
    };

    // Attach file if present
    if (req.file) {
      mailOptions.attachments = [{
        filename: req.file.originalname,
        content: req.file.buffer
      }];
    }

    // Mail do biura
    await sendMail(mailOptions);

    // Potwierdzenie do klienta
    await sendMail({
      to: email,
      subject: 'Potwierdzenie zapytania — Powitania',
      html: `
        <h2 style="color:#1a1d23">Dziękujemy za zapytanie!</h2>
        <p>Otrzymaliśmy Twoje zapytanie o wycenę${lektorName ? ' lektora <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>Odpowiemy najszybciej jak to możliwe.</p>
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl — tel. +48 605 491 069 — biuro@powitania.pl</p>
      `
    });

    res.json({ ok: true, message: 'Dziękujemy! Odpowiemy najszybciej jak to możliwe.' });
  } catch (err) {
    console.error('[contact] Premium inquiry error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
