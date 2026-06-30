# Architecture

本專案採用「PM inbox + QA/AI workspace」架構。

## Layers

```txt
PM Input Layer
        ↓
QA/AI Specification Layer
        ↓
Test Design Layer
        ↓
Automation Layer
        ↓
Execution & Report Layer
```

## 1. PM Input Layer

PM 只負責輸入客戶需求。

主要位置：

```txt
pm-inbox/{feature}.md
```

PM 不需要建立 QA/AI 工作資料夾，也不需要寫測試情境或自動化測試碼。

## 2. QA/AI Specification Layer

QA 或 AI 讀取 PM inbox 後，建立功能工作區。

主要位置：

```txt
qa-workspace/specs/{feature}/
```

主要文件：

```txt
README.md
spec.md
questions.md
scenarios.md
plan.md
tasks.md
```

此層的目標是把 PM 的初步需求整理成可驗收、可測試的規格。

## 3. Test Design Layer

AI 可根據已確認的 `spec.md` 與 `scenarios.md` 產生測試設計草稿。

主要位置：

```txt
artifacts/generated/qa/
```

主要產物：

```txt
test-plan.md
test-cases.json
risk-notes.md
```

QA 必須審核這些內容，確認後才能進入自動化。

## 4. Automation Layer

自動化測試碼由 QA 或工程師維護，AI 可以協助產生草稿。

主要位置：

```txt
automation/e2e/
automation/api/
automation/testdata/
```

建議拆分：

- specs：測試案例
- pages：Page Object 與 selector
- flows：跨頁流程
- fixtures：測試環境與登入狀態
- testdata：測試資料
- api clients：API 呼叫封裝

## 5. Execution & Report Layer

測試執行由 QA 或 CI 負責，AI 只負責根據 raw report 產生摘要。

主要位置：

```txt
artifacts/raw/
artifacts/generated/qa/test-report.md
artifacts/generated/qa/failure-analysis.md
artifacts/generated/pm/release-summary.md
```

規則：

- Pass / fail 必須來自測試框架或 CI。
- AI 不可自行創造測試結果。
- AI 報告需明確標示依據與風險。

## Data Flow

```txt
pm-inbox/{feature}.md
  ↓
qa-workspace/specs/{feature}/spec.md
  ↓
qa-workspace/specs/{feature}/questions.md
  ↓
qa-workspace/specs/{feature}/scenarios.md
  ↓
artifacts/generated/qa/test-cases.json
  ↓
automation/
  ↓
artifacts/raw/
  ↓
artifacts/generated/
```
