try { require('dotenv').config(); } catch {}

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { loadCredentials, loadToken } = require('../shared/qa-data');
const { SHEET_DEFINITIONS } = require('../shared/sheet-definitions');

const PROJECT_ROOT   = path.resolve(__dirname, '../..');
const TOKEN_PATH     = path.join(PROJECT_ROOT, '.claude', 'sheets-token.json');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, '.claude', 'google-credentials.json');
const SPREADSHEET_ID = '1uK9k4O1gL_YiNbXolOITpVnYwzJHB0j-UunLjG0fV0g';

function getAuth() {
  const credentials = loadCredentials(CREDENTIALS_PATH);
  const { client_id, client_secret } = credentials.web || credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');
  oauth2Client.setCredentials(loadToken(TOKEN_PATH));
  return oauth2Client;
}

async function ensureSheet(sheets, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets.find(s => s.properties.title === title);
  if (existing) return existing.properties.sheetId;
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  return res.data.replies[0].addSheet.properties.sheetId;
}

async function writeSheet(sheets, sheetName, rows) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z10000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

async function main() {
  const hasCredentials = process.env.GOOGLE_CREDENTIALS_JSON || fs.existsSync(CREDENTIALS_PATH);
  const hasToken = process.env.GOOGLE_SHEETS_TOKEN || fs.existsSync(TOKEN_PATH);
  if (!hasCredentials) {
    console.log('⏭️  Google Sheets 同步跳過：未設定 GOOGLE_CREDENTIALS_JSON 且找不到 .claude/google-credentials.json');
    return;
  }
  if (!hasToken) {
    console.log('⏭️  Google Sheets 同步跳過：未設定 GOOGLE_SHEETS_TOKEN 且找不到 .claude/sheets-token.json');
    console.log('   請執行：node scripts/auth-sheets.js');
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  for (const def of SHEET_DEFINITIONS) {
    await ensureSheet(sheets, def.name);
    const rows = def.loader();
    // header + data rows
    await writeSheet(sheets, def.name, [def.headers, ...rows]);
    console.log(`✅ ${def.name}：${rows.length} 筆`);
  }

  console.log(`\n🔗 https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
}

main().catch(err => {
  console.error('❌ 同步失敗：', err.message);
  process.exit(1);
});
