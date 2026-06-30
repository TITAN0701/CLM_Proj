/**
 * qa-data.js
 * QA 資料 loader 共用函數（單一來源）
 * 由 sync-to-sheet.js / upload-to-drive.js 共同 require()
 */

const fs   = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TC_DIR       = path.join(PROJECT_ROOT, 'qa-workspace', 'specs');
const ARTIFACTS_QA = path.join(PROJECT_ROOT, 'artifacts', 'generated', 'qa');
const IT_SECTIONS  = require('./integration-tests-data');

// ── 認證 ──
function loadCredentials(credentialsPath) {
  if (process.env.GOOGLE_CREDENTIALS_JSON) return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  if (fs.existsSync(credentialsPath)) return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  throw new Error('缺少 credentials。請設定 GOOGLE_CREDENTIALS_JSON 或將憑證存至 .claude/google-credentials.json');
}

function loadToken(tokenPath) {
  if (process.env.GOOGLE_SHEETS_TOKEN) return JSON.parse(process.env.GOOGLE_SHEETS_TOKEN);
  if (fs.existsSync(tokenPath)) return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  throw new Error('缺少 token。請執行 node scripts/auth-sheets.js 完成授權，或設定 GOOGLE_SHEETS_TOKEN 環境變數');
}

// ── Pipeline State ──
function loadPipelineState() {
  const stateFile = path.join(PROJECT_ROOT, 'qa-workspace', '.pipeline-state.json');
  if (!fs.existsSync(stateFile)) return null;
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8').replace(/^﻿/, '')); } catch { return null; }
}

// ── Failure Report → Map<tcTitle, errorMsg> ──
function loadFailureMap() {
  const map = new Map();
  const reportFile = path.join(PROJECT_ROOT, 'artifacts', 'raw', 'failure-report.md');
  if (!fs.existsSync(reportFile)) return map;
  const content = fs.readFileSync(reportFile, 'utf8');
  for (const block of content.split(/(?=^## ❌ )/m).filter(b => b.startsWith('## ❌ '))) {
    const titleMatch = block.match(/^## ❌ (.+)/);
    const msgMatch   = block.match(/```\n([\s\S]*?)\n```/);
    if (titleMatch) map.set(titleMatch[1].trim(), msgMatch ? msgMatch[1].trim().slice(0, 120) : '');
  }
  return map;
}

// ── Failures（已知功能問題彙整，不依賴單次 failure-report.md）──
// 來源1：tc_results = fail（Cypress 確認失敗）
// 來源2：Bug Reports Open 狀態（含 IT-prefix TC，未被 tc_results 收錄的已知問題）
function loadFailures() {
  const rows = [];

  // 建立 tcId -> {feature, title} 查詢表
  const tcMap = {};
  if (fs.existsSync(TC_DIR)) {
    for (const feature of fs.readdirSync(TC_DIR)) {
      const tcFile = path.join(TC_DIR, feature, 'test-cases.json');
      if (!fs.existsSync(tcFile)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(tcFile, 'utf8'));
        const tcs = Array.isArray(data) ? data : (data.test_cases || []);
        for (const tc of tcs) {
          if (tc.id) tcMap[tc.id] = { feature: tc.feature || data.feature || feature, title: tc.title || '' };
        }
      } catch {}
    }
  }

  // 建立 tcId -> {bugId, status, errorMsg} 查詢表（從 Bug Reports）
  const bugByTc = {};
  const bugsDir = path.join(ARTIFACTS_QA, 'bugs');
  if (fs.existsSync(bugsDir)) {
    for (const file of fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(bugsDir, file), 'utf8');
      const tcMatch      = content.match(/\*\*?TC\*\*?[：:]\s*((?:TC|IT)-[A-Z0-9-]+)/);
      const idMatch      = content.match(/\*\*?ID\*\*?[：:]\s*(BUG-[^\n\s]+)/);
      const statusMatch  = content.match(/\*\*?狀態\*\*?[：:]\s*([^\n]+)/);
      const msgMatch     = content.match(/```\n([\s\S]*?)\n```/);
      const featureMatch = content.match(/受影響功能[：:]\s*([^\n]+)/);
      const titleMatch   = content.match(/> 測試案例：[^\n]+?(?:TC|IT)-[A-Z0-9-]+: ([^\n]+)/);
      if (tcMatch) {
        bugByTc[tcMatch[1].trim()] = {
          bugId:    idMatch      ? idMatch[1].trim()                : '',
          status:   statusMatch  ? statusMatch[1].trim()            : '',
          errorMsg: msgMatch     ? msgMatch[1].trim().slice(0, 200) : '',
          feature:  featureMatch ? featureMatch[1].trim()           : '',
          title:    titleMatch   ? titleMatch[1].trim()             : '',
        };
      }
    }
  }

  // 建立 IT 子情境查詢表（從 integration-scenarios.md）
  // key: 父 ID（IT-DP-NEG-02），value: [{scId, scTitle, feature}...]
  const itScMap = {};
  const itScFile = path.join(__dirname, '../../qa-workspace/specs/rxclm-core/integration-scenarios.md');
  if (fs.existsSync(itScFile)) {
    const itContent = fs.readFileSync(itScFile, 'utf8');
    // 建立父 ID -> feature 對照（從 integration-tests-data.js）
    const IT_SECTIONS = require('./integration-tests-data');
    const itFeatureMap = {};
    for (const section of IT_SECTIONS) {
      for (const tc of section.tcs) itFeatureMap[tc.id] = tc.feature;
    }
    const itSections = itContent.split(/^## /m).slice(1);
    for (const section of itSections) {
      const sectionTitle = section.split('\n')[0].trim();
      for (const sc of section.split(/^### /m).slice(1)) {
        const titleLine = sc.split('\n')[0].trim();
        const idMatch = titleLine.match(/^(IT-[A-Z0-9-]+-\d{2})\s+(.*)/);
        if (!idMatch) continue;
        const scId    = idMatch[1];
        const scTitle = idMatch[2];
        const parentId = scId.replace(/-\d{2}$/, '');
        if (!itScMap[parentId]) itScMap[parentId] = [];
        itScMap[parentId].push({ scId, scTitle, feature: itFeatureMap[parentId] || sectionTitle });
      }
    }
  }

  // 收集已知 fail TC ID（去重）
  const seen = new Set();

  // 來源1：tc_results = fail
  const state = loadPipelineState();
  for (const [tcId, result] of Object.entries(state ? (state.tc_results || {}) : {})) {
    if (result !== 'fail') continue;
    seen.add(tcId);
    const tc  = tcMap[tcId] || {};
    const bug = bugByTc[tcId] || {};

    if (itScMap[tcId]) {
      // IT 父 ID fail → 展開成所有子情境，每筆獨立列出
      for (const sc of itScMap[tcId]) {
        rows.push([
          `${sc.feature} ${sc.scId}: ${sc.scTitle}`.trim(),
          sc.feature,
          sc.scId,
          bug.errorMsg || '',
          '',
          bug.bugId || '',
          bug.status || '',
        ]);
      }
    } else {
      // 一般 TC-F 失敗
      const feature = tc.feature || bug.feature || '';
      const title   = tc.title   || bug.title   || '';
      rows.push([
        `${feature} ${tcId}: ${title}`.trim(),
        feature,
        tcId,
        bug.errorMsg || '',
        '',
        bug.bugId || '',
        bug.status || '',
      ]);
    }
  }

  // 來源2：Bug Reports Open 且 TC ID 未被 tc_results 收錄
  for (const [tcId, bug] of Object.entries(bugByTc)) {
    if (seen.has(tcId)) continue;
    if (bug.status && bug.status.startsWith('Closed')) continue;
    seen.add(tcId);
    const tc = tcMap[tcId] || {};

    if (itScMap[tcId]) {
      for (const sc of itScMap[tcId]) {
        rows.push([
          `${sc.feature} ${sc.scId}: ${sc.scTitle}`.trim(),
          sc.feature,
          sc.scId,
          bug.errorMsg || '',
          '',
          bug.bugId || '',
          bug.status || '',
        ]);
      }
    } else {
      const feature = tc.feature || bug.feature || '';
      const title   = tc.title   || bug.title   || '';
      rows.push([
        `${feature} ${tcId}: ${title}`.trim(),
        feature,
        tcId,
        bug.errorMsg || '',
        '',
        bug.bugId || '',
        bug.status || '',
      ]);
    }
  }

  return rows;
}

// ── TC 執行結果符號 ──
function getResultSymbol(tcId, tcTitle, featureState, failMap, tcResults) {
  if (tcResults && tcId && tcResults[tcId]) {
    const r = tcResults[tcId];
    if (r === 'pass')    return '✅ 通過';
    if (r === 'pending') return '⏭️ 跳過';
    if (r === 'fail')    return '❌ 失敗';
  }
  if (!featureState) return '— 未執行';
  const failKey = failMap ? [...failMap.keys()].find(k => k.includes(tcId)) : null;
  if (failKey) return '❌ 失敗';
  if (featureState.tests_run !== 'done') return '— 未執行';
  const isSkip = (tcTitle || '').includes('[SDET TODO]');
  if (isSkip) return '⏭️ 跳過';
  if (featureState.pass > 0 && featureState.fail === 0) return '✅ 通過';
  if (featureState.fail > 0 && featureState.pass === 0) return '❌ 失敗';
  return '⏭️ 跳過';
}

// ── Bug Map ──
function buildBugMap() {
  const byTc = {};
  const byFeature = {};
  const bugsDir = path.join(ARTIFACTS_QA, 'bugs');
  if (!fs.existsSync(bugsDir)) return { byTc, byFeature };
  for (const file of fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'))) {
    const content      = fs.readFileSync(path.join(bugsDir, file), 'utf8');
    const idMatch      = content.match(/\*\*?ID\*\*?[：:]\s*(BUG-[^\n\s]+)/);
    const tcMatch      = content.match(/\*\*?TC\*\*?[：:]\s*((?:TC|IT)-[A-Z0-9-]+)/);
    const featureMatch = content.match(/受影響功能[：:]\s*([^\n]+)/);
    const statusMatch  = content.match(/\*\*?狀態\*\*?[：:]\s*([^\n]+)/);
    const bugId   = idMatch      ? idMatch[1].trim()      : path.basename(file, '.md');
    const tcId    = tcMatch      ? tcMatch[1].trim()      : '';
    const feature = featureMatch ? featureMatch[1].trim() : '';
    const status  = statusMatch  ? statusMatch[1].trim()  : '';
    // Closed Bug 不出現在 TC/合併檢視的 Bug 欄（避免 pass TC 仍帶 Closed Bug ID）
    if (tcId && !status.startsWith('Closed')) byTc[tcId] = bugId;
    if (feature) {
      if (!byFeature[feature]) byFeature[feature] = [];
      byFeature[feature].push({ bugId, status });
    }
  }
  return { byTc, byFeature };
}

// ── Bug Reports ──
function loadBugReports() {
  const rows = [];
  const bugsDir = path.join(ARTIFACTS_QA, 'bugs');
  if (!fs.existsSync(bugsDir)) return rows;
  for (const file of fs.readdirSync(bugsDir).filter(f => f.endsWith('.md'))) {
    const content      = fs.readFileSync(path.join(bugsDir, file), 'utf8');
    const titleMatch   = content.match(/^#\s+Bug Report[：:]?\s*([^\n]+)/m);
    const idMatch      = content.match(/\*\*?ID\*\*?[：:]\s*([^\n]+)/);
    const severMatch   = content.match(/\*\*?嚴重程度\*\*?[：:]\s*([^\n]+)/);
    const statusMatch  = content.match(/\*\*?狀態\*\*?[：:]\s*([^\n]+)/);
    const featureMatch = content.match(/受影響功能[：:]\s*([^\n]+)/);
    const dateMatch    = content.match(/\*\*?日期\*\*?[：:]\s*([^\n]+)/);
    const descSection  = content.match(/## 問題描述\s*\n+([\s\S]*?)(?=\n##|$)/);
    const reason = descSection
      ? (descSection[1].split('\n').map(l => l.replace(/^>\s*/, '').trim()).find(l => l.length > 0) || '')
      : '';
    rows.push([
      idMatch      ? idMatch[1].trim()      : path.basename(file, '.md'),
      titleMatch   ? titleMatch[1].trim()   : '',
      severMatch   ? severMatch[1].trim()   : '',
      statusMatch  ? statusMatch[1].trim()  : '',
      featureMatch ? featureMatch[1].trim() : '',
      dateMatch    ? dateMatch[1].trim()    : '',
      reason,
    ]);
  }
  return rows;
}

// ── Scenarios（解析 Given/When/Then Markdown）──
function loadScenarios() {
  const rows = [];
  if (!fs.existsSync(TC_DIR)) return rows;
  for (const feature of fs.readdirSync(TC_DIR)) {
    const scFile = path.join(TC_DIR, feature, 'scenarios.md');
    if (!fs.existsSync(scFile)) continue;
    const content = fs.readFileSync(scFile, 'utf8');
    const featureBlocks = content.split(/^## (F\d+[^\n]*)/m).slice(1);
    for (let fi = 0; fi < featureBlocks.length; fi += 2) {
      const fHeader = featureBlocks[fi].trim();
      const body    = featureBlocks[fi + 1] || '';
      for (const sc of body.split(/^### /m).slice(1)) {
        const lines = sc.split('\n');
        const titleLine = lines[0].trim();
        const scIdMatch = titleLine.match(/^(S\d{2}-\d{2}|SC-\d+)\s+(.*)/);
        const scId    = scIdMatch ? scIdMatch[1] : '';
        const scTitle = scIdMatch ? scIdMatch[2] : titleLine;
        const given = (sc.match(/\*\*Given\*\*[：:]\s*([^\n]+)/) || sc.match(/- \*\*Given\*\*\s+([^\n]+)/) || [])[1] || '';
        const when  = (sc.match(/\*\*When\*\*[：:]\s*([^\n]+)/)  || sc.match(/- \*\*When\*\*\s+([^\n]+)/)  || [])[1] || '';
        const then  = (sc.match(/\*\*Then\*\*[：:]\s*([^\n]+)/)  || sc.match(/- \*\*Then\*\*\s+([^\n]+)/)  || [])[1] || '';
        rows.push([fHeader, scId, scTitle, given.trim(), when.trim(), then.trim()]);
      }
    }
  }
  return rows;
}

// ── Integration Tests（原有 17 section / 61 筆，手工整理）──
function loadIntegrationTests() {
  const rows = [];
  const bugMap = buildBugMap();
  const originalSections = IT_SECTIONS.slice(0, 17);
  for (const section of originalSections) {
    for (const tc of section.tcs) {
      const bugId = bugMap.byTc[tc.id] || '';
      rows.push([section.label, tc.feature, tc.id, tc.title, tc.priority,
        tc.testMethod, tc.e2eFlow, tc.externalDeps, tc.preconditions, tc.note, bugId]);
    }
  }
  return rows;
}

// ── 手測報告（新合併 25 section / 405 筆，來自交接包）──
function loadManualTestReport() {
  const rows = [];
  const bugMap = buildBugMap();

  // 讀取原始 INT 資料（含完整 given/when/then）
  const intAllPath = path.join(__dirname, 'int-all.json');
  const intRaw = fs.readFileSync(intAllPath, 'utf8').replace(/^﻿/, '');
  const intAll = JSON.parse(intRaw);
  // 建立 INT id → 原始資料的查詢表
  const intMap = {};
  for (const row of intAll) intMap[row.id] = row;

  const mergedSections = IT_SECTIONS.slice(17);
  for (const section of mergedSections) {
    for (const tc of section.tcs) {
      const bugId = bugMap.byTc[tc.id] || '';
      // 從 note 欄取出原始 INT ID（格式：「對應 INT-001」）
      const intId = (tc.note || '').replace('對應 ', '').trim();
      const raw = intMap[intId] || {};
      rows.push([
        tc.id,                                    // TC ID
        tc.feature,                               // Feature
        raw.type || tc.testMethod,                // 測試類型
        (raw.given || tc.e2eFlow || '').replace(/\n/g, ' ').trim(),   // Given（前置條件）
        (raw.when  || '').replace(/\n/g, ' ').trim(),                 // When（操作步驟）
        (raw.then  || '').replace(/\n/g, ' ').trim(),                 // Then（預期結果）
        tc.priority,                              // 優先度
        raw.preconditions || tc.preconditions || '', // 前置環境
        raw.externalDeps  || tc.externalDeps  || '', // 外部依賴
        '',                                       // 測試環境（手填）
        '🔄 待測試',                               // 執行結果（手填）
        '',                                       // 實際結果（手填）
        bugId,                                    // Bug ID
        '',                                       // 測試人員（手填）
        '',                                       // 測試日期（手填）
        intId,                                    // 原始 INT ID
      ]);
    }
  }
  return rows;
}

module.exports = {
  loadCredentials,
  loadToken,
  loadPipelineState,
  loadFailureMap,
  loadFailures,
  getResultSymbol,
  buildBugMap,
  loadBugReports,
  loadScenarios,
  loadIntegrationTests,
  loadManualTestReport,
  TC_DIR,
  ARTIFACTS_QA,
};
