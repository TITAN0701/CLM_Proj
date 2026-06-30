# Report Format

此文件定義 QA 報告 xlsx 的格式規格，供 `sync-to-sheet.js` 和 `upload-to-drive.js` 產出時遵守。
對齊 BPM_RX 格式，PM 可用同一套閱讀習慣查看報告。

**修改或新增 Sheet 前，必須先對照此文件確認欄位順序與命名。**

---

## Sheet 清單（共 9 個，順序固定）

| # | Sheet 名稱 | 資料來源 | 備註 |
|---|-----------|---------|------|
| 1 | 合併檢視 | TC（test-cases.json）+ IT（integration-tests-data.js）+ scenarios.md + tc_results + Bug | PM 主要看這頁，TC 和 IT 都要顯示 |
| 2 | Test Cases | test-cases.json + pipeline-state.json | 只含 TC-F 系列 |
| 3 | Scenarios | scenarios.md | |
| 4 | Test Report | pipeline-state.json | |
| 5 | Release Summary | pipeline-state.json | Key-Value 格式 |
| 6 | Risk Notes | artifacts/generated/qa/risk-notes.md | 無資料時空白 |
| 7 | Bug Reports | artifacts/generated/qa/bugs/*.md | 無資料時空白 |
| 8 | 佐證 | evidence-index.json（縮圖 200×100px） | 無資料時空白 |
| 9 | 佐證大圖 | evidence-index.json（大圖 800×370px） | 無資料時空白 |

---

## 各 Sheet Headers

```js
// Sheet 1: 合併檢視（TC + IT 合併，欄位統一）
// TC 部分：SC ID 欄放 sc_ref，Given/When/Then 來自 scenarios.md
// IT 部分：SC ID 欄放 tc.id 本身（如「IT-LC-NEG-01」），Given=preconditions，When=e2eFlow，Then=note
['Feature', 'SC ID', 'TC ID', '情境標題', 'Given', 'When', 'Then', '優先度', '類型', '執行結果', 'Bug']

// Sheet 2: Test Cases
// sync-to-sheet.js（無 SC Ref）：
['Feature', 'TC ID', '標題', '優先度', '類型', '前置條件', '測試步驟', '預期結果', '測試狀態', '手測結果', '最後更新', 'Bug']
// upload-to-drive.js（有 SC Ref）：
['Feature', 'TC ID', 'SC Ref', '標題', '優先度', '類型', '前置條件', '測試步驟', '預期結果', '執行結果', '手測結果', '備註', 'Bug']

// Sheet 3: Scenarios
['Feature', 'SC ID', '情境標題', 'Given', 'When', 'Then']

// Sheet 4: Test Report
['Feature', 'Pass', 'Pending', 'Fail', 'Playwright 補驗', 'Pipeline ID', '備註']

// Sheet 5: Release Summary
['項目', '值']

// Sheet 6: Risk Notes
['Feature', '風險等級', '影響範圍', '建議 Owner', '建議 Release']

// Sheet 7: Bug Reports
['Bug ID', '標題', '嚴重程度', '狀態', '影響功能', '日期']

// Integration Tests（測試狀態欄已移除，執行結果統一看合併檢視）
['類型', 'Feature', 'TC ID', '標題', '優先度', '測試方法', 'E2E 流程說明', '外部系統依賴', '前置條件', '備註', 'Bug']

// 整合情境（integration-scenarios.md 子情境，Given/When/Then）
['分類', 'IT SC ID', '情境標題', 'Given', 'When', 'Then']

// Sheet 8: 佐證（縮圖）
['佐證截圖', 'TC ID', 'SC Ref', 'Feature', '頁面', '操作說明', '狀態']

// Sheet 9: 佐證大圖
// 無 header，手動欄寬 A=14, B=110, C=45，列高 360pt
```

---

## test-cases.json 欄位規格

頂層陣列（非物件包裝），每筆必有：

```json
{
  "id": "TC-F01-01",
  "feature": "功能名稱",
  "scenario": "S01-01",
  "sc_ref": "S01-01",
  "title": "測試案例標題",
  "priority": "P1",
  "type": "smoke|functional|negative",
  "preconditions": [],
  "steps": [],
  "expected": "",
  "tags": [],
  "status": "pending",
  "manual_result": ""
}
```

**注意**：`sc_ref` 必須存在（值同 `scenario`），供合併檢視 Sheet 查詢 Given/When/Then。

### automation_candidate 欄位

```json
{
  "automation_candidate": true
}
```

- `true` → 合併檢視「自動化」欄顯示 ✅
- `false` → 顯示 ❌，不產出 `.cy.ts`
- 欄位不存在 → 顯示 ⚠️（待評估）

---

## scenarios.md Markdown 格式

```markdown
## F01 — 功能名稱（/route）

### S01-01 情境標題
- **Given** 初始條件
- **When** 執行動作
- **Then** 預期結果
- **And** 補充條件（選填）
```

**解析規則（sync-to-sheet.js 與 upload-to-drive.js 共用）：**

- `## FXX` 開頭的區塊 → Feature 名稱
- `### SXX-XX 標題` → SC ID + 情境標題（ID 格式：`S\d{2}-\d{2}`）
- `**Given**` / `**When**` / `**Then**` → 支援三種格式：
  - `**Given**: text`
  - `**Given** text`
  - `- **Given** text`

---

## 執行結果符號定義

| 符號 | 值 | 條件 |
|------|---|------|
| ✅ 通過 | `pass` | `tc_results[TC ID] = pass` |
| ⏭️ 跳過 | `pending` | `tc_results[TC ID] = pending`（it.skip）|
| ❌ 失敗 | `fail` | `tc_results[TC ID] = fail` |
| 📋 規劃中 | （無記錄）| TC 尚未跑過（featureState.tests_run ≠ done）|
| 🔄 測試中 | （無記錄）| IT 子情境預設狀態（tc_results 無此父 ID）|
| — 未執行 | （無記錄）| TC 尚未跑過（featureState.tests_run ≠ done）|

**IT 執行狀態說明：**
- IT ID 格式為 `IT-XX-YY`，Cypress spec 跑完後 `run-cypress.js` 自動寫入 `tc_results`（regex 已支援 IT-prefix）
- 未執行的 IT 顯示「📋 規劃中」；已跑出結果後與 TC 相同顯示 ✅/❌/⏭️

---

## 腳本差異說明

| 差異點 | sync-to-sheet.js | upload-to-drive.js |
|--------|-----------------|-------------------|
| Test Cases 欄位 | 無 `SC Ref` 欄 | 有 `SC Ref` 欄 |
| Test Cases 欄位 | `測試狀態`、`最後更新` | `執行結果`、`備註` |
| 輸出 | 直接更新 Google Sheet | 本地 xlsx + 上傳 Drive |
| 共用資料 | `require('../shared/qa-data')` | `require('../shared/qa-data')` |

---

## Bug 檔案管理規則（artifacts/generated/qa/bugs/）

### 路徑規則（嚴格遵守）
- **正確路徑**：`artifacts/generated/qa/bugs/*.md`
- **禁止路徑**：`scripts/artifacts/...`（任何在 scripts/ 下產出的 Bug 檔案一律視為錯誤，立即刪除）
- `buildBugMap()` 只讀正確路徑，錯誤路徑的 Bug 不會出現在任何分頁

### 命名規則
- 自動產出：`BUG-AUTO-{TC/IT ID}-{YYYY-MM-DD}.md`（例：`BUG-AUTO-IT-DP-NEG-02-2026-06-25.md`）
- 手動建立：`BUG-{序號}-{簡述}.md`（例：`BUG-001-ca-route-404.md`）
- **禁止使用 `TC-UNKNOWN` 當 TC ID**：必須在 auto-fix 產出後立即確認真實 TC ID 並更正

### Bug 狀態與合併檢視的關聯
- `狀態: Open` → Bug 出現在合併檢視 Bug 欄 + Failures 分頁
- `狀態: Closed(...)` → Bug **不出現**在合併檢視 Bug 欄（`buildBugMap()` 過濾 Closed），但仍保留在 Bug Reports 分頁供歷史查閱
- **Bug 欄顯示 Closed ID 是錯誤訊號**，代表 `buildBugMap()` 邏輯異常

### ID 連續性
- BUG-AUTO ID 由 `run-cypress.js` 自動遞增，**迴圈外初始化計數器**（避免同批多筆重複 ID）
- 若 ID 有空缺（如 003 不存在），屬歷史執行造成，不需補號，但必須確認無重複

### Failures 分頁來源（已知功能問題彙整）
- **來源1**：`tc_results = fail` 的所有 TC ID（含 TC-F 和 IT-prefix）
- **來源2**：Bug Reports Open 且 TC ID 不在 tc_results 的項目（補漏）
- **不使用** `failure-report.md` 作為 Failures 分頁唯一來源（該檔只記錄最後一次執行的失敗，空跑會蓋掉歷史紀錄）
- IT-prefix TC 不在 `test-cases.json`，feature 和 title 從 Bug 檔案的 `受影響功能` 和 `> 測試案例：` 欄位補入

## manual_result 欄位規則

- **不會被 Cypress 覆蓋**：`run-cypress.js` 的 `autoUpdatePipelineState()` 只更新 `tc_results`，不動 `manual_result`
- **填寫方式**：直接編輯 `test-cases.json`，`npm run sync:sheet` 後帶入 Test Cases sheet「手測結果」欄
- **新增 TC 時**：預設帶入空字串
- **建議值**：`✅ Pass` / `❌ Fail` / `⏭️ Skip` / `""`（空白 = 尚未手測）
