#!/usr/bin/env node
const { createHmac } = require('crypto');
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const ENV_FILES = [
  '.env',
];

const DEFAULT_PAYLOAD = {
  eventId: 'evt_124',
  orderId: 1,
  status: 'paid',
};

const loadEnv = (rootDir) => {
  const values = {};

  for (const fileName of ENV_FILES) {
    const filePath = resolve(rootDir, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, 'utf8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      values[key] = value;
    }
  }

  return values;
};

const parseArgs = () => {
  const args = { ...DEFAULT_PAYLOAD };

  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const [key, rawValue] = arg.slice(2).split('=');

    if (key === 'eventId') {
      args.eventId = rawValue;
    } else if (key === 'orderId') {
      args.orderId = Number(rawValue);
    } else if (key === 'status') {
      args.status = rawValue;
    }
  }

  return args;
};

const signPayload = (secret, body) =>
  createHmac('sha256', secret).update(body).digest('hex');

const rootDir = resolve(__dirname, '../..');
const env = loadEnv(rootDir);
const secret = env.PAYMENT_WEBHOOK_SECRET;

console.log("bu secret",secret);
const payload = parseArgs();
const body = JSON.stringify(payload);

if (!secret) {
  console.error('Xato: PAYMENT_WEBHOOK_SECRET topilmadi.');
  console.error('`.env.development.local` yoki `.env` faylini tekshiring.');
  process.exit(1);
}

const signature = signPayload(secret, body);

console.log('--- Payment webhook ---');
console.log('Body:');
console.log(body);
console.log('');
console.log('x-signature:');
console.log(signature);
console.log('');
console.log('cURL:');
console.log(
  `curl -X POST http://localhost:3000/api/webhooks/payment \\\n` +
    `  -H "Content-Type: application/json" \\\n` +
    `  -H "x-signature: ${signature}" \\\n` +
    `  -d '${body}'`,
);
