/**
 * Przelewy24 REST API wrapper
 * Dokumentacja: https://developers.przelewy24.pl/
 */
const crypto = require('crypto');

const P24_SANDBOX_URL = 'https://sandbox.przelewy24.pl';
const P24_PRODUCTION_URL = 'https://secure.przelewy24.pl';

function getConfig() {
  const merchantId = parseInt(process.env.P24_MERCHANT_ID, 10);
  const posId = parseInt(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID, 10);
  const crc = process.env.P24_CRC;
  const apiKey = process.env.P24_API_KEY;
  const sandbox = process.env.P24_SANDBOX === 'true';

  if (!merchantId || !crc || !apiKey) {
    throw new Error('[P24] Brak konfiguracji: P24_MERCHANT_ID, P24_CRC, P24_API_KEY');
  }

  return { merchantId, posId, crc, apiKey, sandbox };
}

function getBaseUrl(sandbox) {
  return sandbox ? P24_SANDBOX_URL : P24_PRODUCTION_URL;
}

function sha384(data) {
  return crypto.createHash('sha384').update(data, 'utf8').digest('hex');
}

/**
 * Wywołanie API P24
 */
async function apiCall(method, endpoint, body, config) {
  const baseUrl = getBaseUrl(config.sandbox);
  const url = baseUrl + '/api/v1' + endpoint;
  const auth = Buffer.from(config.posId + ':' + config.apiKey).toString('base64');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + auth
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const err = new Error('[P24] API error: ' + JSON.stringify(data));
    err.status = response.status;
    err.p24Data = data;
    throw err;
  }

  return data;
}

/**
 * Test połączenia z API P24
 */
async function testConnection() {
  const config = getConfig();
  return apiCall('GET', '/testAccess', null, config);
}

/**
 * Rejestracja transakcji
 * @param {Object} params
 * @param {string} params.sessionId - unikalny identyfikator zamówienia
 * @param {number} params.amount - kwota w groszach (brutto)
 * @param {string} params.description - opis transakcji
 * @param {string} params.email - email kupującego
 * @param {string} params.client - imię i nazwisko kupującego
 * @param {string} params.urlReturn - URL powrotu po płatności
 * @param {string} params.urlStatus - URL webhooka notyfikacji
 * @returns {Object} { token } - token do przekierowania na stronę płatności
 */
async function registerTransaction(params) {
  const config = getConfig();

  const sign = sha384(JSON.stringify({
    sessionId: params.sessionId,
    merchantId: config.merchantId,
    amount: params.amount,
    currency: 'PLN',
    crc: config.crc
  }));

  const body = {
    merchantId: config.merchantId,
    posId: config.posId,
    sessionId: params.sessionId,
    amount: params.amount,
    currency: 'PLN',
    description: params.description,
    email: params.email,
    client: params.client || '',
    country: 'PL',
    language: 'pl',
    urlReturn: params.urlReturn,
    urlStatus: params.urlStatus,
    sign
  };

  const data = await apiCall('POST', '/transaction/register', body, config);

  if (!data.data || !data.data.token) {
    throw new Error('[P24] Brak tokenu w odpowiedzi: ' + JSON.stringify(data));
  }

  const baseUrl = getBaseUrl(config.sandbox);
  return {
    token: data.data.token,
    redirectUrl: baseUrl + '/trnRequest/' + data.data.token
  };
}

/**
 * Weryfikacja transakcji (po otrzymaniu webhooka)
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {number} params.orderId - ID transakcji z P24
 * @param {number} params.amount - kwota w groszach
 * @returns {Object} { status }
 */
async function verifyTransaction(params) {
  const config = getConfig();

  const sign = sha384(JSON.stringify({
    sessionId: params.sessionId,
    orderId: params.orderId,
    amount: params.amount,
    currency: 'PLN',
    crc: config.crc
  }));

  const body = {
    merchantId: config.merchantId,
    posId: config.posId,
    sessionId: params.sessionId,
    orderId: params.orderId,
    amount: params.amount,
    currency: 'PLN',
    sign
  };

  return apiCall('PUT', '/transaction/verify', body, config);
}

/**
 * Weryfikacja podpisu webhooka (notyfikacji od P24)
 */
function verifyNotificationSign(notification) {
  const config = getConfig();
  const expected = sha384(JSON.stringify({
    merchantId: config.merchantId,
    posId: config.posId,
    sessionId: notification.sessionId,
    amount: notification.amount,
    originAmount: notification.originAmount,
    currency: notification.currency,
    orderId: notification.orderId,
    methodId: notification.methodId,
    statement: notification.statement,
    crc: config.crc
  }));
  return expected === notification.sign;
}

/**
 * Oblicza kwotę brutto w groszach z kwoty netto PLN
 * @param {number} nettoZloty - kwota netto w PLN (np. 150)
 * @param {number} vatRate - stawka VAT (domyślnie 0.23)
 * @returns {number} kwota brutto w groszach (np. 18450)
 */
function nettToGroszyBrutto(nettoZloty, vatRate = 0.23) {
  return Math.round(nettoZloty * (1 + vatRate) * 100);
}

module.exports = {
  testConnection,
  registerTransaction,
  verifyTransaction,
  verifyNotificationSign,
  nettToGroszyBrutto,
  getConfig
};
