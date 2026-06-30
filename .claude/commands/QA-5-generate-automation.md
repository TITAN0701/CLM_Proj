# QA-5 Generate Automation

> ⚠️ **Pipeline 內部子步驟** — 請勿直接呼叫。應使用 `/QA-pipeline-run`，由 pipeline 自動載入此步驟。例外：帶 `--page` 參數時（單頁即時產出模式）可直接呼叫。

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/qa-knowledge-loader.md`、`.claude/modules/mcp-fallback.md`、`.claude/modules/eval-loader.md`

You are helping QA generate automation draft code.

## Goal

Read approved test cases and generate Cypress-first automation draft.

Input:

```txt
artifacts/generated/qa/test-cases.json
qa-workspace/specs/{feature}/scenarios.md
qa-knowledge/glossary.md
qa-knowledge/selector-policy.md
qa-knowledge/test-strategy.md
qa-knowledge/risk-rules.md
artifacts/raw/screenshots/snapshots/          ← Playwright DOM snapshot（若存在）
```

Output:

```txt
automation/e2e/specs/{feature}.cy.ts
automation/e2e/pages/
automation/e2e/flows/
automation/e2e/fixtures/
automation/api/tests/
automation/testdata/
```

Arguments:

```txt
$ARGUMENTS
```

## Steps（執行順序）

### Step 0 — 判斷執行模式

讀取 `$ARGUMENTS`：

- **帶 `--page` 參數**（如 `--page /admin/dns-providers --tc TC-F10 --spec admin-endpoints-dns.cy.ts`）
  → 進入「**單頁即時產出模式**」，執行 Step 0a → Step 0b → Step 0c，完成後跳至 Step 2
- **不帶 `--page`**
  → 進入「**批次產出模式**」，從 Step 1 開始執行

---

### Step 0a — 單頁即時產出：Playwright MCP 截 snapshot

使用 Playwright MCP 依序執行：

1. `mcp__playwright__browser_navigate` → `{CYPRESS_BASE_URL}{--page 的路徑}`
2. `mcp__playwright__browser_snapshot` → 取得完整 accessibility tree
3. 若頁面有**互動前置動作**（如需點按鈕展開表單），依序執行後再取一次 snapshot
   - 展開表單：點「新增」按鈕後再截
   - 類型切換：對每個主要類型各截一次（最多 3 種）

截圖存入：`artifacts/raw/screenshots/snapshots/snapshot-live-{slug}.yml`

### Step 0b — 單頁即時產出：分析 snapshot 決定 TC 範圍

從 snapshot 識別頁面結構，依下列規則決定要產出哪些 TC：

| 頁面元素 | 對應 TC 類型 |
|---------|------------|
| `table` 含多筆資料列 | 清單顯示 TC（驗欄位標題 + 現有資料） |
| 表單含 `textbox` / `combobox` | 新增 TC（自建自刪）+ 必填驗證 TC |
| `button "儲存" [disabled]` | 必填空白驗證 TC |
| `button "測試連線"` | 連線測試 TC（正向 + 負向各一） |
| `button "編輯"` / `button "刪除"` | 編輯 TC + 刪除 TC（自建自刪） |
| `combobox` 含多個 option（篩選用） | 篩選功能 TC |
| 表單 `combobox` 切換後欄位變化 | 類型切換欄位驗證 TC（逐一切換每個 option，驗對應欄位顯示/消失） |

**TC 命名規則：**
- TC ID 從 `--tc` 參數取前綴（如 `TC-F10`），流水號從現有 spec 最大號 +1 開始
- 描述格式：`{TC ID}: {動詞}{驗證對象}（{補充說明}）`

**類型切換 TC 寫法（DNS/CA 類型 combobox 標準模式）：**
```typescript
// 逐一切換每個 option，驗對應欄位顯示/消失
// Manual 類型 → API Token 消失；其他類型 → API Token 顯示
cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
cy.contains('API Token').should('not.exist');
cy.contains('類型 *').parent().find('select').select('Cloudflare');
cy.contains('API Token').should('be.visible');
// 其餘類型依 snapshot option 清單逐一驗證
```
- selector 固定用 `cy.contains('類型 *').parent().find('select')`（表單內 label 含星號）
- 列表頁篩選 combobox 用 `cy.get('main').contains('類型:').parent().find('select')`（label 不含星號，加 `main` 排除 navbar）

**寫入規則（TC 撰寫必遵守）：**
- 每個 TC 必須有 `cy.visit()`
- 寫入操作用 `Date.now()` timestamp 命名，避免衝突
- 寫入操作結尾必須自我清理（新增後刪除）
- Selector 只用 snapshot 確認存在的元素，不猜測
- 刪除後驗證用 `cy.url().should('include', '/列表頁')` 或 `cy.contains(name).should('not.exist')`
- **每個 TC 必須在關鍵操作結果出現後截圖**，命名格式 `{TC ID} {操作說明}`（TC ID 開頭，空格分隔）：
  ```typescript
  cy.contains('儲存成功').should('be.visible');
  cy.screenshot('TC-F10-02 新增成功');   // ✅ evidence-index 可識別
  ```
  不可用純中文命名（`cy.screenshot('新增成功')`）— evidence-index upsert 無法比對 TC ID

### Step 0c — 單頁即時產出：插入 spec + 同步 test-cases.json

**0c-1. 插入 spec**

將產出的 TC 區塊插入 `--spec` 指定的 `.cy.ts` 檔案最後一個 `});` 之前。

**0c-2. 同步寫入 test-cases.json**

對 Step 0b 產出的每個新 TC，補寫至 `qa-workspace/specs/rxclm-core/test-cases.json`：

1. Read 最新的 test-cases.json（避免覆蓋現有內容）
2. 對每個新 TC ID，若 JSON 中**尚未存在**該 ID，則 append 一筆：

```json
{
  "id": "{TC ID}",
  "feature": "{--tc 參數對應的中文 feature 名稱}",
  "scenario": "",
  "title": "{TC 標題（與 it() 描述一致）}",
  "priority": "P2",
  "type": "functional",
  "preconditions": ["已以 admin 身分登入"],
  "steps": [],
  "expected": "",
  "tags": [],
  "status": "pending",
  "sc_ref": ""
}
```

3. 若該 TC ID 已存在，跳過（不覆蓋）
4. Write 回 test-cases.json

**feature 名稱對照**（依 `--tc` 參數前綴判斷）：

| --tc 前綴 | feature 中文名稱 |
|-----------|----------------|
| TC-F01 | 儀表板 |
| TC-F02 | 憑證列表 |
| TC-F03 | 網域詳細 |
| TC-F04 | Order 詳細 |
| TC-F05 | 申請新憑證 |
| TC-F06 | 匯入既有憑證 |
| TC-F07 | ACME 帳號 |
| TC-F08 | Account 詳細 |
| TC-F09 | DNS 機構 |
| TC-F10 | Endpoint 管理 |
| TC-F11 | Group 管理 |
| TC-F12 | User 管理 |
| TC-F13 | 部署核准 |
| TC-F14 | 授權管理 |
| TC-F15 | 憑證掃描 |
| TC-F16 | 合規政策 |
| TC-F17 | 稽核紀錄 |
| TC-F18 | 系統設定 |
| TC-F19 | 我的帳號 |
| TC-F20 | 我的帳號 |

---

### Step 1 — 產出自動化草稿（.cy.ts）

依 Selector 抽取規則產出所有 feature 的 `.cy.ts`（見下方規則）。

### Step 2 — 自我評估

產出 .cy.ts 後，依序執行評估：

1. 對照 `.claude/evals/rubrics/automation.md` 逐項檢查每個產出檔案
2. 依 `.claude/evals/criteria/flow-gates.md` 判斷結果代碼
3. 依 `.claude/evals/benchmarks/qa-baseline.md` 確認 skip 比例是否超標
4. 輸出評估結果

若結果為 `AUTOMATION_BLOCKED`，**停止**，必須修正高權重違規後才繼續。

### Step 3 — 驗證所有產出檔案

讀取 `qa-knowledge/selector-policy.md` 的「Grep 掃描清單」，依表中每一個 Pattern 對 `automation/e2e/specs/` 執行 Grep（Context Rot 防護，不逐一 Read 整份檔案）。

僅對 **Grep 有命中的檔案** 才用 Read 讀取確認，逐一檢查：
- 無 `data-testid` selector
- 無 Tailwind/hash class（`box_shadow`、`bg-white` 等）
- 無法確認的 selector **已先嘗試用 Playwright MCP 補截 snapshot**，仍無法確認才寫 `it.skip()` + `[SDET TODO]`

確認無誤後才進入 Step 4。

### Step 4 — 確認執行環境

讀取 `.env` 檔案，確認：
- `CYPRESS_BASE_URL` 存在且非空白
- 值為有效 URL（以 `http://` 或 `https://` 開頭）

若 `CYPRESS_BASE_URL` 未設定或為空 → **停止，告知使用者「請先設定 .env 的 CYPRESS_BASE_URL 再繼續」，不執行測試**。

### Step 5 — 執行測試

環境確認正確後，執行：

```powershell
npm run test:e2e -- --spec "automation/e2e/specs/{feature}.cy.ts"
```

等待執行完成，觀察終端輸出，記錄：
- 總共執行幾個 TC
- 通過 / 失敗 / skip 各幾個
- 是否有環境錯誤（如 `cy.visit()` 404、`baseUrl` 未設定）

若出現**環境錯誤**（非功能失敗）→ 停止，告知使用者排除環境問題後重跑。

### Step 6 — 整理產物

執行完成後執行：

```powershell
.\scripts\refresh-qa-artifacts.ps1
```

### Step 7 — 回報執行結果

列出：
- 執行時間
- 通過 / 失敗 / skip 統計
- 失敗項目清單（TC ID + 失敗原因摘要）
- 建議下一步（`/QA-6-generate-report`）

---

## Rules

- Cypress is the default.
- Use pytest only for API/backend validation.
- **禁止使用 `cy.get('[data-testid="..."]')`** — SIT DOM 尚未加入 data-testid，詳見 qa-knowledge/selector-policy.md
- Do not use real credentials or production data.
- Generated code is draft and needs SDET review before execution.
- **宣告完成前必須依 `qa-knowledge/selector-policy.md` 的「Grep 掃描清單」批次掃描所有 .cy.ts**，只 Read 有命中的檔案（Context Rot 防護）。Pattern 維護在 selector-policy.md，不在此處重複。
- **`beforeEach` 頁面確認一律用 `cy.url().should('include', '/路徑')`**，禁止用 `cy.contains('h2/h1', '...')`。heading selector 不穩定，失敗會讓整個 describe 所有 TC 無法執行。
- **新增 describe 後必須同步更新 `run-cypress.js` 三處 `DESCRIBE_TO_FEATURE` map**（約第 34、308、588 行）。未登記 → BUG-AUTO 產出「未知功能」，evidence-index 截圖 feature 欄位也會空白。

### Selector 抽取規則

**Step 1 — 讀取 Playwright snapshot**

若 `artifacts/raw/screenshots/snapshots/` 存在，讀取與當前 feature 對應的 `.yml` snapshot 檔案，從 accessibility tree 抽取元素的 `id`、`placeholder`、穩定 `class`、按鈕文字、`href`。

**Step 2 — 依優先順序選用 selector**

`#id` > `.stable-class` > `input[placeholder]` > `cy.contains('button/a', '文字')` > `a[href]`

從 snapshot 找到的 selector 直接填入 `.cy.ts`，不猜測、不硬寫。

**Step 3 — snapshot 不存在或找不到對應元素**

先執行 `/playwright-smoke-test` 取得 snapshot 再重跑 QA-5。
若補截後仍找不到對應元素（系統入口確實不存在）→ 才寫 `it.skip()` + `[SDET TODO]`。
**不可因為 selector 不確定就直接寫 `it.skip()`**，詳見 `qa-knowledge/test-strategy.md`「TC 執行狀態定義」。

