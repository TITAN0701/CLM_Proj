# AI-assisted Spec-Driven QA Automation

針對「RXCLM 憑證生命週期管理系統」的全流程 AI 協作 QA 框架。  
SIT：`http://192.168.0.122:19010`

---

## 流程總覽

```
Step 1 — 需求分析
  /PM-import → /QA-pipeline-spec → scenarios.md + test-cases.json

Step 2 — 自動化 + 執行
  /QA-pipeline-run → snapshot + .cy.ts + 執行測試

Step 3 — 報告
  /QA-pipeline-report → Google Sheets + Drive xlsx
```

---

## Slash Commands

### 主流程（使用者直接呼叫）

| 指令 | 用途 |
|------|------|
| `/QA-pipeline-spec` | 需求 → questions → scenarios → test-cases（串聯 QA-1、QA-clarify、QA-design） |
| `/QA-pipeline-run` | snapshot → .cy.ts → 執行測試 → 更新 pipeline-state（串聯 playwright-smoke-test、QA-5） |
| `/QA-pipeline-report` | Allure 產報 → Google Sheets 同步 → Google Drive xlsx 上傳（串聯 QA-6） |

### 維護工具（按需呼叫）

| 指令 | 用途 | 觸發時機 |
|------|------|---------|
| `/PM-import` | PM 需求轉入 pm-inbox | PM 填需求時 |
| `/PM-report` | 匯出 release-summary.docx | 報告需要 Word 版本時 |
| `/QA-knowledge-update` | 更新 qa-knowledge 知識庫 | 功能大改版、術語不一致時 |
| `/QA-bug-report` | 推送 Bug 到 GitHub Issues | 手動建立 Bug 單時 |
| `/check-project` | 環境健康檢查 | 環境異常或初次設定後 |
| `/project-init` | 初始化新專案 | 新專案一次性使用 |
| `/run-task` | 執行 current-task.md | 使用者填好任務清單後 |

> Pipeline 內部子步驟（QA-1、QA-clarify、QA-design、QA-5、playwright-smoke-test、QA-6）禁止直接呼叫。

---

## 常用指令

```powershell
npm run test:e2e                                                    # 執行全部 Cypress
npm run test:e2e -- --spec "automation/e2e/specs/accounts.cy.ts"   # 執行單一 spec
npm run sync:sheet                                                  # 同步 Google Sheets
node scripts/sheets/upload-to-drive.js                              # 上傳 xlsx 至 Drive
node scripts/sheets/auth-sheets.js                                  # token 過期時重新授權
```

---

## 報告產出

```
npm run sync:sheet              → Google Sheets（TC / Scenarios / Report / Risk Notes / Bugs）
node scripts/sheets/upload-to-drive.js → artifacts/generated/qa/{日期}-qa-report.xlsx
                                  → Google Drive：RXCLM > AI Suport文件
```

資料來源：`qa-workspace/.pipeline-state.json`（唯一來源）  
Spreadsheet ID：`1uK9k4O1gL_YiNbXolOITpVnYwzJHB0j-UunLjG0fV0g`

---

## AI 架構

```
┌──────────────────────────────────────────────────────┐
│  Claude Code                                          │
│  CLAUDE.md        行為規則、安全限制                  │
│  .claude/commands/ Slash Command 執行步驟             │
│  .claude/modules/  共用載入器（config / eval / mcp）  │
│  .claude/evals/    產出品質評分標準                   │
│  qa-knowledge/     測試策略、selector 規則、風險定義  │
│  memory/           跨對話持久記憶                     │
└──────────────────────────────────────────────────────┘
      │                   │                  │
Playwright MCP      Google Drive MCP    GitHub CLI (gh)
截圖 + snapshot      唯讀搜尋 Drive     推送 Bug Issues
```

AI 產出物每步自動評分：`SPEC_OK` / `SCENARIOS_OK` / `TC_OK` / `AUTOMATION_OK` / `REPORT_OK`  
`AUTOMATION_BLOCKED` 時強制停止，修正後才能繼續。

---

## 自動化核心

### 自動修正流程（Auto-Fix）

```
npm run test:e2e
  → run-cypress.js（json reporter 解析）
  → 失敗時自動呼叫 auto-fix.js
  → Playwright 登入 → 截 snapshot
  → inferFix() 規則比對修正 spec
  → 重跑 Cypress
  → artifacts/raw/auto-fix-summary.md
```

### TC 撰寫規則

- 每個 TC 必須有 `cy.visit()`
- 寫入操作用 `Date.now()` timestamp 命名，避免重複衝突
- 寫入操作結尾必須自我清理（新增後刪除）
- 刪除後驗證用 `cy.url().should('include', '/列表頁')`
- `beforeEach` 頁面確認一律用 `cy.url().should('include', '/路徑')`，不可用 `cy.contains('h2', '...')`

### it.skip 規則

- ✅ 合法：功能未上線 / 環境不支援 / 需特定 fixture（加 `[BLOCKED 原因]`）
- ❌ 不合法：selector 不確定、fixture 未建 — 先補截 snapshot 再判斷
- 🚫 禁止：`data-testid` selector（SIT DOM 未加入）

---

## 功能狀態（Pipeline PIPE-RXCLM-20260618-002）

> Pass **56** / Pending **15** / Fail **2**　　最後更新：2026-06-24

| Feature | Pass | Pending | Fail | 說明 |
|---------|:----:|:-------:|:----:|------|
| 儀表板 | 4 | 0 | 0 | ✅ 全通過 |
| 憑證列表 | 5 | 0 | 0 | ✅ 全通過 |
| 網域詳細 | 2 | 4 | 0 | 編輯/Tag/Renew/Endpoint 待 selector |
| Order 詳細 | 1 | 0 | 0 | ✅ 全通過 |
| 申請新憑證 | 3 | 1 | 0 | TC-F05-03 完整送出流程 skip |
| 匯入既有憑證 | 0 | 1 | 1 | TC-F06-01 需 PEM fixture；TC-F06-03 ❌ |
| ACME 帳號 | 1 | 0 | 0 | ✅ 全通過 |
| Account 詳細 | 6 | 0 | 1 | TC-F08-04 RXCA SIT 連線異常 ❌ |
| CA 機構管理 | 5 | 0 | 0 | ✅ 全通過（路由：/admin/providers） |
| DNS 機構 | 7 | 0 | 0 | ✅ 全通過 |
| Group 管理 | 3 | 0 | 0 | ✅ 全通過 |
| User 管理 | 6 | 0 | 0 | ✅ 全通過 |
| Endpoint 管理 | 2 | 0 | 0 | 核准/拒絕需 Pending 任務 |
| 授權管理 | 1 | 1 | 0 | TC-F14-02 需有效授權碼 |
| 部署核准 | 4 | 2 | 0 | 核准/拒絕需 Pending 任務 |
| 憑證掃描 | 1 | 1 | 0 | 觸發掃描需 Endpoint 連線 |
| 合規政策 | 1 | 1 | 0 | TC-F17-02 新增政策待 selector |
| 稽核紀錄 | 2 | 0 | 0 | ✅ 全通過 |
| 系統設定 | 1 | 2 | 0 | 修改設定值/SMTP 待 selector |
| 我的帳號 | 1 | 2 | 0 | 密碼修改謹慎執行 |

**待處理**

| 項目 | 影響 TC |
|------|--------|
| 準備有效 PEM fixture | TC-F06-01 |
| 確認 RXCA SIT 服務狀態 | TC-F08-04（BUG-AUTO-002） |
| 準備有效授權碼 fixture | TC-F14-02 |
| 環境有 Pending 部署任務 | TC-F15-02、TC-F15-03 |

---

## 切換新專案

執行 `/project-init`，輸入專案名稱、代號、SIT URL、帳密後自動清空並重設。

> 清空：`pm-inbox/`、`qa-workspace/specs/`、`automation/e2e/specs/*.cy.ts`、`artifacts/`  
> 保留：`scripts/`、`.claude/`、`qa-knowledge/`、`automation/e2e/flows/`
