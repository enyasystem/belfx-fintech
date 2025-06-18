// Vercel Serverless Function for Sumsub token generation
// Place this file in /api/kyc/sumsub.js in a Vercel project

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { externalUserId } = req.body;
  if (!externalUserId) {
    return res.status(400).json({ error: 'Missing externalUserId' });
  }

  // Replace with your actual Sumsub credentials
  const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
  const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;

  if (!SUMSUB_SECRET_KEY || !SUMSUB_APP_TOKEN) {
    return res.status(500).json({ error: 'Sumsub credentials not set' });
  }

  const crypto = require('crypto');
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(ts + '\n' + req.method + '\n' + '/resources/accessTokens?userId=' + externalUserId + '\n')
    .digest('hex');

  const url = `https://api.sumsub.com/resources/accessTokens?userId=${externalUserId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Sumsub API error' });
    }
    return res.status(200).json({ token: data.token });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
