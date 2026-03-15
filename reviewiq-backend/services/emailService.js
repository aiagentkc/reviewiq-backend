// services/emailService.js
const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, body, fromName }) {
  try {
    const info = await getTransporter().sendMail({
      from: `"${fromName || 'ReviewIQ'}" <${process.env.EMAIL_FROM}>`,
      to, subject, text: body,
    });
    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { sendEmail };
