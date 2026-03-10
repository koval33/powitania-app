const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateNIP, validateZipCode, validatePhone } = require('../lib/validate');
const p24 = require('../lib/p24');
const { sendMail } = require('../lib/mailer');
const { sendOrderToCRM } = require('../lib/crm-webhook');

const ORDERS_DIR = path.join(__dirname, '..', 'data', 'orders');

// Upewnij się, że katalog istnieje
if (!fs.existsSync(ORDERS_DIR)) {
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Zamiana polskich znaków diakrytycznych na ASCII
 * P24 nie renderuje poprawnie UTF-8 w emailach z opisem transakcji
 * Używa normalize('NFD') aby rozłożyć znaki na bazę + diakrytyk, potem usuwa diakrytyki
 */
function stripDiacritics(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0141/g, 'L')
    .replace(/\u0142/g, 'l');
}

/**
 * Zapis zamówienia do pliku JSON
 */
function saveOrder(sessionId, data) {
  const filePath = path.join(ORDERS_DIR, sessionId + '.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadOrder(sessionId) {
  const filePath = path.join(ORDERS_DIR, sessionId + '.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function updateOrder(sessionId, partial) {
  const order = loadOrder(sessionId);
  if (!order) return null;
  Object.assign(order, partial);
  saveOrder(sessionId, order);
  return order;
}

/**
 * POST /register — rejestracja transakcji w P24
 *
 * Body: { firmName, name, nip, street, zipCode, city, email, phone, notes,
 *         serviceType, industry, generatedText, lektorName, lektorId,
 *         totalPrice, isExpress, selectedAddons, selectedMelody }
 *
 * totalPrice — kwota netto w PLN (np. "150" lub "150 zł")
 */
router.post('/register', async (req, res) => {
  try {
    const { firmName, name, email, totalPrice } = req.body;

    if (!firmName || !name || !email) {
      return res.status(400).json({ ok: false, error: 'Uzupełnij wymagane pola: nazwa firmy, imię i nazwisko, email.' });
    }

    // Walidacja formatu pól
    const { nip, zipCode, phone } = req.body;
    const nipCheck = validateNIP(nip);
    if (!nipCheck.ok) return res.status(400).json({ ok: false, error: nipCheck.error });
    const zipCheck = validateZipCode(zipCode);
    if (!zipCheck.ok) return res.status(400).json({ ok: false, error: zipCheck.error });
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.ok) return res.status(400).json({ ok: false, error: phoneCheck.error });

    // Walidacja email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Podaj poprawny adres email.' });
    }

    // Wyciągnij kwotę netto z totalPrice (może być "150", "150 zł", "150.00")
    const priceStr = String(totalPrice).replace(/[^0-9.,]/g, '').replace(',', '.');
    const priceNetto = parseFloat(priceStr);

    if (!priceNetto || priceNetto <= 0 || isNaN(priceNetto)) {
      return res.status(400).json({ ok: false, error: 'Nieprawidłowa kwota.' });
    }

    // Kwota brutto w groszach
    const amountGrosze = p24.nettToGroszyBrutto(priceNetto);
    const amountBrutto = (amountGrosze / 100).toFixed(2);

    // Unikalny sessionId
    const sessionId = 'pow_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

    // Bazowy URL (z nagłówka lub env)
    const baseUrl = process.env.APP_URL || ('https://' + req.get('host'));

    // Zapisz zamówienie lokalnie
    const orderData = {
      sessionId,
      ...req.body,
      priceNetto,
      amountGrosze,
      amountBrutto,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    saveOrder(sessionId, orderData);

    // Wyślij do CRM (non-blocking) — generatedText trafia do orderDetails, nie do description
    const crmData = { ...req.body };
    if (crmData.generatedText) {
      crmData.orderDetails = crmData.generatedText;
      delete crmData.generatedText;
    }
    sendOrderToCRM({
      ...crmData,
      totalPrice: priceNetto + ' zł netto',
      status: 'Order',
      source: 'powitania.pl (płatność online)'
    }).catch(err => console.error('[CRM] payment order webhook error:', err));

    // Rejestruj transakcję w P24
    const lektorInfo = req.body.lektorName ? ' - ' + req.body.lektorName : '';
    const result = await p24.registerTransaction({
      sessionId,
      amount: amountGrosze,
      description: stripDiacritics('Nagranie lektorskie' + lektorInfo + ' - powitania.pl'),
      email,
      client: name,
      urlReturn: baseUrl + '/api/payment/return?sid=' + sessionId,
      urlStatus: baseUrl + '/api/payment/notify'
    });

    console.log('[P24] Transaction registered:', sessionId, '→', amountBrutto, 'PLN brutto');

    res.json({
      ok: true,
      redirectUrl: result.redirectUrl,
      sessionId,
      amountBrutto
    });

  } catch (err) {
    console.error('[P24] Register error:', err.message || err);
    if (err.p24Data) console.error('[P24] API response:', JSON.stringify(err.p24Data));
    let userMsg = 'Błąd rejestracji płatności. Spróbuj ponownie.';
    if (err.message && err.message.includes('Brak konfiguracji')) {
      userMsg = 'Płatności online nie są jeszcze skonfigurowane.';
    } else if (err.p24Data && err.p24Data.error === 'Invalid email') {
      userMsg = 'Podaj poprawny adres email.';
    }
    res.status(500).json({ ok: false, error: userMsg });
  }
});

/**
 * POST /notify — webhook od P24 (urlStatus)
 * P24 wysyła tu notyfikację po zakończeniu płatności
 */
router.post('/notify', async (req, res) => {
  try {
    const notification = req.body;
    console.log('[P24] Notification received:', notification.sessionId, 'orderId:', notification.orderId);

    // Weryfikacja podpisu
    if (!p24.verifyNotificationSign(notification)) {
      console.error('[P24] Invalid notification sign for:', notification.sessionId);
      return res.status(400).send('Invalid sign');
    }

    // Załaduj zamówienie
    const order = loadOrder(notification.sessionId);
    if (!order) {
      console.error('[P24] Order not found for sessionId:', notification.sessionId);
      return res.status(404).send('Order not found');
    }

    // Sprawdź kwotę
    if (notification.amount !== order.amountGrosze) {
      console.error('[P24] Amount mismatch:', notification.amount, '!=', order.amountGrosze);
      return res.status(400).send('Amount mismatch');
    }

    // Weryfikacja transakcji w P24
    await p24.verifyTransaction({
      sessionId: notification.sessionId,
      orderId: notification.orderId,
      amount: notification.amount
    });

    // Aktualizuj status zamówienia
    updateOrder(notification.sessionId, {
      status: 'paid',
      orderId: notification.orderId,
      paidAt: new Date().toISOString()
    });

    console.log('[P24] Transaction verified and paid:', notification.sessionId);

    // Wyślij maile potwierdzające
    const address = [order.street, order.zipCode, order.city].filter(Boolean).join(', ');
    const isExpress = order.isExpress;

    // Mail do biura
    await sendMail({
      replyTo: order.email,
      subject: `${isExpress ? '⚡ [EKSPRES] ' : ''}💰 [OPŁACONE] ${order.firmName} — ${order.serviceType || 'nagranie'}${order.lektorName ? ' — ' + order.lektorName : ''}`,
      html: `
        <h2>Nowe zamówienie nagrania — OPŁACONE</h2>
        <div style="background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:bold;color:#065f46">
          ✅ Płatność potwierdzona: ${order.amountBrutto} PLN brutto (${order.priceNetto} zł netto + VAT)
        </div>
        ${isExpress ? '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:bold">⚡ NAGRANIE EKSPRESOWE</div>' : ''}
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Firma:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.firmName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Zamawiający:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.name)}</td></tr>
          ${order.nip ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">NIP:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.nip)}</td></tr>` : ''}
          ${address ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Adres:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(address)}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.email)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Telefon:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.phone || '—')}</td></tr>
          ${order.serviceType ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Typ nagrania:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.serviceType)}</td></tr>` : ''}
          ${order.lektorName ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Lektor:</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(order.lektorName)}${order.lektorId ? ' (' + esc(order.lektorId) + ')' : ''}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Kwota:</td><td style="padding:8px;border-bottom:1px solid #eee;color:#10b981;font-weight:bold">${order.amountBrutto} PLN brutto (${order.priceNetto} zł netto)</td></tr>
          ${order.selectedAddons && order.selectedAddons.length > 0 ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Usługi dodatkowe:</td><td style="padding:8px;border-bottom:1px solid #eee">${order.selectedAddons.map(a => esc(a)).join(', ')}${order.selectedMelody ? ' <strong>(melodia: ' + esc(order.selectedMelody) + ')</strong>' : ''}</td></tr>` : ''}
        </table>
        ${order.notes ? `<h3>Uwagi:</h3><p style="background:#f5f5f5;padding:16px;border-radius:8px">${esc(order.notes)}</p>` : ''}
        ${order.generatedText ? `<h3>Tekst do nagrania:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(order.generatedText)}</pre>` : ''}
        <p style="color:#999;font-size:12px">P24 orderId: ${notification.orderId} | sessionId: ${notification.sessionId}</p>
      `
    });

    // Potwierdzenie do klienta
    const isEN = order.lang === 'en';
    await sendMail({
      to: order.email,
      subject: isEN ? 'Order confirmed — Powitania.pl' : 'Zamówienie przyjęte do realizacji — Powitania.pl',
      html: isEN ? `
        <h2 style="color:#1a1d23">Thank you for your order!</h2>
        <p>Hi ${esc(order.name)},</p>
        <p>Your recording order${order.lektorName ? ' with voice artist <strong>' + esc(order.lektorName) + '</strong>' : ''} has been confirmed and is now in production.</p>
        <p><strong>Amount:</strong> ${order.amountBrutto} PLN gross (${order.priceNetto} PLN net + VAT)</p>
        <p>Our team is already working on your project. We will keep you updated via email.</p>
        ${order.generatedText ? `<h3 style="color:#1a1d23;margin-top:24px">Your script:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(order.generatedText)}</pre>` : ''}
        <p style="margin-top:32px">Best regards,<br><strong>Powitania.pl Team</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl — tel. +48 605 491 069 — biuro@powitania.pl</p>
      ` : `
        <h2 style="color:#1a1d23">Dziękujemy za zamówienie!</h2>
        <p>Cześć ${esc(order.name)},</p>
        <p>Twoje zamówienie nagrania${order.lektorName ? ' u lektora <strong>' + esc(order.lektorName) + '</strong>' : ''} zostało przyjęte do realizacji.</p>
        <p><strong>Kwota:</strong> ${order.amountBrutto} PLN brutto (${order.priceNetto} zł netto + VAT)</p>
        <p>Nasz zespół już pracuje nad Twoim projektem. O postępach poinformujemy Cię mailowo.</p>
        ${order.generatedText ? `<h3 style="color:#1a1d23;margin-top:24px">Twój tekst:</h3><pre style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(order.generatedText)}</pre>` : ''}
        <p style="margin-top:32px">Pozdrawiamy,<br><strong>Zespół Powitania.pl</strong></p>
        <p style="color:#999;font-size:12px;margin-top:16px">powitania.pl — tel. +48 605 491 069 — biuro@powitania.pl</p>
      `
    });

    res.send('OK');

  } catch (err) {
    console.error('[P24] Notify error:', err);
    res.status(500).send('Verification error');
  }
});

/**
 * GET /return — powrót klienta po płatności
 * Przekierowuje na stronę podziękowania
 */
router.get('/return', (req, res) => {
  const sessionId = req.query.sid;
  const order = sessionId ? loadOrder(sessionId) : null;

  if (order && order.status === 'paid') {
    return res.redirect('/zamowienie-oplacone/');
  }

  // Płatność jeszcze nieprzetworzona lub anulowana — pokaż stronę oczekiwania
  res.redirect('/zamowienie-przyjete/?sid=' + (sessionId || ''));
});

module.exports = router;
