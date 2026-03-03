const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { sendMail } = require('../lib/mailer');
const { sendOrderToCRM } = require('../lib/crm-webhook');

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
  const { firmName, name, nip, street, zipCode, city, email, phone, notes, serviceType, industry, generatedText, lektorName, lektorId, totalPrice, isExpress, selectedAddons, selectedMelody } = req.body;

  if (!firmName || !name || !email) {
    return res.status(400).json({ ok: false, error: 'Uzupełnij wymagane pola: nazwa firmy, imię i nazwisko, email.' });
  }

  const address = [street, zipCode, city].filter(Boolean).join(', ');

  try {
    // Mail do biura
    await sendMail({
      subject: `${isExpress ? '⚡ [EKSPRES] ' : '[Zamówienie] '}${firmName} — ${serviceType || 'nagranie'}${lektorName ? ' — ' + lektorName : ''}`,
      replyTo: email,
      html: `
        <h2>Nowe zamówienie nagrania</h2>
        ${isExpress ? '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:bold">⚡ NAGRANIE EKSPRESOWE — priorytetowa realizacja tego samego dnia</div>' : ''}
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
          ${selectedAddons && selectedAddons.length > 0 ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Usługi dodatkowe:</td><td style="padding:8px;border-bottom:1px solid #eee">${selectedAddons.map(a => esc(a)).join(', ')}${selectedMelody ? ' <strong>(melodia: ' + esc(selectedMelody) + ')</strong>' : ''}</td></tr>` : ''}
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

    // Send to CRM (non-blocking — after response)
    sendOrderToCRM({ firmName, name, nip, street, zipCode, city, email, phone, notes, serviceType, industry, generatedText, lektorName, lektorId, totalPrice, isExpress, selectedAddons, selectedMelody, status: 'Order', source: 'powitania.pl (zamówienie)' })
      .catch(err => console.error('[CRM] order webhook error:', err));
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

    // Send to CRM (non-blocking — after response)
    sendOrderToCRM({ name, email, phone, serviceType, industry, lektorName, generatedText, notes: description, status: 'Prospect', source: 'powitania.pl (zapytanie)' })
      .catch(err => console.error('[CRM] inquiry webhook error:', err));
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
      replyTo: email,
      html: `<p>Klient ${esc(email)} zapisał tekst (${esc(serviceType || '—')}).</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>`
    });

    res.json({ ok: true, message: 'Tekst wysłany na podany adres email.' });

    // Send to CRM (non-blocking — after response)
    sendOrderToCRM({ email, serviceType, generatedText, status: 'Prospect', source: 'powitania.pl (zapisany tekst)' })
      .catch(err => console.error('[CRM] save-text webhook error:', err));
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

    // Send to CRM (non-blocking — after response)
    sendOrderToCRM({ name: '', email, lektorName, lektorId, description, status: 'Prospect', source: 'powitania.pl (zapytanie premium)' })
      .catch(err => console.error('[CRM] premium inquiry webhook error:', err));
  } catch (err) {
    console.error('[contact] Premium inquiry error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapytaj o wycenę" — ze strony partnera
router.post('/partner-inquiry', async (req, res) => {
  const { name, company, email, phone, message, partnerId, voiceName } = req.body;

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Podaj imię i adres email.' });
  }

  // Load partner data to determine recipient
  const fs = require('fs');
  const partnersPath = path.join(__dirname, '..', 'data', 'partners.json');
  let partner = null;
  try {
    const partners = JSON.parse(fs.readFileSync(partnersPath, 'utf8'));
    partner = partners.find(p => p.id === partnerId);
  } catch { /* ignore */ }

  const partnerName = partner ? partner.name : 'Nieznany partner';
  const isPartnerMode = partner && partner.orderMode === 'partner' && partner.partnerEmail;
  const recipientEmail = isPartnerMode ? partner.partnerEmail : undefined; // undefined = default (biuro@)

  try {
    // Mail do biura (lub do partnera)
    await sendMail({
      to: recipientEmail,
      subject: `[Partner: ${esc(partnerName)}] Zapytanie — ${esc(voiceName || 'wycena')}`,
      replyTo: email,
      html: `
        <h2>Zapytanie ze strony partnera</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Partner:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(partnerName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Imię:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(name)}</td></tr>
          ${company ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Firma:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(company)}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(email)}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Telefon:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(phone)}</td></tr>` : ''}
          ${voiceName ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Lektor:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(voiceName)}</td></tr>` : ''}
        </table>
        ${message ? `<h3>Wiadomość:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(message)}</p>` : ''}
        <p style="color:#999;font-size:12px">Wysłano ze strony partnera na powitania.pl — ${new Date().toLocaleString('pl-PL')}</p>
      `
    });

    // Potwierdzenie do klienta
    await sendMail({
      to: email,
      subject: 'Potwierdzenie zapytania — ' + esc(partnerName),
      html: `
        <h2 style="color:#1a1d23">Dziękujemy za kontakt!</h2>
        <p>Cześć ${esc(name)},</p>
        <p>Otrzymaliśmy Twoje zapytanie${voiceName ? ' dotyczące lektora <strong>' + esc(voiceName) + '</strong>' : ''}.</p>
        <p>Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00–18:00).</p>
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>${esc(partnerName)}</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">Powered by powitania.pl</p>
      `
    });

    res.json({ ok: true, message: 'Dziękujemy! Odpowiemy w ciągu 2 godzin.' });

    // Send to CRM (non-blocking — after response)
    sendOrderToCRM({ name, firmName: company, email, phone, lektorName: voiceName, description: message, status: 'Prospect', source: 'powitania.pl (partner: ' + partnerName + ')' })
      .catch(err => console.error('[CRM] partner inquiry webhook error:', err));
  } catch (err) {
    console.error('[contact] Partner inquiry error:', err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
