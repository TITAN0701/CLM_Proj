# Check Project Structure

快速檢查專案整體檔案結構與健康狀態。**只用 Glob 掃描路徑，不讀檔案內容，最小化 token 消耗。**

## Arguments

```txt
$ARGUMENTS
```

- 不帶參數：完整檢查所有區塊
- `pm`：只檢查 PM Inbox 文件與 PM 產出
- `qa`：只檢查 QA 相關資料夾
- `automation`：只檢查自動化程式碼
- `specs`：只檢查 spec 文件
- `artifacts`：只檢查產出物

## Steps

### Step 1 — 決定掃描範圍

依 `$ARGUMENTS` 決定要掃描哪些區塊（見下方區塊清單）。無參數則掃全部。

- `pm`：只掃 PM Inbox + `artifacts/generated/pm/`
- `qa`：只掃 `qa-workspace/specs/` + `qa-knowledge/` + `artifacts/generated/qa/`
- `automation`：只掃 `automation/e2e/` + `automation/api/`
- `specs`：只掃 `qa-workspace/specs/`
- `artifacts`：只掃 `artifacts/`

### Step 2 — 用 Glob 掃描（禁止用 Read 讀取任何檔案）

針對每個區塊執行 Glob，只收集檔案路徑清單。

#### 區塊清單

| 區塊 | Glob Pattern | 說明 |
|------|-------------|------|
| PM Inbox | `pm-inbox/**/*` | PM 需求文件 |
| QA Specs | `qa-workspace/specs/**/*` | 功能 spec 與問題 |
| QA Knowledge | `qa-knowledge/**/*` | 策略、規則知識庫 |
| Test Cases | `artifacts/generated/qa/**/*` | 產出的測試案例 |
| Automation E2E | `automation/e2e/**/*` | Cypress 測試程式碼 |
| Automation API | `automation/api/**/*` | API 測試 |
| Fixtures | `automation/e2e/fixtures/**/*` | 測試資料 |
| Screenshots | `artifacts/raw/cypress/screenshots/**/*` | 截圖 |
| Scripts | `scripts/**/*` | 工具腳本 |
| Config | `*.json,*.env*,.claude/**/*` | 設定檔 |

### Step 3 — 分析並回報（純推斷，不讀內容）

只根據**檔案是否存在**來判斷：

#### 3a — 功能對應矩陣

列出在 `qa-workspace/specs/` 下找到的每個功能資料夾，並標記各階段完成狀態：

```
功能名稱 | spec.md | questions.md | scenarios.md | test-cases | automation
---------|---------|--------------|--------------|------------|----------
forgot-password | ✅ | ✅ | ✅ | ✅ | ✅
account-register | ✅ | ✅ | ❌ | ❌ | ✅
...
```

判斷規則（只看有無檔案）：
- `spec.md` 存在 → ✅
- `questions.md` 存在 → ✅
- `scenarios.md` 存在 → ✅
- `qa-workspace/specs/{feature}/test-cases.json` 存在 → ✅
- `automation/e2e/specs/` 下有對應 `.cy.ts` → ✅

#### 3b — 缺少的階段（只列 ❌ 的部分）

```
⚠️  缺少的項目：
- account-register：scenarios.md、test-cases
- ...
```

#### 3c — 截圖狀況

列出 `artifacts/raw/cypress/screenshots/` 下的檔案數量與最新幾個。

#### 3d — 快速統計

```
📊 專案快照（{日期}）
- PM Inbox 文件：N 個
- 功能 Spec：N 個
- 自動化測試：N 個 .cy.ts
- API 測試：N 個 .py
- 截圖：N 張
- 最近截圖：{最後幾個檔名}
```

### Step 4 — 建議下一步（最多 3 條）

根據缺少的階段，推薦最優先要做的事：

```
💡 建議：
1. /QA-design account-register — scenarios.md 尚未產出
2. /QA-design card-matching — test-cases 尚未產出
3. ...
```

## Rules

- **絕對不用 Read 讀取任何檔案內容** — 只能用 Glob 掃路徑
- **不用 Grep 搜尋內容** — 只看檔案存不存在
- **不呼叫 Playwright MCP** — 純離線分析
- 整個指令執行過程中 Glob 呼叫次數上限：**10 次**
- 回報格式用 Markdown 表格，簡潔為主
