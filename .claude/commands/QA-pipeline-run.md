# QA Pipeline: Run

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/mcp-fallback.md`、`.claude/modules/eval-loader.md`、`qa-knowledge/test-strategy.md`
>
> **pass / fail / skip 判定條件以 `qa-knowledge/test-strategy.md` 的「TC 執行狀態定義」為唯一來源，此 command 的描述僅為執行流程，有衝突時以 test-strategy.md 為準。**

依序執行 playwright-smoke-test → QA-5，完整完成 snapshot 取得、automation 產出、測試執行。
原有指令內容不變，此 pipeline 只負責串聯與 gate 判斷。

## TodoWrite 任務追蹤（必須執行）

> 先讀 `.claude/modules/task-registry.md`，取得 `qa-pipeline-run` 的任務模板，**啟動時立即呼叫 TodoWrite 建立任務清單**。進度更新規則見 task-registry.md 的通用規則與 `qa-pipeline-run` 專屬規則。

Arguments:

```txt
$ARGUMENTS
```

---

## 預設行為（無需使用者確認）

- **未帶 feature 參數** → 對全部功能執行（all）
- **snapshot 不存在** → 自動執行 playwright-smoke-test，不詢問使用者
- **`.env` 不存在** → 自動從 `config.json`（sitUrl / testEmail）+ Grep CLAUDE.md（password）建立 `.env`，不詢問使用者
- **帶 `--restart` 參數** → 忽略上次狀態，QA-5 也重新產出（會覆蓋現有 .cy.ts）
- **帶 `--retest` 參數** → QA-5 跳過，但 Cypress 測試全部重跑（適合 SIT 環境有更新時）

---

## Steps

### Step 0 — 確認 .env

檢查 `.env` 是否存在且 `CYPRESS_BASE_URL` 有值：

- **不存在或空白** → 依下列方式取值後寫入 `.env`，繼續執行（Context Rot 防護，不整份讀 CLAUDE.md）：
  - `CYPRESS_BASE_URL`：讀 `config.json` 的 `env.sitUrl`
  - `TEST_USER_EMAIL`：讀 `config.json` 的 `env.testEmail`
  - `TEST_USER_PASSWORD`：用 Grep 在 CLAUDE.md 找 `TEST_USER_PASSWORD=` 取值

---

### Step 0.5 — 掃描上次執行紀錄（Resume Check）

讀取 `qa-workspace/.pipeline-state.json`：

**若不存在** → 這是第一次執行，所有 feature 列為「需產出 QA-5」，進入 Step 1。

**若存在** → 顯示上次執行摘要（僅供參考），並決定各 feature 的 **QA-5 產出策略**：

```
📋 上次執行紀錄（Pipeline ID: {pipeline_id}，{last_updated}）

| Feature              | 上次 QA-5 | Pass | Pending | Fail | QA-5 本次 | 測試本次   |
|----------------------|-----------|------|---------|------|-----------|-----------|
| CA 機構              | ✅ done   | 5    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |
| Account 詳細         | ✅ done   | 4    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |
| 憑證列表             | ✅ done   | 5    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |
| 申請新憑證           | ⏳ 未完成  | -    | -       | -    | 🔄 產出   | 🔄 執行   |
...

📌 本次策略：
  QA-5  ⏭️ 跳過：N 個 / 🔄 產出：M 個
  測試  ⏭️ 跳過：N 個 / 🔄 執行：M 個
```

**QA-5 跳過規則：**
- `qa5 = "done"` 且未帶 `--restart` → 跳過產出，保留現有 .cy.ts
- `qa5 = "pending"` → 執行 QA-5
- 帶 `--restart` → 所有 feature 重新產出

**Cypress 測試跳過規則：**

> 永久跳過白名單從 `pipeline-state.json` 的 `pending_breakdown.legitimate_skip.features` 動態讀取，不在此硬寫清單。

- **feature 在 `legitimate_skip.features` 名單內** → 顯示 `[永久跳過] {feature} — 合法 skip（{原因}）`，沿用上次結果，不重跑
- `tests_run = "done"` 且 `fail = 0` 且 `pending = 0` 且未帶 `--retest` / `--restart` → 跳過，顯示 `[測試跳過] {feature} — 全數通過（Pass {N}）`
- `tests_run = "done"` 且 `pending > 0` 且 **該 feature 的所有 pending 都在 `legitimate_skip` 名單內** → 跳過，顯示 `[測試跳過] {feature} — pending 均為合法 skip`
- `tests_run = "done"` 且 `pending > 0` 且 **有 pending 不在 `legitimate_skip` 名單內** → **強制重跑**（it.skip 有機會解鎖）
- `tests_run = "done"` 且 `fail > 0` → **一律重跑**（有失敗必須確認）
- `tests_run = "pending"` → 執行測試
- 帶 `--retest` 或 `--restart` → legitimate_skip 名單以外的 feature 全部重跑測試

---

### Step 1 — 確認 Snapshot 狀態

檢查 `artifacts/raw/screenshots/snapshots/` 是否存在 snapshot 檔案，並比對修改日期：

```powershell
# 取得最新 snapshot 檔案的修改日期（日期部分）
$latest = Get-ChildItem "artifacts/raw/screenshots/snapshots/" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$snapshotDate = $latest.LastWriteTime.ToString("yyyy-MM-dd")
$today = (Get-Date).ToString("yyyy-MM-dd")
```

判斷規則：
- **不存在** → 自動執行 playwright-smoke-test，完成後繼續 Step 2
- **存在但 snapshot 日期 < 今天** → 自動執行 playwright-smoke-test（重截當日最新畫面），完成後繼續 Step 2
- **存在且 snapshot 日期 = 今天** → 跳過，直接進入 Step 2

---

### Step 2 — 逐 Feature 執行（QA-5 選擇性產出 + 測試全跑）

對每個 feature 依序執行：

#### 2a — QA-5 產出（選擇性）

```
若 qa5 = "done" 且非 --restart：
  → 顯示 [QA-5 跳過] {feature} — 上次已產出，保留現有 .cy.ts
  
若 qa5 = "pending" 或 --restart：
  → 載入並執行 QA-5-generate-automation 步驟（讀 snapshot 抽 selector）
  → 產出 automation/e2e/specs/{feature}.cy.ts
```

> **新增 spec 時必須：**
> 1. `beforeEach` 頁面確認一律用 `cy.url().should('include', '/路徑')`，不可用 `cy.contains('h2', '...')` — h2 不穩定，失敗會導致整個 describe 所有 TC 無法執行
> 2. 新的 describe 名稱必須同步更新 `run-cypress.js` 三處 `DESCRIBE_TO_FEATURE` map（第 34、308、588 行），否則 BUG-AUTO 產出「未知功能」

#### 2b — 執行 Cypress 測試（依跳過規則）

> **截圖保留規則：** `cypress.config.ts` 設 `trashAssetsBeforeRuns: false`，截圖累積保留不清空。跑完後 `run-cypress.js` 自動 upsert `evidence-index.json`（正常截圖優先，`(attempt N).png` 跳過，`(failed).png` 只在無正常截圖時寫入）。

```
若 feature 在 legitimate_skip.features 名單內：
  → 顯示 [永久跳過] {feature} — 合法 skip，沿用上次結果

若 tests_run = "done" 且 fail = 0 且 pending = 0 且非 --retest / --restart：
  → 顯示 [測試跳過] {feature} — 全數通過（Pass {N}），沿用結果

若 tests_run = "done" 且 pending > 0 且所有 pending 在 legitimate_skip 名單內 且非 --retest / --restart：
  → 顯示 [測試跳過] {feature} — pending 均為合法 skip，沿用結果

若 tests_run = "done" 且 pending > 0 且有 pending 不在 legitimate_skip 名單內：
  → 強制重跑（it.skip 有機會因 snapshot 補齊或工程實作而解鎖）

若 tests_run = "done" 且 fail > 0：
  → 強制重跑（有失敗必須確認）

若 tests_run = "pending" 或帶 --retest / --restart：
  → 執行：
```

```powershell
npm run test:e2e -- --spec "automation/e2e/specs/{feature}.cy.ts"
```

記錄結果：Pass / Pending（it.skip）/ Fail 數量。

#### 2b-補 — Playwright MCP 補驗（Cypress 無法覆蓋時）

```
若 Cypress 執行後仍有 pending（it.skip）或 fail，且原因為：
  - 前置需 mediaDevices（影片錄製）
  - 需完整流程狀態才能到達的步驟
  - SIT 不支援直連 URL（被重導）

→ 改用 Playwright MCP 走完流程並驗證：
  1. 用 createChild(月齡) API 建立全新孩童
  2. Playwright MCP 完整走完測驗流程（含影片錄製）
  3. 截圖 + snapshot 存入 artifacts/raw/screenshots/snapshots/
  4. 在 .cy.ts 對應的 it.skip 上方加：
     // [VERIFIED BY PLAYWRIGHT MCP] {日期} — {確認的事實}
  5. pipeline-state 該 TC 改為 pass，pending 數量減少
```

#### 2c — 更新 Pipeline State

每個 feature 完成後：

```powershell
.\scripts\pipeline\update-pipeline-state.ps1 -Feature "{feature}" -Qa5 "done" -TestsRun "done" -Pass {N} -Pending {N} -Fail {N} -PlaywrightVerified {N}
```

---

### Step 3 — 整體評估與完成摘要

完成所有 feature 後執行 `.\scripts\pipeline\update-pipeline-state.ps1 -Finalize`，然後輸出：

> 若有 fail → 繼續執行 **Step 3.5 失敗重新驗證**，再輸出最終摘要。

```
QA Pipeline: Run 完成
Pipeline ID: {new_id}
✅ Step 0.5 Resume  — QA-5 跳過 {M} 個 / 產出 {N} 個
✅ Step 1 Snapshot  — 已取得（或已跳過）
✅ Step 2 測試執行  — 全 {total} 個 feature 均已執行

測試結果彙整：
| Feature              | Pass | Pending | Fail | 狀態        |
|----------------------|------|---------|------|-------------|
| CA 機構              | 5    | 0       | 0    | ✅ 通過      |
| Account 詳細         | 4    | 0       | 0    | ✅ 通過      |
| 憑證列表             | 5    | 0       | 0    | ✅ 通過      |
...

總計：Pass {N} / Pending {N} / Fail {N}
AUTOMATION_OK / AUTOMATION_BLOCKED

下一步：/QA-pipeline-report
```

> 💡 **Context 建議**：完成後請執行 `/compact`，再開新 session 執行 `/QA-pipeline-report`。
> Playwright snapshot + Cypress 輸出會大量占用 context，compact 後再報告可節省 token。

評估結果代碼：
- 任一 feature `fail > 0` → `AUTOMATION_BLOCKED`，進入 Step 3.5 重新驗證後再判定
- 全部 `fail = 0` → `AUTOMATION_OK`

---

### Step 3.5 — 失敗 TC 重新驗證（有 fail 時自動執行）

> 目的：區分「環境/時序暫時性失敗」vs「真實功能 Bug」，避免誤判。

#### 3.5a — Playwright 確認頁面狀態

針對每個 fail 的 spec，用 Playwright MCP 導航到對應頁面並截 snapshot：

```
1. cy.visit('/路徑') → 用 Playwright MCP 確認頁面實際 DOM
2. 比對 spec 內的 selector 是否與 snapshot 相符
```

若 selector 與 DOM 完全相符 → 進入 3.5b 單獨重跑。
若 selector 找不到對應元素 → 修正 selector 後再進入 3.5b。

#### 3.5b — 失敗 spec 單獨重跑

```powershell
npm run test:e2e -- --spec "automation/e2e/specs/{失敗的-feature}.cy.ts"
```

**判定規則（依序套用）：**

| 條件 | 判定 | 處理 |
|------|------|------|
| 重跑後通過 | 環境/時序問題 | 更新 pipeline-state 為 pass，不建立 Bug |
| 重跑後錯誤訊息在 `loginAsAdmin()` 內（`expected input[type="password"] to be visible`）| session cache 重建時序 | 判定為環境問題，更新為 pass |
| 重跑後仍失敗，selector 在 Playwright snapshot 找不到 | 前端結構改動 | 修正 selector → 再跑一次 → 通過後更新 pass |
| 重跑後仍失敗，selector 正確但功能行為與預期不符 | 確認功能 Bug | 維持 fail，建立 Bug Report |
| 重跑後仍失敗，錯誤為已知 Bug（有 Bug ID）| 已登錄 Bug | 維持 fail，不重複建立 Bug |

#### 3.5c — 更新 pipeline-state

每個 fail TC 驗證完成後：

```powershell
# 若判定為環境問題（重跑通過）
.\scripts\pipeline\update-pipeline-state.ps1 -Feature "{feature}" -Qa5 "done" -TestsRun "done" -Pass {新N} -Pending {N} -Fail {新0}

# 若確認為功能 Bug（重跑仍失敗）
# 維持原 fail 數，不更新
```

#### 3.5d — 輸出重新驗證摘要

```
Step 3.5 失敗重新驗證完成

| Feature     | TC ID      | 初次結果 | 重驗結果 | 判定          |
|-------------|------------|---------|---------|---------------|
| Endpoint 管理 | IT-DP-NEG-02 | ❌ fail | ❌ fail | 確認功能 Bug（前端缺 URL 驗證）|
| 授權管理    | TC-F14-01  | ❌ fail | ✅ pass | 環境暫時性問題  |
| 我的帳號    | TC-F20-01  | ❌ fail | ✅ pass | 環境暫時性問題  |
| Endpoint 管理 | TC-F13-01 | ❌ fail | ✅ pass | session cache 重建時序 |

重驗後：Pass +{N} / 確認 Bug {M} 個
```

重驗完成後，以最終結果重新評估：
- 確認 Bug 數 > 0 → `AUTOMATION_BLOCKED`，列出 Bug 清單
- 全部解除 → `AUTOMATION_OK`

---

## 狀態檔格式（qa-workspace/.pipeline-state.json）

```json
{
  "pipeline_id": "PIPE-RXCLM-20260622-001",
  "started_at": "2026-06-22T08:00:00+08:00",
  "last_updated": "2026-06-22T16:00:00+08:00",
  "scope": "all",
  "features": {
    "CA 機構": { "qa5": "done", "tests_run": "done", "pass": 5, "pending": 0, "fail": 0 },
    "Account 詳細": { "qa5": "done", "tests_run": "done", "pass": 4, "pending": 0, "fail": 0 }
  },
  "totals": { "pass": 37, "pending": 28, "fail": 0, "specs": 65, "playwright_verified": 37 },
  "pending_breakdown": {
    "legitimate_skip": {
      "count": 23,
      "features": ["匯入既有憑證(2)", "部署核准(2)", "我的帳號(2)"],
      "reason": "功能未上線、功能未開放、需工程師提供測試資料、或需確認 API intercept 方案"
    }
  }
}
```

Helper：`scripts/pipeline/update-pipeline-state.ps1`
