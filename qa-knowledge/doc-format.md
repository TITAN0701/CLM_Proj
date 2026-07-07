# Document Format Policy

此文件定義本專案所有文件的格式規範，以 **harness 觀點** 為核心：
每份文件都是 AI pipeline 的輸入或輸出，格式錯誤會直接導致解析失敗或資料斷鏈。

**AI 產出任何文件前必須先查此文件，確認格式符合規範。**

> 任務描述的撰寫規範（current-task.md 怎麼填）→ 詳見 `qa-knowledge/task-writing-guide.md`

---

## 文件全覽（依 pipeline 流向排列）

```
[PM 填入]              [AI 產出]                     [AI 產出]              [腳本讀取]
pm-inbox/*.md  →  spec.md + questions.md  →  scenarios.md  →  test-cases.json  →  .cy.ts
                                                                                    ↓
                                                                          pipeline-state.json
                                                                                    ↓
                                                                          sync-to-sheet.js
                                                                          upload-to-drive.js
```

每份文件的格式若偏離規範，下游腳本會靜默地讀到空資料或解析出錯誤欄位，不一定會報錯。

---

## 1. PM 需求文件（pm-inbox/*.md）

**消費者**：`QA-1-import-pm-request`（AI 讀取並拆分需求）

### 命名規則

```txt
pm-inbox/release-2026-05.md
pm-inbox/sprint-12-requirements.md
pm-inbox/customer-feedback-2026-q2.md
```

### 必要區塊

```markdown
# 文件標題

## 基本資訊
- 來源:
- 產品/模組:
- 版本/時程:
- PM:
- 狀態:

## 背景與目標

## 需求項目

### 需求 1: 功能名稱

#### 使用者故事
身為某類使用者，我想要完成某件事，以便達成某個目的。

#### 功能說明
- 使用者可以做什麼
- 系統需要回應什麼
- 重要限制或商業規則

#### 驗收條件
- 給定某個前提，當使用者執行某個操作，則系統應該產生某個結果

#### PM 補充
- 尚未確認的內容標記「待確認」
- 不確定是否要做的標記「暫不納入」

## 不在本次範圍

## 參考資料
- Ticket:
- 設計稿:
```

### Harness 限制

- AI 解析時依 `### 需求 N:` 作為需求分界點，缺少此層級標題 → 整份文件視為單一需求
- `#### 驗收條件` 必須存在，否則 `QA-design` 無法產出 Given/When/Then
- **PM 不需提供 selector、API contract、TC 格式**；提供了也不影響解析，AI 會忽略

---

## 2. spec.md

**消費者**：`QA-design`（AI 讀取並產出 scenarios.md + test-cases.json）

**模板路徑**：`qa-workspace/specs/_template/spec.md`

### 命名與位置

```txt
qa-workspace/specs/{feature}/spec.md
```

### 必要區塊（順序固定）

```markdown
# Feature: {FEATURE_NAME}

## PM Inbox Source
- Source file: {SOURCE_PATH}
- Requirement: {REQUIREMENT_TITLE}

## Customer Request
## Background
## Business Goal
## User Roles
## Scope
### In Scope
### Out of Scope
## Acceptance Criteria
## Business Rules
## Error Messages
## Dependencies
## Open Questions
```

### Harness 限制

- `## Acceptance Criteria` 是 `QA-design` 產出 scenarios 的主要來源，內容空白 → scenarios 只有架構無內容
- `## Open Questions` 連結到 questions.md，AI 不從 spec.md 直接解析問題清單
- spec.md 是人讀規格，不是腳本解析目標，格式偏差影響的是 AI 理解品質，不是腳本執行

---

## 3. questions.md

**消費者**：`QA-clarify`（AI 讀取並生成釐清問題）、PM 填寫回答

**模板路徑**：`qa-workspace/specs/_template/questions.md`

### 必要區塊

```markdown
# QA 釐清備忘 - {REQUIREMENT_TITLE}

## 待釐清項目

- Q1: 問題描述（影響測試範圍）
- Q2: 問題描述（影響驗收條件）

## 已確認項目

- Source requirement: {REQUIREMENT_TITLE}
- User story: {STORY}
- A1: PM 回答
```

### Harness 限制

- `## 待釐清項目` 下的清單 AI 不解析為結構化資料，純文字提示使用；格式自由
- questions.md 不被任何腳本讀取，只被 AI 讀取；格式偏差不影響腳本

---

## 4. scenarios.md

**消費者**：`sync-to-sheet.js`、`upload-to-drive.js`（解析 Given/When/Then 填入 Scenarios sheet 與合併檢視）

**模板路徑**：`qa-workspace/specs/_template/scenarios.md`

### 格式（嚴格）

```markdown
## F01 — 功能名稱（/route）

### S01-01 情境標題
- **Given** 初始條件
- **When** 執行動作
- **Then** 預期結果
- **And** 補充條件（選填）

### S01-02 下一個情境
- **Given** ...
- **When** ...
- **Then** ...
```

### Harness 解析規則

| 元素 | 解析結果 | 錯誤範例 |
|------|---------|---------|
| `## FXX — 名稱` | Feature 分組 | `## 功能名稱`（缺 FXX prefix → 無法識別 feature） |
| `### SXX-XX 標題` | SC ID + 情境標題 | `### 情境一`（缺 ID → sc_ref 無法對應 TC） |
| `**Given**` / `**When**` / `**Then**` | 三欄內容 | `Given:` 無粗體 → 解析失敗，合併檢視欄位空白 |

### Harness 限制

- SC ID 格式必須為 `S\d{2}-\d{2}`（如 `S01-01`），否則 `test-cases.json` 的 `sc_ref` 對不到
- 支援三種 Given/When/Then 格式：`**Given**: text`、`**Given** text`、`- **Given** text`
- Feature header 的 `（/route）` 是選填，有無不影響解析

---

## 5. test-cases.json

**消費者**：`sync-to-sheet.js`、`upload-to-drive.js`、`QA-5`（產出 .cy.ts）

### 位置

```txt
qa-workspace/specs/{feature}/test-cases.json
```

### Schema（頂層陣列，非物件包裝）

```json
[
  {
    "id": "TC-F01-01",
    "feature": "功能名稱",
    "scenario": "S01-01",
    "sc_ref": "S01-01",
    "title": "測試案例標題",
    "priority": "P1",
    "type": "smoke|functional|negative",
    "preconditions": ["前置條件1"],
    "steps": ["步驟1", "步驟2"],
    "expected": "預期結果描述",
    "tags": [],
    "status": "pending",
    "manual_result": "",
    "automation_candidate": true
  }
]
```

### 欄位規則

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 格式 `TC-F{NN}-{NN}`，唯一 |
| `feature` | string | ✅ | 與 scenarios.md Feature header 一致 |
| `scenario` | string | ✅ | 同 sc_ref |
| `sc_ref` | string | ✅ | 對應 scenarios.md 的 `SXX-XX`，合併檢視查 Given/When/Then 用 |
| `title` | string | ✅ | |
| `priority` | string | ✅ | `P1` / `P2` / `P3` |
| `type` | string | ✅ | `smoke` / `functional` / `negative` |
| `preconditions` | array | ✅ | 空陣列可 |
| `steps` | array | ✅ | 空陣列可 |
| `expected` | string | ✅ | |
| `status` | string | ✅ | `pending`（預設）|
| `manual_result` | string | ✅ | 預設空字串，不被 Cypress 覆蓋 |
| `automation_candidate` | boolean | ⚠️ | 缺少 → 合併檢視顯示 `⚠️`；`false` → 不產出 `.cy.ts` |

### Harness 限制

- `sc_ref` 缺少或與 scenarios.md SC ID 不符 → 合併檢視 Given/When/Then 欄位空白
- 頂層必須是陣列（`[...]`），若包在物件內（`{"cases": [...]}`）→ 腳本讀取失敗
- `manual_result` 填寫後不會被任何腳本覆蓋，只能人工修改

---

## 6. questions.md → plan.md → tasks.md（輔助文件）

**消費者**：AI 讀取、人讀，不被腳本解析

這三份文件格式自由，模板提供最低結構，偏差不影響 pipeline 執行。

| 文件 | 用途 | 格式要求 |
|------|------|---------|
| `questions.md` | QA 釐清問題 + PM 回答 | 自由，建議維持「待釐清 / 已確認」兩區塊 |
| `plan.md` | 測試範圍與風險說明 | 自由 |
| `tasks.md` | QA / Automation / PM 分工 checklist | 建議用 `- [ ]` checkbox 格式 |

---

## 7. pipeline-state.json

**消費者**：`sync-to-sheet.js`、`upload-to-drive.js`、`update-pipeline-state.ps1`

### 位置

```txt
qa-workspace/.pipeline-state.json
```

### Schema

```json
{
  "pipeline_id": "2026-07-07-001",
  "started_at": "2026-07-07T10:00:00+08:00",
  "last_updated": "2026-07-07T10:30:00+08:00",
  "scope": "all",
  "features": {
    "feature-name": {
      "qa5": "done|pending",
      "tests_run": "done|pending",
      "pass": 0,
      "pending": 0,
      "fail": 0
    }
  },
  "totals": {
    "pass": 0,
    "pending": 0,
    "fail": 0,
    "specs": 0
  },
  "tc_results": {
    "TC-F01-01": "pass|fail|pending"
  }
}
```

### Harness 限制

- **必須用 .NET UTF-8 encoding 讀寫**，`Out-File` 產生 UTF-16 → 中文亂碼
- `tc_results` 是腳本讀取 pass/fail 的唯一來源，缺少此欄位 → Failures 分頁空白
- `totals` 由 `update-pipeline-state.ps1 -Finalize` 自動計算，不可手動填錯

---

## 8. Bug 報告（artifacts/generated/qa/bugs/*.md）

**消費者**：`buildBugMap()`（`qa-data.js`）→ 合併檢視 Bug 欄、Failures 分頁

### 命名規則

```txt
自動產出：BUG-AUTO-{TC ID}-{YYYY-MM-DD}.md
手動建立：BUG-{序號}-{簡述}.md
```

### 必要欄位（YAML frontmatter 或 Markdown 標題格式）

```markdown
# BUG-001 標題摘要

- **Bug ID**: BUG-001
- **狀態**: Open | Closed(YYYY-MM-DD)
- **嚴重程度**: Critical | High | Medium | Low
- **受影響功能**: 功能名稱
- **測試案例**: TC-F01-01
- **日期**: YYYY-MM-DD

## 問題描述

## 重現步驟

## 預期結果

## 實際結果
```

### Harness 限制

- `狀態: Open` → 出現在合併檢視 Bug 欄 + Failures 分頁
- `狀態: Closed(...)` → 從合併檢視 Bug 欄過濾掉，但保留在 Bug Reports 分頁
- **路徑錯誤**（如 `scripts/artifacts/...`）→ `buildBugMap()` 讀不到，報告中消失
- `TC-UNKNOWN` 禁止作為測試案例 ID

---

## 9. risk-notes.md

**消費者**：`sync-to-sheet.js`、`upload-to-drive.js`

### 位置

```txt
artifacts/generated/qa/risk-notes.md
```

### 格式

```markdown
## {Feature 名稱}

| 風險等級 | 影響範圍 | 建議 Owner | 建議 Release |
|---------|---------|-----------|-------------|
| HIGH | ... | QA | Block |
| MED | ... | PM | Monitor |
```

### Harness 限制

- 腳本依 `## 標題` 切分 feature，缺少 `##` header → 所有風險合併為一個 feature
- 風險等級只有 `HIGH` / `MED` / `LOW` 三值，其他值不影響腳本但報告顯示會不一致

---

## 跨文件一致性規則

| 規則 | 說明 |
|------|------|
| Feature 名稱一致 | `test-cases.json` 的 `feature` 欄、scenarios.md 的 Feature header、pipeline-state `features` key，三者必須一致 |
| SC ID 對應 | `test-cases.json` 的 `sc_ref` 必須能在 scenarios.md 找到對應的 `### SXX-XX` |
| TC ID 唯一 | 所有 feature 的 TC ID 不可重複，格式 `TC-F{NN}-{NN}` |
| Bug TC ID | Bug 報告的「測試案例」必須是真實存在的 TC ID 或 IT ID |

---

## 文件變更影響矩陣

| 變更什麼 | 影響哪裡 | 必須同步更新 |
|---------|---------|------------|
| scenarios.md SC ID 改名 | test-cases.json sc_ref 失效 | test-cases.json 所有 sc_ref |
| test-cases.json 新增 TC | pipeline-state 無此 TC 紀錄 | 跑一次 `/QA-pipeline-run` 更新 tc_results |
| Feature 資料夾改名 | pipeline-state features key 失效 | update-pipeline-state.ps1 重新寫入 |
| Bug 報告狀態改為 Closed | 合併檢視 Bug 欄自動消失（正常） | 無需額外操作 |
| scenarios.md 新增情境 | Scenarios sheet 有新資料，合併檢視 SC ID 找不到 TC | 在 test-cases.json 補對應 TC |
