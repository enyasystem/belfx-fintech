// sumsub-token.js
// Node.js Express endpoint for Sumsub access token generation
// Place this in your Node.js backend (e.g., /api/kyc/sumsub-token.js)

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');
const router = express.Router();

// Replace with your real credentials
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || 'YOUR_APP_TOKEN';
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || 'YOUR_SECRET_KEY';

router.post('/sumsub-token', async (req, res) => {
  const { externalUserId, email, phone, levelName } = req.body;
  if (!externalUserId || !email || !phone || !levelName) {
    return res.status(400).json({ error: 'Missing required fields: externalUserId, email, phone, levelName' });
  }

  const url = 'https://api.sumsub.com/resources/accessTokens/sdk';
  const body = JSON.stringify({
    applicantIdentifiers: { email, phone },
    ttlInSecs: 600,
    userId: externalUserId,
    levelName,
    externalActionId: externalUserId
  });

  const ts = Math.floor(Date.now() / 1000);
  const method = 'POST';
  const path = '/resources/accessTokens/sdk';
  const stringToSign = `${ts}\n${method}\n${path}\n${body}`;
  const signature = crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(stringToSign).digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts,
        'Content-Type': 'application/json',
      },
      body,
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
