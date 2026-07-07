# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 核心流程（三步驟）

```
Step 1 — 需求 → TC 設計   /QA-pipeline-spec   → /compact → 新 session
Step 2 — 截圖 → 執行測試  /QA-pipeline-run    → /compact → 新 session
Step 3 — 報告 → 同步上傳  /QA-pipeline-report → /compact
```

> **每個 pipeline 完成後執行 `/compact`，再開新 session 執行下一步。**
> Playwright snapshot + Cypress 輸出會大量佔用 context，分 session 可降低 token 消耗與 subagent 費用。

---

## Slash Commands 分層表（必須遵守）

> **AI 規則：只有「主流程」與「維護工具」層的指令可以直接執行。「Pipeline 內部子步驟」禁止直接呼叫，只能由對應 pipeline 在內部載入。**

### 主流程（使用者直接呼叫）

| 指令 | 用途 |
|------|------|
| `/QA-pipeline-spec` | 需求 → questions → scenarios → test-cases（串聯 QA-1、QA-clarify、QA-design） |
| `/QA-pipeline-run` | snapshot → .cy.ts → 執行測試 → 更新 pipeline-state（串聯 playwright-smoke-test、QA-5） |
| `/QA-pipeline-report` | Allure 產報 → Google Sheets 同步 → Google Drive xlsx 上傳（串聯 QA-6） |

### 維護工具（按需呼叫，不在主流程內）

| 指令 | 用途 | 觸發時機 |
|------|------|---------|
| `/PM-import` | PM 需求轉入 pm-inbox | PM 填需求時 |
| `/PM-report` | 匯出 release-summary.docx | 報告需要 Word 版本時 |
| `/QA-knowledge-update` | 更新 qa-knowledge 知識庫 | 功能大改版、術語不一致時 |
| `/QA-bug-report` | 推送 Bug 到 GitHub Issues | 手動建立 Bug 單時 |
| `/check-project` | 環境健康檢查 | 環境異常或初次設定後 |
| `/project-init` | 初始化新專案 | 新專案一次性使用 |
| `/run-task` | 執行 current-task.md | 使用者填好任務清單後 |

### Pipeline 內部子步驟（禁止直接呼叫）

> 以下指令只由 pipeline 在內部載入，**AI 不得在使用者未明確要求子步驟時直接執行**。

| 指令 | 隸屬 Pipeline |
|------|-------------|
| `QA-1-import-pm-request` | `/QA-pipeline-spec` |
| `QA-clarify` | `/QA-pipeline-spec` |
| `QA-design` | `/QA-pipeline-spec` |
| `QA-5-generate-automation` | `/QA-pipeline-run` |
| `playwright-smoke-test` | `/QA-pipeline-run` |
| `QA-6-generate-report` | `/QA-pipeline-report` |

### 規則更新同步原則

> 新規則或修正**只寫在對應的 pipeline command**（QA-pipeline-spec / run / report），不寫在子步驟 command。子步驟 command 的內容以 pipeline 為準，有衝突時以 pipeline 優先。

---

> 常用指令與 Slash Commands 完整清單見 [README.md](README.md)

---

## 目錄結構

```
pm-inbox/                    # PM 需求輸入（.md 或 .xlsx）
qa-workspace/
  specs/{feature}/           # 每個功能的工作區
    spec.md                  # 功能規格
    questions.md             # QA 釐清備忘（QA Assumption，不等 PM）
    scenarios.md             # 測試情境（Given/When/Then）
    test-cases.json          # 測試案例
    execution-results.json   # 執行結果回填
  schemas/                   # JSON Schema 驗證
qa-knowledge/                # QA 知識庫（test-strategy, risk-rules, selector-policy, report-format, doc-format）
artifacts/
  generated/qa/              # AI 產出：test-plan.md, test-cases.json, scenario-matrix.xlsx
  generated/pm/              # PM 報告：release-summary.md
  raw/                       # 原始執行結果（Allure, screenshots）
automation/
  e2e/
    specs/                   # Cypress 測試案例 (*.cy.ts)
    pages/                   # Page Object selectors
    flows/                   # 跨頁流程
    fixtures/                # 測試資料與登入狀態
  api/tests/                 # pytest API 測試 (*.py)
scripts/
  cypress/                   # Cypress 執行層：run-cypress.js, auto-fix.js, codegen-to-cypress.js
  report/                    # 報告產出層：generate-qa-report.ps1, export-pm-report-docx.ps1/py, generate-scenario-matrix-xlsx.py
  sheets/                    # Google 授權與同步層：sync-to-sheet.js, upload-to-drive.js, auth-sheets.js, sync-*.py
  pipeline/                  # Pipeline 狀態層：update-pipeline-state.ps1, update-execution-result.py
  qa-workspace/              # QA 工作區維護層：new-feature-from-inbox.ps1, validate-*.ps1/py, project-init.ps1, refresh-qa-artifacts.ps1, preflight-ci.ps1, audit-claude-docs.js
  shared/                    # 共用 Loader（被 require）：qa-data.js, describe-maps.js, integration-tests-data.js
docs/                        # 架構、協作、環境設定文件
```

---

## AI 行為限制

- **不可擅自新增使用者未要求的欄位、區塊或功能**
- **修改檔案時只改使用者指定的部分**，不做額外調整或「順手優化」
- **產出格式以參考來源為準**（如 qa-claude-skill），不自行發明新欄位
- **有疑問先問，不要假設**：不確定是否該加某個東西時，先詢問使用者確認
- **對話過程中只執行使用者明確說的事**：不把討論中的想法、建議或分析自動實作進去，除非使用者明確說「請做」或「幫我加」
- **使用者只是提問或討論時，不可動任何檔案**：問題就回答問題，分析就給分析，沒有收到明確指令前不得寫入、新增或修改任何檔案
- **分析技術可行性前必須先驗證假設，不可把未經確認的推斷當結論寫入文件**：若無法驗證，應明確說明「尚未確認」，不得以猜測作為分析依據
- **回答任何問題或執行任何任務前，必須確認 CLAUDE.md 相關章節的內容**，不得依賴記憶或推斷；涉及流程、指令順序、目錄結構、規則的問題，一律以 CLAUDE.md 為唯一來源。
- **每次對話開始時必須讀取本專案的 memory**：從 Claude Code 的專案 memory 目錄讀取 `MEMORY.md`（路徑由系統自動提供，不需寫死）。根據內容了解專案現況與過去決策，讀取失敗時不需提示使用者，直接繼續。
- **建立或修改任何 `.claude/` 檔案前，必須先載入 `.claude/modules/structure-policy.md`**，確認內容放置在正確層級（commands / evals / modules），不得憑印象判斷。
- **讀取大型檔案時優先用 Grep 找關鍵字，再用 Read + limit/offset 只讀需要的段落**，避免一次載入整份檔案消耗大量 token（Context Rot 防護）。
- **每個 feature 完成後立即 commit**，確保狀態落地為檔案，不依賴 session 記憶。
- **Write 覆寫任何 spec 檔案前，必須先 Read 取得最新內容**：使用者可能已在 IDE 貼入 codegen 錄製的新 TC，直接 Write 會蓋掉。流程：Read 最新內容 → 識別並移除殘留 TC（TC ID 或頁面與 spec 不符的 TC）→ 保留所有其他 TC → Write 覆寫。不需詢問使用者。

---

## Git 高風險指令絕對限制

以下指令**執行前必須先備份，且必須列出將要執行的完整指令讓使用者確認，不得直接執行**：

- `git filter-repo`（任何參數組合）
- `git push --force` / `git push -f`
- `git reset --hard`
- `git rebase`（改寫歷史模式）
- `git clean -f` / `git clean -fd`
- 任何會**改寫 commit 歷史**或**刪除工作目錄檔案**的指令

**備份流程（每次執行上述指令前強制執行）：**
```powershell
$root = (Get-Item -Path (git -C $PSScriptRoot rev-parse --show-toplevel 2>$null ?? ".")); Compress-Archive -Path $root.FullName -DestinationPath "$($root.Parent.FullName)\$($root.Name)-backup-$(Get-Date -Format 'yyyyMMdd-HHmm').zip" -Exclude "*/node_modules/*"
```

**特別禁止**：`git filter-repo --path <單一路徑> --replace-text` 組合使用 — 這會刪除所有其他檔案。正確用法只用 `--replace-text`，不加 `--path`。

---

## 自動化修正機制（Auto-Fix）

Cypress 測試失敗後，`run-cypress.js` 會自動啟動修正流程：

```
npm run test:e2e -- --spec "..."
  ↓ 失敗偵測
  ↓ scripts/cypress/auto-fix.js
      ↓ Playwright 登入 → 截 snapshot
      ↓ 規則比對修正 spec
      ↓ 重跑 Cypress
  ↓ artifacts/raw/auto-fix-summary.md（修正摘要）
  ↓ artifacts/raw/failure-report.md（失敗報告）
```

- **規則庫**：`scripts/cypress/auto-fix.js` → `inferFix()` 函式
- **codegen 轉換規則**：`scripts/cypress/codegen-to-cypress.js`

### inferFix() 修正規則（auto-fix.js）

| 規則 | 觸發條件 | 修正動作 |
|------|---------|---------|
| input 定位 | `input[type="text"]` 找不到 + snapshot 含「編輯」 | 改 `cy.contains('h3','編輯').parent().find('input').first()` |
| placeholder 截斷 | `input[placeholder="M2-100-xxxx-"]` 找不到（缺 `...`） | 從 snapshot 補全完整 placeholder |
| 訊息不需 click | 提示/錯誤訊息的 `.click()` 超時 | 改 `.should('be.visible')` |
| 導覽列連結 | `cy.contains('a','X')` 找不到 | 改 `cy.visit('/對應路徑')` |
| 按鈕文字不符 | `contains('button','X')` 找不到 | 從 snapshot 找近似按鈕文字替換 |
| h2/h3 找不到 | heading selector 找不到 | 改不限 tag 的 `cy.contains()` |
| 成功訊息 click | `✓` 開頭或含「成功/已儲存/已刪除」的 click | 改 `.should('be.visible')` |

### codegen-to-cypress.js 轉換規則

| Playwright 原始 | 轉換結果 |
|----------------|---------|
| `page.waitForEvent('download')` / `await downloadPromise` | `// [SKIP]` 註解 |
| `page.once('dialog', ...)` / `dialog.dismiss()` | `// [SKIP]` 註解 |
| `getByRole('link', {name: '帳號'})` 等導覽列連結 | `cy.visit('/accounts')` |
| `cy.contains('✓ 成功').click()` 或含「成功/已儲存」 | `.should('be.visible')` |

**NAV_LINK_TO_PATH 對照表**：帳號→`/accounts`、憑證→`/certs`、儀表板→`/dashboard`、審核→`/admin/approvals`、稽核紀錄→`/audit`、合規政策→`/admin/policies`、系統設定→`/admin/settings`

### pipeline-state.json 讀寫規則（update-pipeline-state.ps1）

必須用 `.NET` UTF-8 encoding，否則中文亂碼或清空檔案：

```powershell
# ✅ 正確
$json = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)

# ❌ 錯誤（Out-File 產生 UTF-16，Set-Content 可能清空）
$json | Out-File $path
Set-Content $path $json
```

### trashAssetsBeforeRuns 設定

`cypress.config.ts` 必須設 `trashAssetsBeforeRuns: false`，否則跑新 spec 前會清空前一個 spec 的截圖，evidence-index 遺失佐證圖片。

### TC 撰寫規則（必須遵守）
- 每個 TC 必須有 `cy.visit()` — codegen 插入的 TC 可能沒有
- 寫入操作用 `Date.now()` timestamp 命名 — 避免重複衝突
- 寫入操作結尾必須自我清理（新增後刪除）
- 刪除後驗證用 `cy.url().should('include', '/列表頁')` — 比 `contains().should('not.exist')` 更穩定
- 環境依賴資料不可用 `it.skip`，改為自建自刪 — 若 TC 需要特定預設資料（如指定名稱的 provider），改寫成自己新增一筆 → 操作 → 刪除，與環境狀態無關
- 清單頁若有 empty state 不渲染 `<table>` — 需先新增一筆資料再驗證 table，不可直接 `cy.get('table').should('be.visible')`
- 表單 `label + select` selector — DOM 結構為 `<label>欄位名 *</label><div><select>...</select></div>`，用 `cy.contains('label', '欄位名').next().find('select')`，不可用 `.parent().find('select')`（範圍太廣）
- 頁面有重複文字的按鈕 — 如「匯入」和「批次匯入 (Excel)」，`cy.contains('button','匯入')` 會匹配到錯誤按鈕，改用兄弟定位 `cy.contains('button','取消').prev('button')`
- 含逗號的錯誤訊息 assertion — `cy.contains('文字,含逗號')` 可能解析失敗，改用 `cy.get('main').should('contain.text', '文字')`
- QA-5 `--page` 模式產出的 TC 只有基本欄位（id/title/priority），`preconditions`、`steps`、`expected` 必須手動補齊後才算完整

### TC 失敗 vs 跳過判斷規則（必須遵守）
- **完整定義見 `qa-knowledge/test-strategy.md`「TC 執行狀態定義」，以該檔為唯一來源**
- 核心原則：功能有問題必須 ❌ 失敗，`it.skip()` 只用於功能未上線或環境不支援，selector 不確定先補截 snapshot 再判斷

### beforeEach 頁面確認規則（必須遵守）
- **`beforeEach` 的頁面確認一律用 `cy.url().should('include', '/路徑')`**，不可用 `cy.contains('h2', '...')`
- 原因：h2 標籤未必存在，頁面標題文字可能與預期不同（如「憑證 / 匯入既有憑證」≠「匯入憑證」）
- `beforeEach` 失敗 → 整個 describe 所有 TC 都無法執行，是高風險 selector

### Cypress session cache 重建導致 TC 誤判 fail（必須遵守）

多個 spec 連跑時，`cy.session('adminSession', ..., { cacheAcrossSpecs: true })` 在 session 快取失效時會觸發重建，重建過程若 `input[type="password"]` 尚未渲染完成，`loginAsAdmin()` 本身會 timeout，造成 **整個 spec 的第一個 TC 被標為 fail**，但實際上是 session 時序問題，非功能問題。

判斷方式：
- 錯誤訊息出現在 `loginAsAdmin()` 內部（`expected input[type="password"] to be visible`），而非 TC assertion
- 該 TC 單獨重跑時通過

處理規則：
- 將失敗的 spec **單獨重跑一次**，若通過則判定為環境時序問題，更新 pipeline-state 為 pass
- 若單跑仍失敗，才進入 selector 分析或 Bug 判定流程
- **不可直接把 session 時序造成的 fail 標記為功能 Bug**

### 新增 spec describe 時必須同步更新 DESCRIBE_TO_FEATURE
- `run-cypress.js` 有兩處 `DESCRIBE_TO_FEATURE` map（第 34 行、第 308 行），新增 describe 時兩處都要更新
- 未登記的 describe → BUG-AUTO 產出「未知功能」，報告內容錯誤
- `syncCypressScreenshotsToEvidence()` 也有一份（第 588 行）同樣需要維護

### Bug 檔案路徑規則（必須遵守）
- **唯一正確路徑**：`artifacts/generated/qa/bugs/*.md`
- **禁止路徑**：`scripts/artifacts/...` 下的任何 Bug 檔案 → 一律視為錯誤產出，立即刪除
- `buildBugMap()` 只讀正確路徑；錯誤路徑的檔案不會被報告系統讀取，但會造成 ID 混亂
- Bug 檔名規則：自動產出 `BUG-AUTO-{TC/IT ID}-{日期}.md`；手動建立 `BUG-{序號}-{簡述}.md`
- **禁止使用 `TC-UNKNOWN` 當 TC ID**：auto-fix 產出後必須立即確認真實 TC ID 並更正

### 合併檢視架構規則（必須遵守）
- 合併檢視同時包含 **TC（TC-F prefix）** 和 **IT（IT-prefix）** 兩個來源，缺一不可
- TC 資料來源：`qa-workspace/specs/*/test-cases.json`
- IT 資料來源：`scripts/shared/integration-tests-data.js`（唯一來源，不可重複定義）
- 兩者執行結果都從 `pipeline-state.tc_results` 取，IT-prefix regex 已在 `run-cypress.js` 支援
- Bug 欄只顯示 **Open** 狀態的 Bug（`buildBugMap()` 自動過濾 Closed）
- **合併檢視 ❌ 失敗筆數必須與 Failures 分頁筆數一致**，不一致代表有資料斷鏈

### Failures 分頁來源規則（必須遵守）
- **正確來源**：`tc_results = fail` 的所有 TC/IT + Bug Reports Open 補漏
- **禁止**單純依賴 `failure-report.md`：該檔只記錄最後一次執行的失敗，空跑或換 spec 後會蓋掉歷史紀錄
- IT-prefix TC 不在 `test-cases.json`，Failures 的 feature/title 從 Bug 檔案的 `受影響功能` 和 `> 測試案例：` 補入

---

## 環境設定（.env）

```env
CYPRESS_BASE_URL=http://192.168.0.122:19010
API_BASE_URL=https://api-staging.example.com
TEST_USER_EMAIL=0999999993
TEST_USER_PASSWORD=password123
TEST_ENV=staging
```

`.env` 不提交 Git。CI 使用 GitHub Secrets：`CYPRESS_BASE_URL`、`API_BASE_URL`、`TEST_USER_EMAIL`、`TEST_USER_PASSWORD`。

---

## 外部工具設定

### Google Drive MCP
- 用途：唯讀搜尋 Drive 檔案（`mcp__gdrive__search`）
- Token：`.claude/gdrive-token.json`
- Credentials：`.claude/google-credentials.json`
- 範圍：`drive.readonly`

### Google Sheets 同步
- 用途：將 TC、Scenarios、Report、Risk Notes、Bug Reports 同步至 Google Sheet 供 PM 查閱
- 執行：`npm run sync:sheet`（腳本：`scripts/sheets/sync-to-sheet.js`）
- Token：`.claude/sheets-token.json`（範圍：`spreadsheets` + `drive.readonly`）
- 初次授權：`node scripts/sheets/auth-sheets.js`（會開啟瀏覽器，完成後自動存 token）
- Spreadsheet ID：`1uK9k4O1gL_YiNbXolOITpVnYwzJHB0j-UunLjG0fV0g`（WETPAINT QA AI 測試報告，2026-06-17 建立）

### Playwright MCP
- 用途：截圖所有頁面與測驗流程（`/playwright-smoke-test`），包含進入測驗、逐題作答、影片錄製上傳
- 透過 Claude Code MCP 整合，不需額外安裝
- **允許所有操作**：登入、點「開始測驗」/「開始檢測」、填寫並送出表單（2026-06-12 授權）
- **每一題都必須點入截圖 + snapshot，不可跳過**
- **影片模組必須完整執行**：切換 390×844 → 開始錄製 → 等 30 秒 → 停止 → 上傳
- **等待操作上限**：單次 wait 不超過 20 秒；影片上傳等長時間操作改用輪詢（wait 10s → 檢查 → wait 10s → 檢查）
- **Smoke Test 必須新增全新孩童**：不可使用已測驗個案（顯示「等待下次檢測時間」無法進入）
- **已知測試個案及年齡層模組對照**：見 `automation/e2e/pages.md` 與 project memory

### GitHub CLI（gh）
- 用途：`/QA-bug-report` 自動推送 Bug 至 GitHub Issues
- 目標 Repo：`TITAN0701/QAAISup`
- 前置確認：`gh auth status`

> 以上 token 檔案均不提交 Git。

---

## scripts/ 撰寫規則（必須遵守）

### 1. 資料與邏輯分離（Data embedded in logic 禁止）

- **靜態資料陣列禁止內嵌在函數內**（如 IT_SECTIONS、DESCRIBE_TO_FEATURE map 等）
- 超過 20 行的靜態資料必須抽成獨立的 `*-data.js` 檔案，再用 `require()` 引入
- 多個腳本共用同一份資料時，**只能有一個檔案是來源**，其他全部 `require` 它，不得各自維護副本
- 違反此規則的典型症狀：兩個腳本出現內容幾乎相同的大型陣列、用 `JSON.stringify()` 嵌入產生雙引號 key

```js
// ❌ 錯誤：資料直接嵌在函數內
function loadIntegrationTests() {
  const SECTIONS = [{ label: '...', tcs: [{ id: 'IT-LC-01', ... }, ...300 行...] }];
  ...
}

// ✅ 正確：抽成獨立檔案
// scripts/integration-tests-data.js → module.exports = IT_SECTIONS;
const IT_SECTIONS = require('./integration-tests-data');
function loadIntegrationTests() { ... } // 函數只剩 8 行
```

### 2. JS 格式一致性

- 所有 `scripts/*.js` 一律使用**單引號字串**、**無引號物件 key**（JS 風格），禁止 JSON 格式（雙引號 key）混入
- 禁止用 `JSON.stringify()` 產生程式碼片段再嵌入腳本——這是「資料與邏輯混寫」的根本原因
- 縮排統一 2 空格

```js
// ❌ 錯誤：JSON 雙引號 key（JSON.stringify 產生）
{ "feature": "申請新憑證", "id": "IT-LC-NEG-01" }

// ✅ 正確：JS 單引號
{ feature: '申請新憑證', id: 'IT-LC-NEG-01' }
```

### 3. 單一函數行數上限

- 單一函數超過 **50 行**必須重構（抽資料或拆子函數）
- 單一腳本檔案超過 **500 行**需評估是否拆分

### 4. 重複邏輯禁止跨腳本複製

- `sync-to-sheet.js` 和 `upload-to-drive.js` 有相同邏輯時，抽成 `scripts/sheet-utils.js` 共用，不各寫一份
- 新增共用函數前先搜尋現有腳本是否已有相同實作

### 5. 暫時腳本命名與清理

- 一次性修正用的暫時腳本一律以 `_` 開頭命名（如 `_fix-xxx.js`）
- 執行完畢後**當場刪除**，不得留在 scripts/ 目錄
- 未以 `_` 開頭的腳本視為長期維護腳本，需有對應的 `npm run` 指令或文件說明用途

### 6. 批次產出多筆記錄時禁止在迴圈內重新讀取計數器

**適用場景：** for 迴圈內產出多筆有流水號的資料（如 BUG-AUTO ID、TC ID）。

```js
// ❌ 錯誤：迴圈內每次重新 readdirSync，同批多筆拿到相同 ID
for (const item of items) {
  const existing = fs.readdirSync(dir).filter(...).length;
  const id = String(existing + 1).padStart(3, '0');
}

// ✅ 正確：迴圈外初始化，迴圈內遞增
let nextId = fs.readdirSync(dir).filter(...).length + 1;
for (const item of items) {
  const id = String(nextId).padStart(3, '0');
  // ... 寫入檔案 ...
  nextId++;
}
```

**原因：** 第一筆寫入完成前，第二筆就已讀取目錄，兩筆都拿到同一個 existing 數，導致 ID 重複。此問題在 `generateAutoBugReports()` 中曾發生（2026-06-25 修正）。

---

## Selector 規則

完整規則見 `qa-knowledge/selector-policy.md`。

