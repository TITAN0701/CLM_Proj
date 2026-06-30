# Module: Structure Policy

此模組定義 `.claude/` 各層與 `CLAUDE.md` 的內容歸屬規則。
AI 在新增檔案、決定內容放置位置、或修改現有檔案前，必須先載入此模組。

## 使用方式

在任何涉及新增或移動 `.claude/` 檔案的操作前：
「載入 `.claude/modules/structure-policy.md`，確認目標層級正確後再執行」

---

## 各層歸屬規則

### CLAUDE.md — 只放規則與永久參照

**放什麼：**
- AI 行為約束（不可做的事、必須確認才能做的事）
- 安全限制（Git 高風險指令、禁止寫入的憑證）
- 永久有效的環境參照（SIT URL、env var 名稱、外部工具 token 路徑）
- 目錄結構（AI 操作檔案時需要）
- Slash Commands 概覽表（一行一指令，無細節）
- 各層的「詳見 X 檔案」一行指引

**不放什麼：**
- 操作步驟或流程細節（→ commands/）
- 測試資料、帳號清單、模組對照表（→ docs/test-data-reference.md）
- 會過期的靜態快照（→ 改成「執行 /check-project」）
- 特定 command 的執行行為定義（→ commands/）

---

### .claude/commands/ — 每個 slash command 的執行步驟

**放什麼：**
- 每個 `/指令` 的逐步執行流程
- 該 command 的輸入/輸出定義
- 該 command 專屬的判斷邏輯
- 清空/保留範圍定義（如 /project-init）
- 欄位說明表（如 /project-init 的初始化問題）

**不放什麼：**
- 跨 command 共用邏輯（→ modules/）
- 品質評分標準（→ evals/）

**Commands 三層分類（AI 必須遵守）：**

| 層級 | 說明 | AI 行為 |
|------|------|---------|
| **主流程** | QA-pipeline-spec / run / report | 可直接執行 |
| **維護工具** | PM-import、PM-report、QA-knowledge-update、QA-bug-report、check-project、project-init、run-task | 可直接執行 |
| **Pipeline 內部子步驟** | QA-1、QA-clarify、QA-design、QA-5（無 --page）、playwright-smoke-test、QA-6 | **禁止直接呼叫，只由 pipeline 載入** |

**規則更新同步原則：**
- 新規則只寫在對應的 **pipeline command**（主流程層）
- 子步驟 command 內容有衝突時，以 pipeline command 為準
- 子步驟 command 頭部必須有 `> ⚠️ Pipeline 內部子步驟` 警告標記

---

### .claude/evals/ — 每種產出物的品質評分標準

**放什麼：**
- 每種 AI 產出物（spec.md、scenarios.md、test-cases.json、.cy.ts、reports）的通過/失敗標準
- 評分結果代碼定義（如 `TC_OK`、`AUTOMATION_BLOCKED`）
- 對應的輸出格式範例

**不放什麼：**
- 執行步驟（→ commands/）
- 測試資料（→ docs/test-data-reference.md）

---

### .claude/modules/ — 跨 command 共用邏輯

**放什麼：**
- 跨多個 commands 都會呼叫的載入邏輯（config-loader、eval-loader、qa-knowledge-loader）
- 環境 fallback 邏輯（mcp-fallback）
- 框架結構規則（本文件 structure-policy）
- 各 command 的 TodoWrite 任務模板（task-registry）

**不放什麼：**
- 單一 command 專用的步驟（→ commands/）
- 品質評分標準（→ evals/）

---

### qa-knowledge/ — QA 方法論知識庫

**放什麼：**
- Selector 選用規則與優先順序（selector-policy.md）
- 測試策略與分類方式（test-strategy.md）
- 風險等級定義 HIGH/MED/LOW（risk-rules.md）
- 術語表（glossary.md）
- **TC 執行狀態定義（pass / fail / skip 判定條件）→ `test-strategy.md` 的「TC 執行狀態定義」區塊為唯一來源**

**不放什麼：**
- 測試資料（→ docs/test-data-reference.md）
- 執行結果（→ qa-workspace/specs/{feature}/execution-results.json）

**歸屬規則（防止分散）：**
- pass / fail / skip 的判定條件 → **只在 `test-strategy.md`**，pipeline command 引用但不重複定義
- `legitimate_skip` 白名單的「哪些 feature 在名單內」→ `pipeline-state.json` 動態維護
- `legitimate_skip` 的「白名單判定邏輯」→ `QA-pipeline-run.md` Step 0.5（執行流程層）

---

### docs/ — 人類閱讀用的文件

**放什麼：**
- 測試個案參考資料（test-data-reference.md）：userId 清單、年齡模組對照表
- 常用指令參考（commands-reference.md）：PowerShell 操作清單
- 架構說明（architecture.md、architecture-improvement.md）
- 環境設定指引

**不放什麼：**
- AI 執行時需即時讀取的規則（→ CLAUDE.md 或 modules/）
- 評估文件（→ modules/structure-policy.md 或 memory）

---

## 尚未完成的分類移動（待執行）

| # | 目前在 | 應移至 | 優先 | 狀態 |
|---|--------|--------|------|------|
| 1 | CLAUDE.md — Playwright userId 清單 + 年齡模組對照表 | docs/test-data-reference.md | 🔴 高 | ⏳ 待執行 |
| 2 | CLAUDE.md — 切換新專案步驟 + 清空/保留範圍 | commands/project-init.md | 🟡 中 | ⏳ 待執行 |
| 3 | CLAUDE.md — 常用指令 PowerShell 清單 | docs/commands-reference.md | 🟡 中 | ⏳ 待執行 |
| 4 | CLAUDE.md — 核心流程箭頭細節 | 精簡為 3 行概覽 | 🟡 中 | ⏳ 待執行 |
| 5 | CLAUDE.md — 架構重點五層描述 | docs/architecture.md | 🟢 低 | ⏳ 待執行 |

---

## 檢查清單（新增檔案前必看）

- [ ] 這個內容是「規則/約束」還是「步驟/資料」？
- [ ] 它會被多個 command 用到，還是只有一個？
- [ ] AI 每次對話都需要知道，還是只有特定 command 執行時才需要？
- [ ] 它會隨時間過期嗎？如果會，不應放在 CLAUDE.md
