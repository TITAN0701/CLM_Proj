# QA Pipeline: Report

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/qa-knowledge-loader.md`、`.claude/modules/eval-loader.md`、`qa-knowledge/test-strategy.md`

依序執行 Allure 產報 → Google Sheets 同步 → Google Drive xlsx 上傳 → 開啟 Allure 報告。
資料來源：`qa-workspace/.pipeline-state.json`（最新 pipeline 結果）。

## TodoWrite 任務追蹤（必須執行）

> 先讀 `.claude/modules/task-registry.md`，取得 `qa-pipeline-report` 的任務模板，**啟動時立即呼叫 TodoWrite 建立任務清單**。進度更新規則見 task-registry.md 的通用規則與 `qa-pipeline-report` 專屬規則。

Arguments:

```txt
$ARGUMENTS
```

---

## Steps

### Step 1 — 確認執行結果存在

檢查 `qa-workspace/.pipeline-state.json` 是否存在：

- **不存在** → **停止**，告知使用者先執行 `/QA-pipeline-run` 取得測試結果
- **已存在** → 繼續 Step 2

### Step 2 — 產出 Allure HTML 報告

執行：

```powershell
npm run allure:generate
```

- 成功 → 繼續 Step 3
- 失敗（allure-results 不存在或為空）→ 告知使用者先執行測試產生 allure-results，但**不停止**，繼續 Step 3

### Step 3 — 同步 Google Sheets

執行：

```powershell
npm run sync:sheet
```

分頁內容（共 7 個，QA 工作用）：
- `Test Cases`：來源 `qa-workspace/specs/*/test-cases.json` + pipeline-state（只含 TC-F 系列）
- `Scenarios`：來源 `qa-workspace/specs/*/scenarios.md`
- `Test Report`：來源 `qa-workspace/.pipeline-state.json`
- `Failures`：**來源 `tc_results=fail`（含 TC/IT）+ Bug Reports Open 補漏**，不依賴 `failure-report.md`（該檔只記錄最後一次執行，不代表所有已知問題）
- `Integration Tests`：來源 `scripts/shared/integration-tests-data.js`，狀態從 `tc_results` 動態取（IT-prefix regex 已支援）
- `Risk Notes`：來源 `artifacts/generated/qa/risk-notes.md`
- `Bug Reports`：來源 `artifacts/generated/qa/bugs/*.md`（**路徑必須正確**，`scripts/artifacts/...` 下的檔案不會被讀取）

> **設計說明**：Google Sheets 只含 QA 工作用的 7 個分頁。`合併檢視`、`Release Summary`、`佐證`、`佐證大圖` 這 4 個分頁**只存在於 xlsx**，不在 Sheets 中，這是正常設計，不是漏同步。

同步失敗（token 過期）→ 告知使用者執行 `node scripts/sheets/auth-sheets.js` 重新授權。

### Step 4 — 產出 xlsx 並上傳 Google Drive

執行：

```powershell
node scripts/sheets/upload-to-drive.js
```

產出 `artifacts/generated/qa/{日期}-qa-report.xlsx`，上傳至 Drive `RXCLM > AI Support文件`。

Sheet 內容（共 11 個，PM 完整版）：合併檢視、Test Cases、Scenarios、Test Report、Release Summary、Risk Notes、Bug Reports、Failures、Integration Tests、佐證、佐證大圖。

**合併檢視架構（TC + IT 統一）：**
- Part 1（TC）：來源 `test-cases.json`，SC ID 欄放 sc_ref，Given/When/Then 來自 scenarios.md
- Part 2（IT）：來源 `scripts/shared/integration-tests-data.js`，SC ID 欄放 `tc.id` 本身（如 `IT-LC-NEG-01`），Given=preconditions，When=e2eFlow，Then=note
- 兩者執行結果都從 `tc_results` 取，Bug 欄從 `buildBugMap()` 取（只顯示 Open Bug）
- **合併檢視的 ❌ 失敗筆數必須與 Failures 分頁筆數一致**

**佐證 / 佐證大圖資料來源：** `artifacts/raw/screenshots/evidence/evidence-index.json`，由 `run-cypress.js` 每次跑完後自動 upsert（Cypress 截圖 → evidence-index）。若佐證欄位空白，確認 `evidence-index.json` 是否存在且有資料。

**佐證截圖品質問題（已知限制）：**
- `afterEach` 的 `fullPage` 截圖是 TC 結束後才截，畫面已跳回列表頁或停在錯誤訊息，**不是關鍵操作當下**
- 手動 `cy.screenshot('TC-F11-01-Group清單')` 有截關鍵時刻，但命名為中文說明而非 `TC-ID` 格式，**evidence-index upsert 無法識別，不會收入佐證**
- **解法**：手動截圖命名必須以 TC ID 開頭，格式：`cy.screenshot('TC-F11-01 關鍵操作')`，`run-cypress.js` 的 upsert 邏輯才能正確比對
- 關鍵截圖時機應在 assertion 前（操作完成、結果出現時），不依賴 `afterEach`

**Bug Reports 欄位說明：**
- `artifacts/generated/qa/bugs/BUG-AUTO-*.md`（Cypress 失敗自動產出）+ `BUG-*.md`（手動建立）
- 刪除 Bug Report 後需手動確認剩餘 ID 連續性
- Bug Report 標題「未知功能」代表 `run-cypress.js` 的 `DESCRIBE_TO_FEATURE` map 缺少對應，需補入

上傳失敗（權限不足）→ 告知使用者執行 `node scripts/sheets/auth-sheets.js` 重新授權（需 `drive.file` scope）。

### Step 5 — 開啟 Allure 報告

執行：

```powershell
Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'cd "C:\Users\suppo\Desktop\RXCLM"; npm run allure:open'
```

- Allure 報告會在新視窗中開啟瀏覽器
- Step 2 若失敗則跳過此步驟，告知使用者先執行測試

---

## 完成摘要格式

```
QA Pipeline: Report 完成
✅ Step 1 執行結果  — pipeline-state.json 已確認（Pass N / Pending N / Fail N）
✅ Step 2 Allure   — HTML 報告已產出（artifacts/generated/allure-report/）
✅ Step 3 Google Sheets — 同步完成
   Test Cases: N 筆 / Scenarios: N 筆 / Test Report: N 筆 / Failures: N 筆 / Integration Tests: N 筆 / Risk Notes: N 筆 / Bug Reports: N 筆
✅ Step 4 Google Drive  — 上傳完成
   產出：artifacts/generated/qa/{日期}-qa-report.xlsx
   連結：{Drive 連結}
✅ Step 5 Allure 報告   — 已在新視窗開啟
```

> 💡 **Context 建議**：全流程結束後可執行 `/compact` 清理 context，下次開新 session 再繼續其他工作。
