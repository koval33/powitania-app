/**
 * Optimum CRM Webhook Integration for powitania-app
 *
 * Drop this file into your powitania-app project and configure:
 *   CRM_WEBHOOK_URL  - URL of your Optimum CRM instance
 *   CRM_API_KEY      - API key generated in CRM Settings → Webhooks
 *
 * Usage in server.js:
 *   const { sendOrderToCRM } = require('./crm-webhook');
 *   // After successful email send in /api/contact/order:
 *   sendOrderToCRM(orderData).catch(err => console.error('CRM webhook:', err));
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────────────────────────
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || 'https://your-crm.railway.app';
const CRM_API_KEY = process.env.CRM_API_KEY || '';
const CRM_WEBHOOK_TIMEOUT = parseInt(process.env.CRM_WEBHOOK_TIMEOUT || '10000', 10);
const CRM_WEBHOOK_ENABLED = (process.env.CRM_WEBHOOK_ENABLED || 'true') === 'true';

/**
 * Send order data to Optimum CRM webhook.
 * Non-blocking - returns a promise but should be called with .catch() to avoid
 * disrupting the main order flow if CRM is unavailable.
 *
 * @param {Object} orderData - Order data from the contact form
 * @param {string} orderData.firmName - Company name
 * @param {string} orderData.name - Contact person name
 * @param {string} orderData.email - Contact email
 * @param {string} orderData.phone - Phone number
 * @param {string} orderData.nip - Tax ID (NIP)
 * @param {string} orderData.street - Street address
 * @param {string} orderData.zipCode - Postal code
 * @param {string} orderData.city - City
 * @param {string} orderData.serviceType - Service type (Nagrania, Kominy, etc.)
 * @param {string} orderData.industry - Industry
 * @param {string} orderData.lektorName - Lektor/voice actor name
 * @param {string} orderData.lektorId - Lektor ID from voices.json
 * @param {number|string} orderData.totalPrice - Order total price
 * @param {string} orderData.generatedText - Generated text/script
 * @param {string} orderData.notes - Customer notes
 * @returns {Promise<Object>} CRM response { ok: true, deal_id, account_id, contact_id }
 */
async function sendOrderToCRM(orderData) {
    if (!CRM_WEBHOOK_ENABLED) {
        console.log('[CRM] Webhook disabled, skipping');
        return { ok: false, skipped: true };
    }

    if (!CRM_API_KEY) {
        console.warn('[CRM] No API key configured (CRM_API_KEY env var). Skipping webhook.');
        return { ok: false, error: 'No API key configured' };
    }

    // Generate idempotency key from order data to prevent duplicates on retry
    const idempotencySource = [
        orderData.email || '',
        orderData.firmName || orderData.name || '',
        orderData.totalPrice || '',
        orderData.lektorName || '',
        new Date().toISOString().slice(0, 13), // hour-level granularity
    ].join('|');
    const idempotencyKey = crypto
        .createHash('sha256')
        .update(idempotencySource)
        .digest('hex')
        .slice(0, 16);

    const payload = {
        // Map powitania-app fields to CRM webhook format
        firmName: orderData.firmName || '',
        name: orderData.name || '',
        email: orderData.email || '',
        phone: orderData.phone || '',
        nip: orderData.nip || '',
        street: orderData.street || '',
        zipCode: orderData.zipCode || '',
        city: orderData.city || '',
        notes: orderData.notes || '',
        serviceType: orderData.serviceType || '',
        industry: orderData.industry || '',
        lektorName: orderData.lektorName || '',
        lektorId: orderData.lektorId || '',
        totalPrice: orderData.totalPrice || 0,
        generatedText: orderData.generatedText || '',
        orderDetails: orderData.orderDetails || '',
        description: orderData.description || '',
        // Metadata
        status: orderData.status || '',
        source: orderData.source || 'powitania.pl',
        idempotencyKey: idempotencyKey,
    };

    const url = new URL('/api/webhook/order', CRM_WEBHOOK_URL);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
        const req = transport.request(
            {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'Authorization': `Bearer ${CRM_API_KEY}`,
                    'User-Agent': 'powitania-app/1.0',
                },
                timeout: CRM_WEBHOOK_TIMEOUT,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode === 200 && parsed.ok) {
                            console.log(`[CRM] Order sent → Deal #${parsed.deal_id} "${parsed.deal_name}"`);
                            resolve(parsed);
                        } else {
                            console.error(`[CRM] Webhook error (${res.statusCode}):`, parsed);
                            resolve(parsed); // Don't reject - we don't want to break the order flow
                        }
                    } catch (e) {
                        console.error(`[CRM] Invalid response (${res.statusCode}):`, data);
                        resolve({ ok: false, error: 'Invalid response', statusCode: res.statusCode });
                    }
                });
            }
        );

        req.on('error', (err) => {
            console.error('[CRM] Webhook connection error:', err.message);
            resolve({ ok: false, error: err.message }); // resolve, not reject
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('[CRM] Webhook timeout after', CRM_WEBHOOK_TIMEOUT, 'ms');
            resolve({ ok: false, error: 'timeout' });
        });

        req.write(body);
        req.end();
    });
}

/**
 * Ping the CRM webhook to verify connectivity.
 * @returns {Promise<Object>}
 */
async function pingCRM() {
    if (!CRM_API_KEY) {
        return { ok: false, error: 'No API key configured' };
    }

    const url = new URL('/api/webhook/ping', CRM_WEBHOOK_URL);
    url.searchParams.set('api_key', CRM_API_KEY);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const req = transport.get(url.toString(), { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ ok: false, error: 'Invalid response' });
                }
            });
        });
        req.on('error', (err) => resolve({ ok: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    });
}

module.exports = { sendOrderToCRM, pingCRM };
