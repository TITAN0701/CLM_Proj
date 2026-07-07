/**
 * upload-to-drive.js
 * 產出帶日期的 QA Report .xlsx，上傳至 Google Drive
 * 資料夾：我的雲端硬碟 > RXCLM > AI Suport文件
 * 執行：node scripts/upload-to-drive.js
 *
 * Sheet 順序（對齊 BPM_RX）：
 *   1. 合併檢視   — PM 主要看這頁
 *   2. Test Cases
 *   3. Scenarios
 *   4. Test Report
 *   5. Release Summary
 *   6. Risk Notes
 *   7. Bug Reports
 *   8. 佐證（縮圖）
 *   9. 佐證大圖
 */

try { require('dotenv').config(); } catch {}

const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const {
  loadCredentials, loadToken, loadPipelineState, loadFailureMap,
  loadFailures, getResultSymbol, buildBugMap, loadBugReports,
  loadScenarios, loadIntegrationTests, loadManualTestReport, TC_DIR, ARTIFACTS_QA,
} = require('../shared/qa-data');
const { SHEET_DEFINITIONS } = require('../shared/sheet-definitions');

const PROJECT_ROOT     = path.resolve(__dirname, '../..');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, '.claude', 'google-credentials.json');
const TOKEN_PATH       = path.join(PROJECT_ROOT, '.claude', 'sheets-token.json');
const EVIDENCE_DIR     = path.join(PROJECT_ROOT, 'artifacts', 'raw', 'screenshots', 'evidence');
const OUTPUT_DIR       = path.join(PROJECT_ROOT, 'artifacts', 'generated', 'qa');

const DRIVE_FOLDER_PATH = ['RXCLM', 'AI Support文件'];

function getAuth() {
  const credentials = loadCredentials(CREDENTIALS_PATH);
  const { client_id, client_secret } = credentials.web || credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(loadToken(TOKEN_PATH));
  return oauth2Client;
}

async function findFolderId(drive, folderNames) {
  let parentId = 'root';
  for (const name of folderNames) {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });
    if (!res.data.files || res.data.files.length === 0) {
      throw new Error(`找不到 Drive 資料夾：${name}（父層 ID：${parentId}）`);
    }
    parentId = res.data.files[0].id;
  }
  return parentId;
}

// ── Test Cases / Risk Notes 統一從 sheet-definitions 取（避免雙重維護）──
function getSheetDef(name) { return SHEET_DEFINITIONS.find(d => d.name === name); }


// ── 合併檢視（TC + IT + SC + 執行結果）—— PM 主要看這頁 ──
function loadMergedView(state) {
  const rows = [];
  const failMap   = loadFailureMap();
  const bugMap    = buildBugMap();
  const tcResults = state ? (state.tc_results || {}) : {};

  // ── Part 1：TC（來自 test-cases.json）──
  if (fs.existsSync(TC_DIR)) {
    for (const feature of fs.readdirSync(TC_DIR)) {
      const tcFile = path.join(TC_DIR, feature, 'test-cases.json');
      const scFile = path.join(TC_DIR, feature, 'scenarios.md');
      if (!fs.existsSync(tcFile)) continue;
      let data;
      try { data = JSON.parse(fs.readFileSync(tcFile, 'utf8')); } catch { continue; }
      const tcList = Array.isArray(data) ? data : (data.test_cases || []);

      // 建立 scenario 查詢表
      const scMap = {};
      if (fs.existsSync(scFile)) {
        const content = fs.readFileSync(scFile, 'utf8');
        const featureBlocks = content.split(/^## (F\d+[^\n]*)/m).slice(1);
        for (let fi = 0; fi < featureBlocks.length; fi += 2) {
          const body = featureBlocks[fi + 1] || '';
          for (const sc of body.split(/^### /m).slice(1)) {
            const titleLine = sc.split('\n')[0].trim();
            const scIdMatch = titleLine.match(/^(S\d{2}-\d{2}|SC-\d+)\s+(.*)/);
            const scId = scIdMatch ? scIdMatch[1] : '';
            if (!scId) continue;
            const given = (sc.match(/\*\*Given\*\*[：:]\s*([^\n]+)/) || sc.match(/- \*\*Given\*\*\s+([^\n]+)/) || [])[1] || '';
            const when  = (sc.match(/\*\*When\*\*[：:]\s*([^\n]+)/)  || sc.match(/- \*\*When\*\*\s+([^\n]+)/)  || [])[1] || '';
            const then  = (sc.match(/\*\*Then\*\*[：:]\s*([^\n]+)/)  || sc.match(/- \*\*Then\*\*\s+([^\n]+)/)  || [])[1] || '';
            scMap[scId] = { given: given.trim(), when: when.trim(), then: then.trim() };
          }
        }
      }
      for (const tc of tcList) {
        const scRef = tc.sc_ref || tc.scenario || '';
        const sc = scMap[scRef] || {};
        const featureName = tc.feature || data.feature || feature;
        const featureState = state ? (state.features?.[featureName] || null) : null;
        const result = getResultSymbol(tc.id || '', tc.title || '', featureState, failMap, tcResults);
        const bugId  = bugMap.byTc[tc.id || ''] || '';
        rows.push([
          featureName, scRef, tc.id || '', tc.title || '',
          sc.given || '', sc.when || '', sc.then || '',
          tc.priority || '', tc.type || '', result, bugId,
        ]);
      }
    }
  }

  // ── Part 2：IT（來自 integration-scenarios.md 子情境，執行結果從 tc_results 父 ID 取）──
  const itScFile = path.join(PROJECT_ROOT, 'qa-workspace', 'specs', 'rxclm-core', 'integration-scenarios.md');
  if (fs.existsSync(itScFile)) {
    const itContent = fs.readFileSync(itScFile, 'utf8');
    // 建立 IT 主項目查詢表（feature / priority / testMethod）
    const IT_SECTIONS = require('../shared/integration-tests-data');
    const itMeta = {};
    for (const section of IT_SECTIONS) {
      for (const tc of section.tcs) {
        itMeta[tc.id] = { feature: tc.feature, priority: tc.priority, testMethod: tc.testMethod };
      }
    }
    const itSections = itContent.split(/^## /m).slice(1);
    for (const section of itSections) {
      const sectionTitle = section.split('\n')[0].trim();
      const scenarios = section.split(/^### /m).slice(1);
      for (const sc of scenarios) {
        const titleLine = sc.split('\n')[0].trim();
        const idMatch = titleLine.match(/^(IT-[A-Z0-9-]+-\d{2})\s+(.*)/);
        if (!idMatch) continue;
        const scId    = idMatch[1];  // 子情境 ID：IT-LC-01-01
        const scTitle = idMatch[2];
        // 父 ID：去掉末尾 -NN，對應 tc_results 與 bugMap
        const parentId = scId.replace(/-\d{2}$/, '');
        const meta = itMeta[parentId] || {};
        const given = (sc.match(/\*\*Given\*\*\s+([^\n]+)/) || [])[1] || '';
        const when  = (sc.match(/\*\*When\*\*\s+([^\n]+)/)  || [])[1] || '';
        const then  = (sc.match(/\*\*Then\*\*\s+([^\n]+)/)  || [])[1] || '';
        // 每個子情境各自顯示真實執行結果（父 ID 的結果套用到所有子情境）
        let result = '🔄 測試中';
        if (tcResults[parentId] === 'pass')    result = '✅ 通過';
        else if (tcResults[parentId] === 'fail')    result = '❌ 失敗';
        else if (tcResults[parentId] === 'pending') result = '⏭️ 跳過';
        const bugId = bugMap.byTc[parentId] || '';
        rows.push([
          meta.feature || sectionTitle,
          scId,        // SC ID：子情境 ID（IT-LC-01-01）
          parentId,    // TC ID：父 ID（IT-LC-01），對應執行結果
          scTitle,
          given.trim(),
          when.trim(),
          then.trim(),
          meta.priority || '',
          meta.testMethod || '',
          result,
          bugId,
        ]);
      }
    }
  }

  return rows;
}

// ── 動態計算 TC 統計（從 tc_results，TC-F prefix，不依賴 state.totals）──
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
  // 若 tc_results 內無任何 TC（尚未執行），回退到 state.totals
  if (tcTotal === 0) {
    const t = state ? (state.totals || {}) : {};
    return { tcPass: t.pass ?? 0, tcFail: t.fail ?? 0, tcPending: t.pending ?? 0, tcTotal: t.specs ?? 0 };
  }
  return { tcPass, tcFail, tcPending, tcTotal };
}

// ── 計算 IT 子情境統計（從 integration-scenarios.md + tc_results）──
function calcItStats() {
  const state = loadPipelineState();
  const tcResults = state ? (state.tc_results || {}) : {};
  const scFile = path.join(PROJECT_ROOT, 'qa-workspace', 'specs', 'rxclm-core', 'integration-scenarios.md');
  let itPass = 0, itFail = 0, itTesting = 0, itSkip = 0, itTotal = 0;
  if (fs.existsSync(scFile)) {
    const content = fs.readFileSync(scFile, 'utf8');
    for (const section of content.split(/^## /m).slice(1)) {
      for (const sc of section.split(/^### /m).slice(1)) {
        const idMatch = sc.split('\n')[0].trim().match(/^(IT-[A-Z0-9-]+-\d{2})/);
        if (!idMatch) continue;
        itTotal++;
        const parentId = idMatch[1].replace(/-\d{2}$/, '');
        const r = tcResults[parentId];
        if (r === 'pass')    itPass++;
        else if (r === 'fail')    itFail++;
        else if (r === 'pending') itSkip++;
        else itTesting++;
      }
    }
  }
  return { itPass, itFail, itTesting, itSkip, itTotal };
}

// ── 載入 Test Report（來源：pipeline-state.json + IT 子情境）──
function loadTestReport() {
  const rows = [];
  const state = loadPipelineState();
  if (!state) return rows;
  const bugMap = buildBugMap();
  let totalBugs = 0;
  for (const [feature, data] of Object.entries(state.features || {})) {
    const featureBugs = (bugMap.byFeature[feature] || []).filter(b => b.status !== 'Closed');
    const bugCount = featureBugs.length;
    totalBugs += bugCount;
    rows.push([
      feature,
      data.pass ?? 0,
      data.pending ?? 0,
      data.fail ?? 0,
      bugCount,
      data.playwright_verified ?? 0,
      state.pipeline_id || '',
      data.note || '',
    ]);
  }
  const tc = calcTcStats(state);
  const totalPw = Object.values(state.features || {}).reduce((sum, d) => sum + (d.playwright_verified ?? 0), 0);
  const it = calcItStats();
  // IT 子情境列
  rows.push([
    '【整合測試 IT】',
    it.itPass,
    it.itTesting,
    it.itFail,
    '',
    '',
    '',
    `整合情境共 ${it.itTotal} 筆，🔄 測試中 ${it.itTesting} 筆`,
  ]);
  // 總合計（TC + IT，動態從 tc_results 計算）
  rows.push([
    '【總合計 TC+IT】',
    tc.tcPass + it.itPass,
    tc.tcPending + it.itTesting + it.itSkip,
    tc.tcFail + it.itFail,
    totalBugs,
    totalPw,
    '',
    `last_updated: ${state.last_updated || ''}`,
  ]);
  return rows;
}

// ── 載入 Release Summary ──
function loadReleaseSummary() {
  const rows = [];
  const state = loadPipelineState();
  if (!state) return rows;
  const tc = calcTcStats(state);
  const totalPw = Object.values(state.features || {}).reduce((sum, d) => sum + (d.playwright_verified ?? 0), 0);

  const it = calcItStats();
  // 統計區（TC + IT 合計，動態從 tc_results 計算）
  rows.push(['Pipeline ID',         state.pipeline_id || '', '', '']);
  rows.push(['最後更新',             state.last_updated || '', '', '']);
  rows.push(['Pass（TC+IT）',       tc.tcPass + it.itPass, '', '']);
  rows.push(['Pending（TC）',       tc.tcPending, '', '']);
  rows.push(['🔄 測試中（IT）',      it.itTesting, '', '']);
  rows.push(['Fail（TC+IT）',       tc.tcFail + it.itFail, '', '']);
  rows.push(['Playwright MCP 補驗', totalPw, '', '']);
  rows.push(['Specs 總數（TC）',     tc.tcTotal, '', '']);
  rows.push(['整合情境總數（IT）',   it.itTotal, '', '']);
  rows.push(['', '', '', '']);

  // 分類區標題列
  rows.push(['── Pending 分類 ──', '數量', '原因', 'TC 清單']);

  const pb = state.pending_breakdown || {};
  const PENDING_LABELS = {
    needs_fixture:        '需準備 Fixture',
    needs_pending_data:   '需環境資料',
    write_operations:     '寫入操作待確認',
    dangerous:            '危險操作',
    codegen_skip:         'codegen 待補',
    legitimate_skip:      '合法 skip',
    needs_engineer_input: '待工程師確認',
  };
  for (const [key, val] of Object.entries(pb)) {
    if (!val || typeof val !== 'object') continue;
    const label  = PENDING_LABELS[key] || key;
    const count  = val.count ?? 0;
    const reason = val.reason || '';
    const tcs    = (val.tcs && val.tcs.length) ? val.tcs.join(', ') : '';
    rows.push([label, count, reason, tcs]);
  }
  return rows;
}

// ── 載入整合情境（integration-scenarios.md）──
function loadIntegrationScenarios() {
  const rows = [];
  const scFile = path.join(PROJECT_ROOT, 'qa-workspace', 'specs', 'rxclm-core', 'integration-scenarios.md');
  if (!fs.existsSync(scFile)) return rows;
  const content = fs.readFileSync(scFile, 'utf8');
  const sections = content.split(/^## /m).slice(1);
  for (const section of sections) {
    const sectionTitle = section.split('\n')[0].trim();
    const scenarios = section.split(/^### /m).slice(1);
    for (const sc of scenarios) {
      const lines = sc.split('\n');
      const titleLine = lines[0].trim();
      const idMatch = titleLine.match(/^(IT-[A-Z0-9-]+)\s+(.*)/);
      const scId    = idMatch ? idMatch[1] : '';
      const scTitle = idMatch ? idMatch[2] : titleLine;
      const given = (sc.match(/\*\*Given\*\*\s+([^\n]+)/) || [])[1] || '';
      const when  = (sc.match(/\*\*When\*\*\s+([^\n]+)/)  || [])[1] || '';
      const then  = (sc.match(/\*\*Then\*\*\s+([^\n]+)/)  || [])[1] || '';
      rows.push([sectionTitle, scId, scTitle, given.trim(), when.trim(), then.trim()]);
    }
  }
  return rows;
}



// ── 載入佐證 index ──
function loadEvidenceIndex() {
  const indexFile = path.join(EVIDENCE_DIR, 'evidence-index.json');
  if (!fs.existsSync(indexFile)) return [];
  try { return JSON.parse(fs.readFileSync(indexFile, 'utf8')).evidence || []; } catch { return []; }
}

// ── xlsx helper：統一 header 樣式與欄寬 ──
const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: { bottom: { style: 'thin' } },
};

function addSheet(wb, name, headers, rows) {
  const ws = wb.addWorksheet(name);
  const headerRow = ws.addRow(headers);
  headerRow.eachCell(cell => Object.assign(cell, HEADER_STYLE));
  ws.getRow(1).height = 22;
  for (const row of rows) ws.addRow(row);
  ws.columns.forEach((col, i) => {
    const maxLen = Math.max(
      (headers[i] || '').length,
      ...rows.map(r => String(r[i] || '').length)
    );
    col.width = Math.min(Math.max(maxLen + 2, 10), 80);
  });
  return ws;
}

// ── 佐證 sheets（縮圖 + 大圖）——拆出避免 buildXlsx 超 50 行 ──
function addEvidenceSheets(wb, evidenceList) {
  const ws8 = wb.addWorksheet('佐證');
  const evHeaders = ['佐證截圖', 'TC ID', 'SC Ref', 'Feature', '頁面', '操作說明', '狀態'];
  const evHeaderRow = ws8.addRow(evHeaders);
  evHeaderRow.eachCell(cell => Object.assign(cell, HEADER_STYLE));
  ws8.getRow(1).height = 22;
  [28, 14, 14, 18, 20, 40, 14].forEach((w, i) => { ws8.getColumn(i + 1).width = w; });
  for (let i = 0; i < evidenceList.length; i++) {
    const ev = evidenceList[i];
    const rowNum = i + 2;
    ws8.getRow(rowNum).height = 80;
    const imgPath = path.resolve(EVIDENCE_DIR, ev.screenshot || '');
    if (ev.screenshot && fs.existsSync(imgPath)) {
      const imgId = wb.addImage({ filename: imgPath, extension: 'png' });
      ws8.addImage(imgId, { tl: { col: 0, row: rowNum - 1 }, ext: { width: 200, height: 100 } });
    }
    ws8.getCell(`B${rowNum}`).value = ev.tc_id || '';
    ws8.getCell(`C${rowNum}`).value = ev.sc_ref || '';
    ws8.getCell(`D${rowNum}`).value = ev.feature || '';
    ws8.getCell(`E${rowNum}`).value = ev.page || '';
    ws8.getCell(`F${rowNum}`).value = ev.action || '';
    ws8.getCell(`G${rowNum}`).value = ev.status || '';
  }

  const ws9 = wb.addWorksheet('佐證大圖');
  [14, 110, 45].forEach((w, i) => { ws9.getColumn(i + 1).width = w; });
  for (let i = 0; i < evidenceList.length; i++) {
    const ev = evidenceList[i];
    const rowNum = i * 6 + 1;
    ws9.getRow(rowNum).height = 360;
    ws9.getCell(`A${rowNum}`).value = ev.tc_id || (i + 1);
    ws9.getCell(`C${rowNum}`).value = `${ev.page || ''}\n${ev.action || ''}`;
    const imgPath = path.resolve(EVIDENCE_DIR, ev.screenshot || '');
    if (ev.screenshot && fs.existsSync(imgPath)) {
      const imgId = wb.addImage({ filename: imgPath, extension: 'png' });
      ws9.addImage(imgId, { tl: { col: 1, row: rowNum - 1 }, ext: { width: 800, height: 370 } });
    }
  }
}

// ── 建立 xlsx ──
async function buildXlsx(outputPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'QAAI';
  wb.created = new Date();

  const state = loadPipelineState();
  const add = (name, headers, rows) => addSheet(wb, name, headers, rows);

  add('合併檢視',
    ['Feature', 'SC ID', 'TC ID', '情境標題', 'Given', 'When', 'Then', '優先度', '類型', '執行結果', 'Bug'],
    loadMergedView(state));
  const tcDef = getSheetDef('Test Cases');
  add('Test Cases', tcDef.headers, tcDef.loader());
  add('Scenarios',     ['Feature', 'SC ID', '情境標題', 'Given', 'When', 'Then'], loadScenarios());
  add('整合情境',      ['分類', 'IT SC ID', '情境標題', 'Given', 'When', 'Then'], loadIntegrationScenarios());
  add('Test Report',   ['Feature', 'Pass', 'Pending', 'Fail', 'Bug 數', 'Playwright 補驗', 'Pipeline ID', '備註'], loadTestReport());
  add('Release Summary', ['項目 / 分類', '值 / 數量', '原因', 'TC 清單'], loadReleaseSummary());
  const rnDef = getSheetDef('Risk Notes');
  add('Risk Notes', rnDef.headers, rnDef.loader());
  add('Bug Reports',   ['Bug ID', '標題', '嚴重程度', '狀態', '影響功能', '日期', '原因'], loadBugReports());
  const flDef = getSheetDef('Failures');
  add('Failures', flDef.headers, flDef.loader());
  add('Integration Tests',
    ['類型', 'Feature', 'TC ID', '標題', '優先度', '測試方法', 'E2E 流程說明', '外部系統依賴', '前置條件', '備註', 'Bug'],
    loadIntegrationTests());
  const mrDef = getSheetDef('手測報告');
  add('手測報告', mrDef.headers, mrDef.loader());
  const blDef = getSheetDef('上線阻斷 Go-No-Go');
  add('上線阻斷 Go-No-Go', blDef.headers, blDef.loader());

  // Sheet 10 & 11：佐證（縮圖 + 大圖）
  addEvidenceSheets(wb, loadEvidenceIndex());

  await wb.xlsx.writeFile(outputPath);
}

// ── 上傳至 Drive ──
async function uploadToDrive(drive, folderId, filePath, fileName) {
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(filePath),
    },
    fields: 'id, name, webViewLink',
  });
  return res.data;
}

// ── 主流程 ──
async function main() {
  const hasCredentials = process.env.GOOGLE_CREDENTIALS_JSON || fs.existsSync(CREDENTIALS_PATH);
  const hasToken = process.env.GOOGLE_SHEETS_TOKEN || fs.existsSync(TOKEN_PATH);
  if (!hasCredentials) {
    console.log('⏭️  Google Drive 上傳跳過：未設定 GOOGLE_CREDENTIALS_JSON 且找不到 .claude/google-credentials.json');
    return;
  }
  if (!hasToken) {
    console.log('⏭️  Google Drive 上傳跳過：未設定 GOOGLE_SHEETS_TOKEN 且找不到 .claude/sheets-token.json');
    console.log('   請執行：node scripts/auth-sheets.js');
    return;
  }
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${dateStr}-qa-report.xlsx`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  console.log('📊 產出 xlsx（9 個 Sheet）...');
  await buildXlsx(outputPath);
  console.log(`✅ 已產出：${outputPath}`);

  console.log('☁️  連線 Google Drive...');
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const folderId = await findFolderId(drive, DRIVE_FOLDER_PATH);
  console.log(`✅ 找到資料夾：${DRIVE_FOLDER_PATH.join(' > ')} (${folderId})`);

  console.log(`📤 上傳 ${fileName}...`);
  const file = await uploadToDrive(drive, folderId, outputPath, fileName);
  console.log(`✅ 上傳完成：${file.name}`);
  console.log(`🔗 ${file.webViewLink}`);
}

main().catch(err => {
  if (err.message && err.message.includes('drive.file')) {
    console.error('❌ 權限不足：需要 drive.file scope，請重新執行授權：');
    console.error('   node scripts/auth-sheets.js');
  } else {
    console.error('❌ 失敗：', err.message);
  }
  process.exit(1);
});
