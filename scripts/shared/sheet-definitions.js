/**
 * sheet-definitions.js
 * 所有 Google Sheets / xlsx 分頁的唯一定義來源。
 * sync-to-sheet.js 和 upload-to-drive.js 都 require 這份，不各自維護 loader。
 *
 * 每個 entry：{ name, headers, loader }
 *   name    — 分頁名稱（Sheets 分頁標題 / xlsx sheet 名稱）
 *   headers — 欄位陣列（header row），資料 row 欄數必須與此一致
 *   loader  — function() => rows（不含 header）
 */

const fs   = require('fs');
const path = require('path');
const {
  loadPipelineState, loadFailureMap, getResultSymbol,
  buildBugMap, loadBugReports, loadScenarios,
  loadIntegrationTests, loadManualTestReport, loadBlockingList,
  loadFailures, TC_DIR, ARTIFACTS_QA,
} = require('./qa-data');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ── 1. Test Cases（統一 13 欄，以 upload-to-drive 版為準）──
const TC_HEADERS = [
  'Feature', 'TC ID', 'SC Ref', '標題', '優先度', '類型',
  '前置條件', '測試步驟', '預期結果', '執行結果', '手測結果', '備註', 'Bug',
];

function loadTestCasesRows() {
  const rows = [];
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
    const tcList = Array.isArray(data) ? data : (data.test_cases || []);
    for (const tc of tcList) {
      const featureName  = tc.feature || data.feature || feature;
      const featureState = state.features?.[featureName] || null;
      const result   = getResultSymbol(tc.id || '', tc.title || '', featureState, failMap, tcResults);
      const bugId    = bugMap.byTc[tc.id || ''] || '';
      const precond  = Array.isArray(tc.preconditions) ? tc.preconditions.join('\n') : (tc.preconditions || '');
      const steps    = Array.isArray(tc.steps)         ? tc.steps.join('\n')         : (tc.steps || '');
      const note     = tc.automation_candidate === false ? (tc.notes || '無法自動化') : (tc.notes || '');
      rows.push([
        featureName,
        tc.id || '',
        tc.sc_ref || tc.scenario || '',  // SC Ref（統一加入）
        tc.title || '',
        tc.priority || '',
        tc.type || '',
        precond,
        steps,
        tc.expected || '',
        result,
        tc.manual_result || '',
        note,
        bugId,
      ]);
    }
  }
  return rows;
}

// ── 2. Scenarios ──
const SCENARIOS_HEADERS = ['Feature', 'SC ID', '情境標題', 'Given', 'When', 'Then'];

// ── 3. Test Report ──
const TEST_REPORT_HEADERS = [
  'Feature', 'Pass', 'Pending', 'Fail', 'Bug 數', 'Playwright 補驗', 'Pipeline ID', '備註',
];

function loadTestReportRows() {
  const rows  = [];
  const state = loadPipelineState() || {};
  if (!Object.keys(state).length) return rows;
  const bugMap = buildBugMap();
  let totalBugs = 0;
  for (const [feature, data] of Object.entries(state.features || {})) {
    const featureBugs = (bugMap.byFeature[feature] || []).filter(b => b.status !== 'Closed');
    const bugCount = featureBugs.length;
    totalBugs += bugCount;
    rows.push([feature, data.pass ?? 0, data.pending ?? 0, data.fail ?? 0,
      bugCount, data.playwright_verified ?? 0, state.pipeline_id || '', data.note || '']);
  }
  // 動態統計 TC（從 tc_results，不依賴 state.totals）
  const tcResults = state.tc_results || {};
  let tcPass = 0, tcFail = 0, tcPending = 0, tcTotal = 0;
  for (const [id, r] of Object.entries(tcResults)) {
    if (!id.startsWith('TC-')) continue;
    tcTotal++;
    if (r === 'pass')    tcPass++;
    else if (r === 'fail')    tcFail++;
    else if (r === 'pending') tcPending++;
  }
  if (tcTotal === 0) {
    const t = state.totals || {};
    tcPass = t.pass ?? 0; tcFail = t.fail ?? 0; tcPending = t.pending ?? 0; tcTotal = t.specs ?? 0;
  }
  const totalPw = Object.values(state.features || {}).reduce((s, d) => s + (d.playwright_verified ?? 0), 0);
  rows.push(['【合計】', tcPass, tcPending, tcFail, totalBugs, totalPw, '',
    `last_updated: ${state.last_updated || ''}`]);
  return rows;
}

// ── 4. Failures（移除永遠空白的「失敗 Selector」欄）──
const FAILURES_HEADERS = ['TC Full Title', 'Feature', 'TC ID', '錯誤訊息', 'Bug ID', '狀態'];

function loadFailuresRows() {
  // loadFailures() 原本有 7 欄（含空白 Selector），這裡重新對齊成 6 欄
  const raw = loadFailures(); // [fullTitle, feature, tcId, errorMsg, '' , bugId, status]
  return raw.map(r => [r[0], r[1], r[2], r[3], r[5], r[6]]);
}

// ── 5. Integration Tests ──
const INTEGRATION_TESTS_HEADERS = [
  '類型', 'Feature', 'TC ID', '標題', '優先度', '測試方法',
  'E2E 流程說明', '外部系統依賴', '前置條件', '備註', 'Bug',
];

// ── 6. 手測報告（tester/date 從 blocking-list 正確分離）──
const MANUAL_REPORT_HEADERS = [
  'TC ID', 'Feature', '測試類型', 'Given（前置條件）', 'When（操作步驟）',
  'Then（預期結果）', '優先度', '前置環境', '外部依賴', '測試環境',
  '執行結果', '實際結果', 'Bug ID', '測試人員', '測試日期', '原始 INT ID',
];
// loadManualTestReport() 已有正確 16 欄，直接用

// ── 7. 上線阻斷 Go-No-Go（tester 欄只放人名，date 欄放日期）──
const BLOCKING_HEADERS = [
  '排程日', 'INT ID', '群組', '標題', '優先度', '預估(分)', '環境',
  '執行結果', '實際結果', '缺陷編號', '測試者', '測試日期', 'Given', 'When', 'Then', '備註',
];

function loadBlockingListRows() {
  const blockPath = path.join(__dirname, 'blocking-list.json');
  const intAllPath = path.join(__dirname, 'int-all.json');
  if (!fs.existsSync(blockPath)) return [];

  const blocking = JSON.parse(fs.readFileSync(blockPath, 'utf8'));
  const intAll   = JSON.parse(fs.readFileSync(intAllPath, 'utf8').replace(/^﻿/, ''));
  const intMap   = {};
  for (const row of intAll) intMap[row.id] = row;

  const toResult = r => {
    if (r === 'Pass')    return '✅ Pass';
    if (r === 'Fail')    return '❌ Fail';
    if (r === 'Blocked') return '🚫 Blocked';
    return '🔄 待測試';
  };

  // tester 欄：若存的是日期格式（YYYY-MM-DD）則移到 date 欄，tester 欄留空
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim());

  return blocking.map(b => {
    const raw    = intMap[b.id] || {};
    const tester = isDate(b.tester) ? '' : (b.tester || '');
    const date   = isDate(b.tester) ? b.tester : '';
    return [
      b.day,
      b.id,
      b.group,
      b.title,
      b.priority,
      b.estMin,
      b.env,
      toResult(b.result),
      (b.actual || '').replace(/\n/g, ' ').trim(),
      b.bugId || '',
      tester,                                           // 測試者（人名）
      date,                                             // 測試日期（YYYY-MM-DD）
      (raw.given || '').replace(/\n/g, ' ').trim(),
      (raw.when  || '').replace(/\n/g, ' ').trim(),
      (raw.then  || '').replace(/\n/g, ' ').trim(),
      b.note || '',
    ];
  });
}

// ── 8. Risk Notes ──
const RISK_NOTES_HEADERS = ['Feature', '風險等級', '影響範圍', '建議 Owner', '建議 Release'];

function loadRiskNotesRows() {
  const rows = [];
  const riskFile = path.join(ARTIFACTS_QA, 'risk-notes.md');
  if (!fs.existsSync(riskFile)) return rows;
  const content = fs.readFileSync(riskFile, 'utf8');
  const cleanStars = s => s ? s.replace(/^\*\*\s*/, '').trim() : '';
  for (const block of content.split(/(?=^## )/m).filter(b => b.startsWith('## ') && !b.startsWith('## 整體'))) {
    const featureMatch = block.match(/^## (.+)/);
    const levelMatch   = block.match(/\*\*風險等級[：:]([^*\n]+)\*\*/) || block.match(/風險等級[：:]\s*\*\*([^*]+)\*\*/);
    const impactMatch  = block.match(/影響範圍[：:]\s*([^\n]+)/);
    const ownerMatch   = block.match(/建議 Owner[：:]\s*([^\n]+)/);
    const releaseMatch = block.match(/是否建議 Release[：:]\s*([^\n]+)/);
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

// ── 9. Bug Reports ──
const BUG_REPORTS_HEADERS = ['Bug ID', '標題', '嚴重程度', '狀態', '影響功能', '日期', '原因'];

// ── 匯出定義表（name / headers / loader）──
// loader() 回傳不含 header 的資料 rows
const SHEET_DEFINITIONS = [
  { name: 'Test Cases',          headers: TC_HEADERS,               loader: loadTestCasesRows },
  { name: 'Scenarios',           headers: SCENARIOS_HEADERS,        loader: () => loadScenarios() },
  { name: 'Test Report',         headers: TEST_REPORT_HEADERS,      loader: loadTestReportRows },
  { name: 'Failures',            headers: FAILURES_HEADERS,         loader: loadFailuresRows },
  { name: 'Integration Tests',   headers: INTEGRATION_TESTS_HEADERS,loader: () => loadIntegrationTests() },
  { name: '手測報告',             headers: MANUAL_REPORT_HEADERS,    loader: () => loadManualTestReport() },
  { name: '上線阻斷 Go-No-Go',   headers: BLOCKING_HEADERS,         loader: loadBlockingListRows },
  { name: 'Risk Notes',          headers: RISK_NOTES_HEADERS,       loader: loadRiskNotesRows },
  { name: 'Bug Reports',         headers: BUG_REPORTS_HEADERS,      loader: () => loadBugReports() },
];

// ── 對齊驗證工具（供 check-alignment 使用）──
function validateAlignment() {
  const issues = [];
  for (const def of SHEET_DEFINITIONS) {
    let rows;
    try { rows = def.loader(); } catch (e) {
      issues.push({ sheet: def.name, type: 'loader_error', detail: e.message });
      continue;
    }
    const expectedCols = def.headers.length;
    for (let i = 0; i < rows.length; i++) {
      const actualCols = (rows[i] || []).length;
      if (actualCols !== expectedCols) {
        issues.push({
          sheet: def.name,
          type: 'col_mismatch',
          row: i + 2,  // +2 = header row(1) + 0-index offset
          expected: expectedCols,
          actual: actualCols,
          sample: JSON.stringify((rows[i] || []).slice(0, 3)),
        });
        if (issues.filter(x => x.sheet === def.name).length >= 3) break; // 每頁最多顯示 3 筆
      }
    }
  }
  return issues;
}

module.exports = {
  SHEET_DEFINITIONS,
  validateAlignment,
  // 個別 headers 供需要時直接引用
  TC_HEADERS,
  SCENARIOS_HEADERS,
  TEST_REPORT_HEADERS,
  FAILURES_HEADERS,
  INTEGRATION_TESTS_HEADERS,
  MANUAL_REPORT_HEADERS,
  BLOCKING_HEADERS,
  RISK_NOTES_HEADERS,
  BUG_REPORTS_HEADERS,
};
