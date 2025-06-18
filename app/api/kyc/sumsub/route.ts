import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;

// Helper to create the signature for Sumsub API
function createSignature(ts: number, method: string, path: string, body: string = '') {
  const signatureString = ts + method.toUpperCase() + path + body;
  return crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(signatureString).digest('hex');
}

export async function POST(req: NextRequest) {
  const { externalUserId } = await req.json();
  const ts = Math.floor(Date.now() / 1000);
  const method = 'POST';
  const path = `/resources/accessTokens?userId=${externalUserId}&levelName=basic-kyc-level`;
  const url = `https://api.sumsub.com${path}`;
  const signature = createSignature(ts, method, path);

  const response = await fetch(url, {
    method,
    headers: {
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': ts.toString(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({ error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
