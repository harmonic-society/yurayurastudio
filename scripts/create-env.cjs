#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 環境変数から値を取得
const apiKey = process.env.VITE_GOOGLE_API_KEY || '';
const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '';

// .env.productionファイルの内容を作成
const envContent = `VITE_GOOGLE_API_KEY=${apiKey}
VITE_GOOGLE_CLIENT_ID=${clientId}
`;

// client/.env.productionに書き込み
const envPath = path.join(__dirname, '..', 'client', '.env.production');
fs.writeFileSync(envPath, envContent);

console.log('Created .env.production with environment variables:');
console.log(`  VITE_GOOGLE_API_KEY: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`  VITE_GOOGLE_CLIENT_ID: ${clientId ? clientId.substring(0, 20) + '...' : 'NOT SET'}`);