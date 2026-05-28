const EMAILLABS_API = 'https://api.emaillabs.net.pl/api/new_sendmail';

async function sendMail({ to, subject, html, replyTo, attachments }) {
  const appKey = process.env.EMAILLABS_APP_KEY;
  const appSecret = process.env.EMAILLABS_APP_SECRET;
  const smtpAccount = process.env.EMAILLABS_SMTP_ACCOUNT || '1.optimum1.smtp';
  const fromAddr = process.env.SMTP_FROM || 'biuro@powitania.pl';
  const recipient = to || process.env.NOTIFY_EMAIL || 'biuro@powitania.pl';

  // Dev mode - log to console
  if (!appKey || !appSecret) {
    // GLOSNY alert na produkcji - jesli EmailLabs ENV brak, leady cicho znikaja.
    // Sygnal do Railway logs jesli zapytanie nie dotarlo do skrzynki.
    console.error('[mailer] !!! DEV MODE - mail NOT sent !!! Missing EMAILLABS_APP_KEY/SECRET on env.');
    console.error('  To:', recipient);
    console.error('  Subject:', subject);
    return { success: true, dev: true, devReason: 'missing_emaillabs_credentials' };
  }

  // Plain text fallback (strip HTML tags)
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const params = new URLSearchParams();
  params.append('to[' + recipient + ']', '');
  params.append('smtp_account', smtpAccount);
  params.append('subject', subject);
  params.append('from', fromAddr);
  params.append('from_name', 'Powitania');
  params.append('html', html);
  params.append('text', text);
  if (replyTo) params.append('reply_to', replyTo);

  // Attachments: base64-encoded
  if (attachments && attachments.length > 0) {
    attachments.forEach((att, i) => {
      const content = Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : att.content;
      params.append('files[' + i + '][name]', att.filename || 'attachment');
      params.append('files[' + i + '][mime]', att.contentType || 'application/octet-stream');
      params.append('files[' + i + '][content]', content);
    });
  }

  const auth = Buffer.from(appKey + ':' + appSecret).toString('base64');

  const resp = await fetch(EMAILLABS_API, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + auth
    },
    body: params
  });

  const body = await resp.text();

  if (!resp.ok) {
    console.error('[mailer] ✗ API error:', resp.status, body);
    throw new Error('EmailLabs API error: ' + resp.status + ' ' + body);
  }

  let data;
  try { data = JSON.parse(body); } catch (e) { data = { raw: body }; }

  console.log('[mailer] ✓ Sent via API:', subject, '→', recipient, '| status:', resp.status);
  return { success: true, data };
}

module.exports = { sendMail };
