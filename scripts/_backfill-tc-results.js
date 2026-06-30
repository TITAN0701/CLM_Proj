// 一次性工具：把 Allure results + it.skip 掃描結果補入 pipeline-state tc_results
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const statePath = path.join(ROOT, 'qa-workspace', '.pipeline-state.json');
const allureDir = path.join(ROOT, 'artifacts', 'raw', 'allure-results');
const specDir   = path.join(ROOT, 'automation', 'e2e', 'specs');

const state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^﻿/, ''));
if (!state.tc_results) state.tc_results = {};

// Step 1：從 .cy.ts 掃描所有 TC ID（it() 和 it.skip()）→ 先全設為 '— 未執行'
// Step 2：it.skip() 的 TC 設為 pending
// Step 3：Allure results 覆蓋（最精確）

const allTcIds   = {};
const skipTcIds  = {};

for (const f of fs.readdirSync(specDir).filter(f => f.endsWith('.cy.ts'))) {
  const content = fs.readFileSync(path.join(specDir, f), 'utf8');
  // 抓所有 it( 和 it.skip( 裡的 TC ID
  const itMatches     = [...content.matchAll(/\bit\s*\(\s*['"`](TC-[A-Z0-9-]+)/g)];
  const skipMatches   = [...content.matchAll(/\bit\.skip\s*\(\s*['"`](TC-[A-Z0-9-]+)/g)];
  for (const m of itMatches)   allTcIds[m[1]]  = true;
  for (const m of skipMatches) skipTcIds[m[1]] = true;
}

// it.skip → pending（除非 Allure 有更精確的結果）
for (const tcId of Object.keys(skipTcIds)) {
  if (!state.tc_results[tcId]) state.tc_results[tcId] = 'pending';
}

// Allure results → 最精確，覆蓋
if (fs.existsSync(allureDir)) {
  for (const f of fs.readdirSync(allureDir).filter(f => f.endsWith('-result.json'))) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(allureDir, f), 'utf8'));
      const m = (j.name || '').match(/^(TC-[A-Z0-9-]+)/);
      if (!m) continue;
      const tcId = m[1];
      const status = j.status === 'passed' ? 'pass' : j.status === 'skipped' ? 'pending' : 'fail';
      state.tc_results[tcId] = status;
    } catch {}
  }
}

fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
const keys = Object.keys(state.tc_results);
console.log(`✅ tc_results 已補入 ${keys.length} 筆`);
console.log('  skip:', Object.keys(skipTcIds).join(', '));
console.log('  allure:', Object.keys(state.tc_results).filter(k => !skipTcIds[k]).slice(0, 10).join(', ') + '...');
