const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { sendMail } = require('../lib/mailer');
const { validateNIP, validateZipCode, validatePhone } = require('../lib/validate');
const { sendOrderToCRM } = require('../lib/crm-webhook');
const { logInquiry } = require('../lib/inquiry-logger');

// Helper - klasyfikuje wynik sendMail i loguje do data/inquiries-log.jsonl.
// mail_status: 'sent' | 'dev_mode_silenced' (brak EmailLabs ENV) | 'failed' (exception).
function logWithStatus(type, data, mailResults, error) {
  let mailStatus = 'sent';
  if (error) mailStatus = 'failed';
  else if (Array.isArray(mailResults) && mailResults.some(r => r && r.dev)) mailStatus = 'dev_mode_silenced';
  logInquiry({ type, data, mail_status: mailStatus, mail_error: error ? String(error.message || error) : null });
}

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

// "Zamów nagranie" - pełny formularz z danymi firmy
router.post('/order', async (req, res) => {
  const { firmName, name, nip, street, zipCode, city, email, phone, notes, serviceType, industry, generatedText, lektorName, lektorId, totalPrice, isExpress, selectedAddons, selectedMelody, lang } = req.body;
  const isEN = lang === 'en';

  if (!firmName || !name || !email) {
    return res.status(400).json({ ok: false, error: isEN ? 'Please fill in the required fields: company name, full name, email.' : 'Uzupełnij wymagane pola: nazwa firmy, imię i nazwisko, email.' });
  }

  // Walidacja formatu pól
  const nipCheck = validateNIP(nip);
  if (!nipCheck.ok) return res.status(400).json({ ok: false, error: nipCheck.error });
  const zipCheck = validateZipCode(zipCode);
  if (!zipCheck.ok) return res.status(400).json({ ok: false, error: zipCheck.error });
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.ok) return res.status(400).json({ ok: false, error: phoneCheck.error });

  const address = [street, zipCode, city].filter(Boolean).join(', ');

  const mailResults = [];
  try {
    // Mail do biura
    mailResults.push(await sendMail({
      subject: `${isExpress ? '⚡ [EKSPRES] ' : '[Zamówienie] '}${firmName} - ${serviceType || 'nagranie'}${lektorName ? ' - ' + lektorName : ''}`,
      replyTo: email,
      html: `
        <h2>Nowe zamówienie nagrania</h2>
        ${isExpress ? '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:bold">⚡ NAGRANIE EKSPRESOWE - priorytetowa realizacja tego samego dnia</div>' : ''}
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Firma:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(firmName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Zamawiający:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(name)}</td></tr>
          ${nip ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">NIP:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(nip)}</td></tr>` : ''}
          ${address ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Adres:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(address)}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(email)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Telefon:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(phone || '-')}</td></tr>
          ${serviceType ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Typ nagrania:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(serviceType)}</td></tr>` : ''}
          ${lektorName ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Lektor:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(lektorName)}${lektorId ? ' (' + esc(lektorId) + ')' : ''}</td></tr>` : ''}
          ${totalPrice ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Wycena:</td><td style="padding:8px;border-bottom:1px solid #eee;color:#10b981;font-weight:bold">${esc(totalPrice)}</td></tr>` : ''}
          ${selectedAddons && selectedAddons.length > 0 ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Usługi dodatkowe:</td><td style="padding:8px;border-bottom:1px solid #eee">${selectedAddons.map(a => esc(a)).join(', ')}${selectedMelody ? ' <strong>(melodia: ' + esc(selectedMelody) + ')</strong>' : ''}</td></tr>` : ''}
        </table>
        ${notes ? `<h3>Uwagi:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(notes)}</p>` : ''}
        ${generatedText ? `<h3>Tekst do nagrania:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
      `
    }));

    // Potwierdzenie do klienta
    mailResults.push(await sendMail({
      to: email,
      subject: isEN ? 'Order confirmation - Powitania' : 'Potwierdzenie zamówienia - Powitania',
      html: isEN ? `
        <h2 style="color:#1a1d23">Thank you for your order!</h2>
        <p>Hi ${esc(name)},</p>
        <p>We have received your recording order${lektorName ? ' with voice artist <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>We will respond within 2 hours during business hours (Mon-Fri 8:00 AM - 6:00 PM CET).</p>
        ${totalPrice ? `<p><strong>Quote:</strong> ${esc(totalPrice)}</p>` : ''}
        ${generatedText ? `<h3 style="color:#1a1d23;margin-top:24px">Your script:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(generatedText)}</pre>` : ''}
        <p style="margin-top:32px">Best regards,<br><strong>Powitania Team</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      ` : `
        <h2 style="color:#1a1d23">Dziękujemy za zamówienie!</h2>
        <p>Cześć ${esc(name)},</p>
        <p>Otrzymaliśmy Twoje zamówienie nagrania${lektorName ? ' u lektora <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00-18:00).</p>
        ${totalPrice ? `<p><strong>Wycena:</strong> ${esc(totalPrice)}</p>` : ''}
        ${generatedText ? `<h3 style="color:#1a1d23;margin-top:24px">Twój tekst:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(generatedText)}</pre>` : ''}
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      `
    }));

    logWithStatus('order', { firmName, name, email, phone, lektorName, lektorId, serviceType, industry, totalPrice, isExpress, notes }, mailResults, null);
    res.json({ ok: true, message: isEN ? 'Order sent. We will respond within 2 hours.' : 'Zamówienie wysłane. Odpowiemy w ciągu 2 godzin.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ firmName, name, nip, street, zipCode, city, email, phone, notes, serviceType, industry, generatedText, lektorName, lektorId, totalPrice, isExpress, selectedAddons, selectedMelody, status: 'Order', source: 'powitania.pl (zamówienie)' })
      .catch(err => console.error('[CRM] order webhook error:', err));
  } catch (err) {
    console.error('[contact] Order error:', err);
    logWithStatus('order', { firmName, name, email, phone, lektorName, lektorId, serviceType, industry, totalPrice, isExpress, notes }, mailResults, err);
    res.status(500).json({ ok: false, error: isEN ? 'An error occurred. Please try again.' : 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapytaj o wycenę" - lekki formularz
router.post('/inquiry', upload.single('attachment'), async (req, res) => {
  const { name, email, phone, description, generatedText, serviceType, industry, lektorName, lang } = req.body;
  const isEN = lang === 'en';

  if (!email) {
    return res.status(400).json({ ok: false, error: isEN ? 'Please provide your email address.' : 'Podaj adres email.' });
  }
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.ok) return res.status(400).json({ ok: false, error: phoneCheck.error });

  const mailResults = [];
  try {
    // Mail do biura
    const officeMail = {
      subject: `[Zapytanie] ${name || 'Klient'} - ${serviceType || 'wycena'}`,
      replyTo: email,
      html: `
        <h2>Zapytanie o wycenę</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Imię:</td><td style="padding:8px">${esc(name || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${esc(email)}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold">Telefon:</td><td style="padding:8px">${esc(phone)}</td></tr>` : ''}
          ${serviceType ? `<tr><td style="padding:8px;font-weight:bold">Typ usługi:</td><td style="padding:8px">${esc(serviceType)}</td></tr>` : ''}
          ${industry ? `<tr><td style="padding:8px;font-weight:bold">Branża:</td><td style="padding:8px">${esc(industry)}</td></tr>` : ''}
          ${lektorName ? `<tr><td style="padding:8px;font-weight:bold">Lektor:</td><td style="padding:8px">${esc(lektorName)}</td></tr>` : ''}
        </table>
        ${description ? `<h3>Opis projektu:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(description)}</p>` : ''}
        ${generatedText ? `<h3>Tekst z kreatora:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>` : ''}
        ${req.file ? `<p style="color:#666;font-size:13px">📎 Załącznik: ${esc(req.file.originalname)} (${Math.round(req.file.size / 1024)} KB)</p>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
      `
    };
    // Dołącz plik jeśli przesłany
    if (req.file) {
      officeMail.attachments = [{
        filename: req.file.originalname,
        content: req.file.buffer
      }];
    }
    mailResults.push(await sendMail(officeMail));

    // Potwierdzenie do klienta
    mailResults.push(await sendMail({
      to: email,
      subject: isEN ? 'Inquiry confirmation - Powitania' : 'Potwierdzenie zapytania - Powitania',
      html: isEN ? `
        <h2 style="color:#1a1d23">Thank you for your inquiry!</h2>
        <p>Hi${name ? ' ' + esc(name) : ''},</p>
        <p>We have received your inquiry. We will respond within 2 hours during business hours (Mon-Fri 8:00 AM - 6:00 PM CET).</p>
        ${lektorName ? `<p style="margin-top:16px">Voice artist: <strong>${esc(lektorName)}</strong></p>` : ''}
        ${generatedText ? `<h3 style="color:#1a1d23;margin-top:16px">Your script:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-family:inherit">${esc(generatedText)}</pre>` : ''}
        ${description ? `<h3 style="color:#1a1d23;margin-top:16px">Your message:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(description)}</p>` : ''}
        <p style="margin-top:32px">Best regards,<br><strong>Powitania Team</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      ` : `
        <h2 style="color:#1a1d23">Dziękujemy za kontakt!</h2>
        <p>Cześć${name ? ' ' + esc(name) : ''},</p>
        <p>Otrzymaliśmy Twoje zapytanie. Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00-18:00).</p>
        ${lektorName ? `<p style="margin-top:16px">Lektor: <strong>${esc(lektorName)}</strong></p>` : ''}
        ${generatedText ? `<h3 style="color:#1a1d23;margin-top:16px">Twój tekst do nagrania:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-family:inherit">${esc(generatedText)}</pre>` : ''}
        ${description ? `<h3 style="color:#1a1d23;margin-top:16px">Twoja wiadomość:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(description)}</p>` : ''}
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      `
    }));

    logWithStatus('inquiry', { name, email, phone, lektorName, serviceType, industry, description, hasAttachment: !!req.file }, mailResults, null);
    res.json({ ok: true, message: isEN ? 'Thank you! We will respond within 2 hours.' : 'Dziękujemy! Odpowiemy w ciągu 2 godzin.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ name, email, phone, serviceType, industry, lektorName, generatedText, notes: description, status: 'Prospect', source: 'powitania.pl (zapytanie)' })
      .catch(err => console.error('[CRM] inquiry webhook error:', err));
  } catch (err) {
    console.error('[contact] Inquiry error:', err);
    logWithStatus('inquiry', { name, email, phone, lektorName, serviceType, industry, description, hasAttachment: !!req.file }, mailResults, err);
    res.status(500).json({ ok: false, error: isEN ? 'An error occurred. Please try again.' : 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapisz tekst" - lead magnet
router.post('/save-text', async (req, res) => {
  const { email, generatedText, serviceType } = req.body;

  if (!email || !generatedText) {
    return res.status(400).json({ ok: false, error: 'Podaj email.' });
  }

  const mailResults = [];
  try {
    // Email do klienta
    mailResults.push(await sendMail({
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
        <p style="color:#999;font-size:12px;margin-top:32px">powitania.pl - Profesjonalne nagrania lektorskie</p>
      `
    }));

    // Notyfikacja do biura
    mailResults.push(await sendMail({
      subject: `[Lead] Zapisany tekst - ${email}`,
      replyTo: email,
      html: `<p>Klient ${esc(email)} zapisał tekst (${esc(serviceType || '-')}).</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(generatedText)}</pre>`
    }));

    logWithStatus('save-text', { email, serviceType }, mailResults, null);
    res.json({ ok: true, message: 'Tekst wysłany na podany adres email.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ email, serviceType, generatedText, status: 'Prospect', source: 'powitania.pl (zapisany tekst)' })
      .catch(err => console.error('[CRM] save-text webhook error:', err));
  } catch (err) {
    console.error('[contact] Save-text error:', err);
    logWithStatus('save-text', { email, serviceType }, mailResults, err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania.' });
  }
});

// "Zapytaj o wycenę" - lektor premium (z załącznikiem)
router.post('/inquiry-premium', upload.single('attachment'), async (req, res) => {
  const { email, description, lektorName, lektorId, lang } = req.body;
  const isEN = lang === 'en';

  if (!email || !description) {
    return res.status(400).json({ ok: false, error: isEN ? 'Please describe your project and provide your email.' : 'Uzupełnij opis projektu i email.' });
  }

  const mailResults = [];
  try {
    const mailOptions = {
      subject: `[Zapytanie premium] ${lektorName || 'Lektor'} - wycena indywidualna`,
      replyTo: email,
      html: `
        <h2>Zapytanie o wycenę - lektor premium</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Lektor:</td><td style="padding:8px">${esc(lektorName || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">ID lektora:</td><td style="padding:8px">${esc(lektorId || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px">${esc(email)}</td></tr>
        </table>
        <h3>Opis projektu:</h3>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(description)}</p>
        ${req.file ? '<p style="color:#666;font-size:13px">📎 Załącznik: ' + esc(req.file.originalname) + ' (' + Math.round(req.file.size / 1024) + ' KB)</p>' : ''}
        <p style="color:#999;font-size:12px">Wysłano z profilu lektora na powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
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
    mailResults.push(await sendMail(mailOptions));

    // Potwierdzenie do klienta
    mailResults.push(await sendMail({
      to: email,
      subject: isEN ? 'Inquiry confirmation - Powitania' : 'Potwierdzenie zapytania - Powitania',
      html: isEN ? `
        <h2 style="color:#1a1d23">Thank you for your inquiry!</h2>
        <p>We have received your quote request${lektorName ? ' for voice artist <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>We will respond as soon as possible.</p>
        <p style="margin-top:32px">Best regards,<br><strong>Powitania Team</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      ` : `
        <h2 style="color:#1a1d23">Dziękujemy za zapytanie!</h2>
        <p>Otrzymaliśmy Twoje zapytanie o wycenę${lektorName ? ' lektora <strong>' + esc(lektorName) + '</strong>' : ''}.</p>
        <p>Odpowiemy najszybciej jak to możliwe.</p>
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl - tel. +48 605 491 069 - biuro@powitania.pl</p>
      `
    }));

    logWithStatus('inquiry-premium', { email, lektorName, lektorId, description, hasAttachment: !!req.file }, mailResults, null);
    res.json({ ok: true, message: isEN ? 'Thank you! We will respond as soon as possible.' : 'Dziękujemy! Odpowiemy najszybciej jak to możliwe.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ name: '', email, lektorName, lektorId, description, status: 'Prospect', source: 'powitania.pl (zapytanie premium)' })
      .catch(err => console.error('[CRM] premium inquiry webhook error:', err));
  } catch (err) {
    console.error('[contact] Premium inquiry error:', err);
    logWithStatus('inquiry-premium', { email, lektorName, lektorId, description, hasAttachment: !!req.file }, mailResults, err);
    res.status(500).json({ ok: false, error: isEN ? 'An error occurred. Please try again.' : 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Zapytaj o wycenę" - ze strony partnera
router.post('/partner-inquiry', async (req, res) => {
  const { name, company, email, phone, message, partnerId, voiceName } = req.body;

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Podaj imię i adres email.' });
  }
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.ok) return res.status(400).json({ ok: false, error: phoneCheck.error });

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

  const mailResults = [];
  try {
    // Mail do biura (lub do partnera)
    mailResults.push(await sendMail({
      to: recipientEmail,
      subject: `[Partner: ${esc(partnerName)}] Zapytanie - ${esc(voiceName || 'wycena')}`,
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
        <p style="color:#999;font-size:12px">Wysłano ze strony partnera na powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
      `
    }));

    // Potwierdzenie do klienta
    mailResults.push(await sendMail({
      to: email,
      subject: 'Potwierdzenie zapytania - ' + esc(partnerName),
      html: `
        <h2 style="color:#1a1d23">Dziękujemy za kontakt!</h2>
        <p>Cześć ${esc(name)},</p>
        <p>Otrzymaliśmy Twoje zapytanie${voiceName ? ' dotyczące lektora <strong>' + esc(voiceName) + '</strong>' : ''}.</p>
        <p>Odpowiemy w ciągu 2 godzin w godzinach pracy (pon-pt 8:00-18:00).</p>
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>${esc(partnerName)}</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">Powered by powitania.pl</p>
      `
    }));

    logWithStatus('partner-inquiry', { name, company, email, phone, voiceName, partnerId, partnerName, message }, mailResults, null);
    res.json({ ok: true, message: 'Dziękujemy! Odpowiemy w ciągu 2 godzin.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ name, firmName: company, email, phone, lektorName: voiceName, description: message, status: 'Prospect', source: 'powitania.pl (partner: ' + partnerName + ')' })
      .catch(err => console.error('[CRM] partner inquiry webhook error:', err));
  } catch (err) {
    console.error('[contact] Partner inquiry error:', err);
    logWithStatus('partner-inquiry', { name, company, email, phone, voiceName, partnerId, partnerName, message }, mailResults, err);
    res.status(500).json({ ok: false, error: 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// Formularz kontaktowy ze strony głównej (homepage) - POST /api/contact
// Payload z front: { name, email, message, source }
router.post('/', async (req, res) => {
  const { name, email, message, source, lang } = req.body;
  const isEN = lang === 'en';

  if (!email) {
    return res.status(400).json({ ok: false, error: isEN ? 'Please provide your email address.' : 'Podaj adres email.' });
  }

  const mailResults = [];
  try {
    mailResults.push(await sendMail({
      subject: `[Kontakt] ${name || 'Wiadomość ze strony'}${source ? ' (' + source + ')' : ''}`,
      replyTo: email,
      html: `
        <h2>Nowa wiadomość z formularza kontaktowego</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Imię:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(name || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(email)}</td></tr>
          ${source ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Źródło:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(source)}</td></tr>` : ''}
        </table>
        ${message ? `<h3>Wiadomość:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(message)}</p>` : ''}
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
      `
    }));

    logWithStatus('contact', { name, email, message, source }, mailResults, null);
    res.json({ ok: true, message: isEN ? 'Thank you! We will respond as soon as possible.' : 'Dziękujemy! Odpowiemy najszybciej jak to możliwe.' });

    // Send to CRM (non-blocking - after response)
    sendOrderToCRM({ name, email, notes: message, status: 'Prospect', source: 'powitania.pl (homepage kontakt)' })
      .catch(err => console.error('[CRM] homepage contact webhook error:', err));
  } catch (err) {
    console.error('[contact] Homepage contact error:', err);
    logWithStatus('contact', { name, email, message, source }, mailResults, err);
    res.status(500).json({ ok: false, error: isEN ? 'An error occurred. Please try again.' : 'Błąd wysyłania. Spróbuj ponownie.' });
  }
});

// "Oddzwonimy w 30 minut" - callback widget (desktop, floating).
// Honeypot: pole 'website' wypelniaja tylko boty -> udajemy sukces, nic nie wysylamy.
// Rate limit: prosty in-memory na IP (5/h) - wystarczajacy dla pojedynczej instancji Railway.
const cbHits = new Map();
router.post('/callback', async (req, res) => {
  const { phone, name, page, website, lang } = req.body;
  const isEN = lang === 'en';

  if (website) return res.json({ ok: true, message: 'OK' }); // honeypot

  const ip = req.headers['x-forwarded-for'] || req.ip || '?';
  const now = Date.now();
  const hits = (cbHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 5) {
    return res.status(429).json({ ok: false, error: isEN ? 'Too many requests. Please call us directly.' : 'Zbyt wiele zgłoszeń. Zadzwoń do nas bezpośrednio.' });
  }
  cbHits.set(ip, [...hits, now]);

  const phoneCheck = validatePhone(phone);
  if (!phone || !phoneCheck.ok) {
    return res.status(400).json({ ok: false, error: isEN ? 'Please provide a valid phone number.' : 'Podaj poprawny numer telefonu.' });
  }

  const mailResults = [];
  try {
    mailResults.push(await sendMail({
      subject: `[ODDZWOŃ w 30 min] ${phone}${name ? ' - ' + name : ''}`,
      html: `
        <h2>Prośba o oddzwonienie (widget callback)</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Telefon:</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:18px"><a href="tel:${esc(phone)}">${esc(phone)}</a></td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Imię:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(name || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Strona:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(page || '-')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Język:</td><td style="padding:8px;border-bottom:1px solid #eee">${isEN ? 'EN' : 'PL'}</td></tr>
        </table>
        <p style="color:#c00;font-weight:bold">Obietnica na stronie: oddzwonimy w ciągu 30 minut.</p>
        <p style="color:#999;font-size:12px">Wysłano z powitania.pl - ${new Date().toLocaleString('pl-PL')}</p>
      `
    }));

    logWithStatus('callback', { phone, name, page }, mailResults, null);
    res.json({ ok: true, message: isEN ? 'Thank you! We will call you back shortly.' : 'Dziękujemy! Wkrótce oddzwonimy.' });

    sendOrderToCRM({ name: name || '', phone, notes: `Prośba o oddzwonienie (30 min). Strona: ${page || '-'}`, status: 'Prospect', source: 'powitania.pl (callback widget)' })
      .catch(err => console.error('[CRM] callback webhook error:', err));
  } catch (err) {
    console.error('[contact] Callback error:', err);
    logWithStatus('callback', { phone, name, page }, mailResults, err);
    res.status(500).json({ ok: false, error: isEN ? 'An error occurred. Please call us directly.' : 'Błąd wysyłania. Zadzwoń do nas bezpośrednio.' });
  }
});

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
