const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.log('[mailer] Development mode — emails logged to console');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,          // true only for port 465 (SSL)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false     // EmailLabs compatibility
    }
  });

  console.log('[mailer] SMTP transporter ready →', process.env.SMTP_HOST + ':' + port, '(user:', process.env.SMTP_USER + ')');

  return transporter;
}

async function sendMail({ to, subject, html, replyTo, attachments }) {
  const t = getTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || 'biuro@powitania.pl',
    to: to || process.env.NOTIFY_EMAIL || 'biuro@powitania.pl',
    subject,
    html,
    replyTo
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  if (!t) {
    console.log('[mailer] Would send email:');
    console.log('  To:', mailOptions.to);
    console.log('  Subject:', mailOptions.subject);
    console.log('  Body:', mailOptions.html.substring(0, 200) + '...');
    return { success: true, dev: true };
  }

  try {
    const info = await t.sendMail(mailOptions);
    console.log('[mailer] ✓ Sent:', mailOptions.subject, '→', mailOptions.to, '(id:', info.messageId + ')');
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] ✗ SMTP error:', err.code, err.message);
    console.error('[mailer]   Host:', process.env.SMTP_HOST, 'Port:', process.env.SMTP_PORT, 'User:', process.env.SMTP_USER);
    throw err;
  }
}

module.exports = { sendMail };
