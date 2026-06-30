# Playwright Smoke Test

> ⚠️ **Pipeline 內部子步驟** — 請勿直接呼叫。應使用 `/QA-pipeline-run`，由 pipeline 在 snapshot 不存在時自動載入此步驟。

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/mcp-fallback.md`

使用 Playwright MCP 自動登入系統，巡覽所有主要頁面並截圖。

頁面清單從 `automation/e2e/pages.md` 讀取。換系統時只需更新該檔案，不需修改此指令。

截圖分三類存放：
- 頁面截圖 → `artifacts/raw/screenshots/smoke/`
- Accessibility tree → `artifacts/raw/screenshots/snapshots/`
- Cypress 執行截圖 → `artifacts/raw/screenshots/cypress/`（由 Cypress 自動存入，此指令不處理）

## TodoWrite 任務追蹤（必須執行）

> 先讀 `.claude/modules/task-registry.md`，取得 `playwright-smoke-test` 的任務模板，**啟動時立即呼叫 TodoWrite 建立任務清單**（`{N}` 替換為 pages.md 解析出的實際頁面數）。進度更新規則見 task-registry.md 的通用規則與 `playwright-smoke-test` 專屬規則。

## Arguments

```txt
$ARGUMENTS
```

參數格式（可任意組合）：
- 不帶參數：讀 `.env` 的 `CYPRESS_BASE_URL` 作為目標系統
- 帶網址：`https://uat.example.com` — 使用指定網址作為目標系統
- 帶網址 + 帳密：`https://uat.example.com user@example.com password123`
- 帶路徑：`/admin/some-page` — 在標準頁面之外額外截這個路徑

## Steps

### Step 1 — 確認 Playwright MCP 可用

使用 `mcp__playwright__browser_navigate` 工具。如果工具不存在或無法呼叫，立即告知使用者：「Playwright MCP 無法連線，請確認 Claude Code MCP 設定後重啟 VSCode，再重新執行此指令。」直接結束，不繼續後續步驟。

### Step 2 — 讀取頁面清單

讀取 `automation/e2e/pages.md`，解析三個區塊的頁面表格：
- 登出狀態頁面
- 登入後頁面（後台）
- 前台頁面（frontdesk）

### Step 3 — 解析目標系統

從 `$ARGUMENTS` 判斷：

1. **有傳入 https:// 開頭的網址** → 使用該網址作為 `BASE_URL`
   - 若同時有帳密參數（第二、三個參數）→ 使用傳入的帳密
   - 若沒有帳密 → 讀 `.env` 的 `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`

2. **沒有傳入網址** → 讀 `.env` 取得 `CYPRESS_BASE_URL` 作為 `BASE_URL`，帳密讀 `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`

3. **有傳入 / 開頭的路徑** → 視為額外截圖頁面（Step 6 處理）

執行前告知使用者：「目標系統：{BASE_URL}，帳號：{email}，頁面數：{N} 頁」

### Step 4 — 建立截圖資料夾

```bash
mkdir -p artifacts/raw/screenshots/smoke
mkdir -p artifacts/raw/screenshots/snapshots
```

### Step 5 — 依序截圖所有頁面

依 `pages.md` 的順序執行，每個頁面：
1. 導覽到 `{BASE_URL}{路徑}`
2. 截全頁截圖（`fullPage: true`）→ 存到 `artifacts/raw/screenshots/smoke/smoke-{編號}-{名稱}.png`
3. 取 accessibility tree snapshot → 存到 `artifacts/raw/screenshots/snapshots/snapshot-{編號}-{名稱}.yml`

**執行範圍**：
- 只執行標題**不含「暫緩」**的區塊
- 標題含「暫緩」的區塊一律跳過，不截圖

**登入/登出規則**：
- 「登出狀態頁面」區塊：截圖前先登出（點頭像 → 登出）
- 「登入後頁面」區塊：先重新登入，再依序截圖
- 「前台頁面」區塊：維持登入狀態，依序截圖
- 若頁面路徑不存在（404）或被重導，記錄失敗並繼續

### Step 6 — 如果 $ARGUMENTS 有額外路徑，補充截圖

將 `/` 開頭的路徑參數各截一張，命名為 `smoke-extra-{slug}.png`。

### Step 7 — 回報結果

列出所有截圖檔案清單，格式如下：

```
✅ 截圖完成：N 張
📁 smoke 截圖：artifacts/raw/screenshots/smoke/
📁 snapshots：artifacts/raw/screenshots/snapshots/

| 檔案 | 頁面 | 狀態 |
|------|------|------|
| smoke-01-login.png | 登入頁 | ✅ |
...

⚠️  失敗項目（如有）：
- smoke-XX-xxx.png：失敗原因
```

## Rules

- 執行前必須先讀取 `automation/e2e/pages.md`，不使用指令內硬寫的頁面清單
- 允許所有操作：登入、點「開始測驗」/「開始檢測」、填寫並送出表單
- **測驗流程中每一題都必須點入作答並截圖 + snapshot，不可跳過任何一題**（強制）
- 截圖命名規則：`smoke-{編號}-{名稱}.png` / `snapshot-{編號}-{名稱}.yml`
- 截圖統一使用 `fullPage: true`
- 如果某頁面載入失敗（404 或跳轉），記錄為失敗但繼續執行其他頁面
- 截圖完成後**不要**關閉瀏覽器（保留給後續使用）
