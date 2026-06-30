try { require('dotenv').config(); } catch {}

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const {
  loadCredentials, loadToken, loadPipelineState, loadFailureMap,
  loadFailures, getResultSymbol, buildBugMap, loadBugReports,
  loadScenarios, loadIntegrationTests, loadManualTestReport, TC_DIR, ARTIFACTS_QA,
} = require('../shared/qa-data');

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

// ── 確保分頁存在，回傳 sheetId ──
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

// ── 清除並寫入 ──
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

// ── 1. Test Cases（測試狀態從 pipeline-state 動態取）──
function loadTestCases() {
  const rows = [['Feature', 'TC ID', '標題', '優先度', '類型', '前置條件', '測試步驟', '預期結果', '測試狀態', '手測結果', '最後更新', 'Bug']];
  const state     = loadPipelineState() || {};
  const failMap   = loadFailureMap();
  const bugMap    = buildBugMap();
  const tcResults = state.tc_results || {};

  if (!fs.existsSync(TC_DIR)) return rows;
  for (const feature of fs.readdirSync(TC_DIR)) {
    const tcFile = path.join(TC_DIR, feature, 'test-cases.json');
    if (!fs.existsSync(tcFile)) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(tcFile, 'utf8')); } catch { continue; }
    const tcs = Array.isArray(data) ? data : (data.test_cases || []);
    for (const tc of tcs) {
      const featureName  = tc.feature || data.feature || feature;
      const featureState = state.features?.[featureName] || null;
      const tcId         = tc.id || '';
      const status = getResultSymbol(tcId, tc.title || '', featureState, failMap, tcResults);
      const bugId      = bugMap.byTc[tcId] || '';
      const precond    = Array.isArray(tc.preconditions) ? tc.preconditions.join('\n') : (tc.preconditions || '');
      const steps      = Array.isArray(tc.steps)        ? tc.steps.join('\n')        : (tc.steps || '');
      rows.push([featureName, tcId, tc.title || '',
        tc.priority || '', tc.type || '', precond, steps, tc.expected || '', status,
        tc.manual_result || '', new Date().toISOString().slice(0, 10), bugId]);
    }
  }
  return rows;
}

// ── 2–7. 其餘 loaders（來自 qa-data.js，補 header 行）──
// qa-data.js 的 loader 不含 header，sheet 需要 header 故在此加上
function loadScenariosSheet()      { return [['Feature', 'SC ID', '情境標題', 'Given', 'When', 'Then'],             ...loadScenarios()]; }
function loadBugReportsSheet()     { return [['Bug ID', '標題', '嚴重程度', '狀態', '影響功能', '日期', '原因'],     ...loadBugReports()]; }
function loadFailuresSheet()       { return [['TC Full Title', 'Feature', 'TC ID', '錯誤訊息', '失敗 Selector', 'Bug ID', '狀態'], ...loadFailures()]; }
function loadIntegrationTestsSheet() { return [['類型', 'Feature', 'TC ID', '標題', '優先度', '測試方法', 'E2E 流程說明', '外部系統依賴', '前置條件', '備註', 'Bug'], ...loadIntegrationTests()]; }
function loadManualTestReportSheet() { return [['TC ID', 'Feature', '測試類型', 'Given（前置條件）', 'When（操作步驟）', 'Then（預期結果）', '優先度', '前置環境', '外部依賴', '測試環境', '執行結果', '實際結果', 'Bug ID', '測試人員', '測試日期', '原始 INT ID'], ...loadManualTestReport()]; }

// ── 動態計算 TC 統計（從 tc_results，不依賴 state.totals）──
function calcTcStats(state) {
  const tcResults = state ? (state.tc_results || {}) : {};
  let tcPass = 0, tcFail = 0, tcPending = 0, tcTotal = 0;
  for (const [id, result] of Object.entries(tcResults)) {
    if (!id.startsWith('TC-')) continue;
    tcTotal++;
    if (result === 'pass')    tcPass++;
    else if (result === 'fail')    tcFail++;
    else if (result === 'pending') tcPending++;
  }
  if (tcTotal === 0) {
    const t = state ? (state.totals || {}) : {};
    return { tcPass: t.pass ?? 0, tcFail: t.fail ?? 0, tcPending: t.pending ?? 0, tcTotal: t.specs ?? 0 };
  }
  return { tcPass, tcFail, tcPending, tcTotal };
}

// ── 3. Test Report（TC 動態從 tc_results 計算，不依賴 state.totals）──
function loadTestReport() {
  const header = ['Feature', 'Pass', 'Pending', 'Fail', 'Bug 數', 'Playwright 補驗', 'Pipeline ID', '備註'];
  const rows   = [header];
  const state  = loadPipelineState() || {};
  if (!Object.keys(state).length) return rows;
  const bugMap = buildBugMap();
  let totalBugs = 0;
  for (const [feature, data] of Object.entries(state.features || {})) {
    const featureBugs = (bugMap.byFeature[feature] || []).filter(b => b.status !== 'Closed');
    const bugCount = featureBugs.length;
    totalBugs += bugCount;
    rows.push([feature, data.pass ?? 0, data.pending ?? 0, data.fail ?? 0, bugCount,
      data.playwright_verified ?? 0, state.pipeline_id || '', data.note || '']);
  }
  const tc = calcTcStats(state);
  const totalPw = Object.values(state.features || {}).reduce((sum, d) => sum + (d.playwright_verified ?? 0), 0);
  rows.push(['【合計】', tc.tcPass, tc.tcPending, tc.tcFail, totalBugs, totalPw, '',
    `last_updated: ${state.last_updated || ''}`]);
  return rows;
}

// ── 4. Risk Notes ──
function loadRiskNotes() {
  const rows = [['Feature', '風險等級', '影響範圍', '建議 Owner', '建議 Release']];
  const riskFile = path.join(ARTIFACTS_QA, 'risk-notes.md');
  if (!fs.existsSync(riskFile)) return rows;
  const content = fs.readFileSync(riskFile, 'utf8');
  const cleanStars = s => s ? s.replace(/^\*\*\s*/, '').trim() : '';
  for (const block of content.split(/(?=^## )/m).filter(b => b.startsWith('## ') && !b.startsWith('## 整體'))) {
    const featureMatch  = block.match(/^## (.+)/);
    const levelMatch    = block.match(/\*\*風險等級[：:]([^*\n]+)\*\*/) || block.match(/風險等級[：:]\s*\*\*([^*]+)\*\*/);
    const impactMatch   = block.match(/影響範圍[：:]\s*([^\n]+)/);
    const ownerMatch    = block.match(/建議 Owner[：:]\s*([^\n]+)/);
    const releaseMatch  = block.match(/是否建議 Release[：:]\s*([^\n]+)/);
    rows.push([
      featureMatch  ? featureMatch[1].trim()         : '',
      levelMatch    ? levelMatch[1].trim()           : '',
      impactMatch   ? impactMatch[1].trim()          : '',
      ownerMatch    ? cleanStars(ownerMatch[1])      : '',
      releaseMatch  ? cleanStars(releaseMatch[1])    : '',
    ]);
  }
  return rows;
}

// ── 主流程 ──
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

  const tasks = [
    { name: 'Test Cases',        loader: loadTestCases },
    { name: 'Scenarios',         loader: loadScenariosSheet },
    { name: 'Test Report',       loader: loadTestReport },
    { name: 'Failures',          loader: loadFailuresSheet },
    { name: 'Integration Tests', loader: loadIntegrationTestsSheet },
    { name: '手測報告',           loader: loadManualTestReportSheet },
    { name: 'Risk Notes',        loader: loadRiskNotes },
    { name: 'Bug Reports',       loader: loadBugReportsSheet },
  ];

  for (const task of tasks) {
    await ensureSheet(sheets, task.name);
    const rows = task.loader();
    await writeSheet(sheets, task.name, rows);
    console.log(`✅ ${task.name}：${rows.length - 1} 筆`);
  }

  console.log(`\n🔗 https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
}

main().catch(err => {
  console.error('❌ 同步失敗：', err.message);
  process.exit(1);
});
