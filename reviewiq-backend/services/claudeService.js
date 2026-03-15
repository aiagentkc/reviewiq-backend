// services/claudeService.js
const Anthropic = require('@anthropic-ai/sdk');

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const TONES = {
  professional: 'professional and warm',
  friendly: 'friendly and conversational',
  empathetic: 'deeply empathetic and caring',
};

async function generateReviewResponse({ review, businessName, tone = 'professional' }) {
  const t = TONES[tone] || TONES.professional;
  const isPositive = review.rating >= 4;
  const prompt = isPositive
    ? `Write a ${t} Google review response for ${businessName} to this ${review.rating}-star review from ${review.author}: "${review.text}". Rules: use first name, reference one specific detail, max 2-3 sentences, invite them back, no corporate phrases. ONLY the response text.`
    : `Write a ${t} Google review response for ${businessName} to this ${review.rating}-star review from ${review.author}: "${review.text}". Rules: acknowledge their concern directly, apologize sincerely, offer a next step, max 3-4 sentences, no excuses. ONLY the response text.`;
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].text.trim();
}

async function generateReviewRequestMessage({ customer, businessName, channel = 'sms', reviewLink }) {
  const link = reviewLink || '[REVIEW_LINK]';
  const prompt = channel === 'sms'
    ? `Write a genuine SMS (max 160 chars) asking ${customer.name} for a Google review after their ${customer.service} at ${businessName}. Include: ${link}. Warm, not pushy. ONLY the SMS text.`
    : `Write a genuine email asking ${customer.name} for a Google review after their ${customer.service} at ${businessName}. Include: ${link}. Format:\nSUBJECT: [subject]\n\n[3-4 sentence body]. ONLY the formatted email.`;
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0].text.trim();
  if (channel === 'email') {
    const subjectMatch = text.match(/^SUBJECT:\s*(.+)$/m);
    const body = text.replace(/^SUBJECT:.+\n\n?/m, '').trim();
    return { subject: subjectMatch ? subjectMatch[1].trim() : `Your visit to ${businessName}`, body, full: text };
  }
  return { body: text, full: text };
}

async function generateMonthlyReport({ businessName, stats }) {
  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 600,
    messages: [{ role: 'user', content: `Write a concise 3-paragraph monthly reputation report for ${businessName}. Data: ${JSON.stringify(stats)}. Include what's working, what needs attention, one specific recommendation. Sound like a trusted advisor.` }],
  });
  return msg.content[0].text.trim();
}

module.exports = { generateReviewResponse, generateReviewRequestMessage, generateMonthlyReport };
