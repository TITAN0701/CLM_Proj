/**
 * auth-sheets.js
 * 授權 Google Sheets + Drive 寫入權限
 * 憑證來源優先順序：GOOGLE_CREDENTIALS_JSON 環境變數 → .claude/google-credentials.json
 */

try { require('dotenv').config(); } catch {}

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, '.claude', 'google-credentials.json');
const TOKEN_PATH = path.join(PROJECT_ROOT, '.claude', 'sheets-token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

let credentials;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  console.log('✅ 使用 GOOGLE_CREDENTIALS_JSON 環境變數');
} else if (fs.existsSync(CREDENTIALS_PATH)) {
  credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
} else {
  console.error('❌ 找不到 Google credentials。請設定 GOOGLE_CREDENTIALS_JSON 環境變數，或將憑證存至 .claude/google-credentials.json');
  process.exit(1);
}
const { client_id, client_secret } = credentials.web || credentials.installed;

const REDIRECT_URI = 'http://localhost:3000';
const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n請在瀏覽器開啟以下網址授權：\n');
console.log(authUrl);
console.log('\n等待授權回調（localhost:3000）...\n');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;
  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>✅ 授權成功！可以關閉此視窗。</h2>');
      console.log('✅ Token 已儲存至:', TOKEN_PATH);
      console.log('✅ Scopes:', tokens.scope);
      console.log('\n📋 若需在其他環境（家裡/CI）使用，將以下行加入 .env：');
      console.log('GOOGLE_SHEETS_TOKEN=' + JSON.stringify(JSON.stringify(tokens)));
      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>❌ 授權失敗：' + err.message + '</h2>');
      console.error('❌ 授權失敗:', err.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('等待授權...');
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('本機伺服器已啟動於 http://localhost:3000');
});
