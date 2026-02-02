const express = require('express');
const router = express.Router();
const { sendMail } = require('../lib/mailer');

// "Zamów nagranie" — pełny formularz
router.post('/order', async (req, res) => {
  const { firmName, name, email, phone, serviceType, industry, generatedText, lektorName } = req.body;

  if (!firmName || !name || !email) {
    return res.status(400).json({ ok: false, error: 'Uzupełnij wymagane pola.' });
  }

  try {
    await sendMail({
      subject: `[Zamówienie] ${firmName} — ${serviceType || 'nagranie'}`,
      replyTo: email,
      html: `
        <h2>Nowe zamówienie nagrania</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Firma:</td><td style="padding:8px">${esc(firmName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Imię:</td><td style="padding:8px">${esc(name)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${esc(email)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Telefon:</td><td style="padding:8px">${esc(phone || '—')}</td></tr>
          ${serviceType ? `<tr><td style="padding:8px;font-weight:bold">Typ usługi:</td><td style="padding:8px">${esc(serviceType)}</td></tr>` : ''}
          ${industry ? `<tr><td style="padding:8px;font-weight:bold">Branża:</td><td style="padding:8px">${esc(industry)}</td></tr>` : ''}
          ${lektorName ? `<tr><td style="padding:8px;font-weight:bold">Lektor:</td><td style="padding:8px">${esc(lektorName)}</td></tr>` : ''}
        </table>
        ${generatedText ? `<h3>Tekst do nagrania:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z kreatora powitania.pl — ${new Date().toLocaleString('pl-PL')}</p>
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

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
