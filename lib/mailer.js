const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.log('[mailer] Development mode — emails logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

async function sendMail({ to, subject, html, replyTo }) {
  const t = getTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || 'biuro@powitania.pl',
    to: to || process.env.NOTIFY_EMAIL || 'biuro@powitania.pl',
    subject,
    html,
    replyTo
  };

  if (!t) {
    console.log('[mailer] Would send email:');
    console.log('  To:', mailOptions.to);
    console.log('  Subject:', mailOptions.subject);
    console.log('  Body:', mailOptions.html.substring(0, 200) + '...');
    return { success: true, dev: true };
  }

  const info = await t.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
}

module.exports = { sendMail };
