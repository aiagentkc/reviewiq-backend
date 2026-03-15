// services/smsService.js
const twilio = require('twilio');

let twilioClient;
function getClient() {
  if (!twilioClient) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

async function sendSMS({ to, body }) {
  const clean = to.replace(/\D/g, '');
  const phone = clean.startsWith('1') ? `+${clean}` : `+1${clean}`;
  try {
    const msg = await getClient().messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    return { success: true, sid: msg.sid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { sendSMS };
