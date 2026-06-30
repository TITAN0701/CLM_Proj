# Feature Document Format

此文件說明 QA/AI 工作資料夾中的文件格式。

PM 不需要直接建立這些文件。PM 只需要寫 `pm-inbox/{feature}.md`。

## Feature Folder

QA/AI 工作資料夾位置：

```txt
qa-workspace/specs/{feature-name}/
```

建議包含：

```txt
README.md
spec.md
questions.md
scenarios.md
plan.md
tasks.md
```

## README.md

用途：說明此功能目前狀態、負責人與下一步。

範例：

```md
# Feature: Forgot Password

## Owner

- PM:
- QA:
- Engineer:

## Status

| Item | Status |
|---|---|
| Spec | Draft |
| QA Review | Not Started |
| Test Case | Not Started |
| Automation | Not Started |

## Current Decision

- 客戶希望使用者可以透過 Email 自行重設密碼。

## Pending Questions

- 重設連結有效時間尚未確認。

## Next Step

- QA/AI 產生 questions.md。
```

## spec.md

用途：把 PM inbox 需求整理成可驗收、可測試的規格。

範例：

```md
# Feature: Forgot Password

## Customer Request

客戶希望使用者忘記密碼時，可以自己透過 Email 重設密碼。

## Background

目前使用者忘記密碼時，需要聯絡客服處理。

## Business Goal

降低客服處理忘記密碼案件的工作量。

## Scope

### In Scope

- 使用者可以輸入 Email 申請重設密碼。
- 使用者可以透過 Email 連結設定新密碼。

### Out of Scope

- 尚未確認。

## Acceptance Criteria

- 使用者可以送出忘記密碼申請。
- 使用者收到重設密碼信後，可以進入重設密碼頁。
- 使用者設定新密碼後，可以用新密碼登入。

## Business Rules

- 尚未確認。

## Error Messages

尚未確認。

## Open Questions

- 重設密碼連結有效時間是多久？
```

## questions.md

用途：QA/AI 回拋 PM 的待釐清問題。

範例：

```md
# QA 釐清備忘 - {feature}

## 待釐清項目

1. 重設密碼連結有效時間是多久？
   - Impact: 會影響有效連結與過期連結測試。
   - QA Assumption: 假設有效期為 24 小時，常見業界做法。

2. 使用者輸入未註冊 Email 時要顯示成功提示還是錯誤訊息？
   - Impact: 會影響錯誤訊息測試與帳號枚舉風險。
   - QA Assumption: 假設顯示成功提示（避免帳號枚舉），待 Playwright snapshot 確認。
```

QA 自行填入假設值，讓流程繼續推進，不需等 PM 回覆。

## scenarios.md

用途：把需求轉成測試情境。

範例：

```md
# Scenarios

## Scenario: 使用者送出忘記密碼申請

Given 使用者位於登入頁
When 使用者點擊忘記密碼
And 使用者輸入已註冊 Email
And 使用者送出申請
Then 系統應顯示申請已送出
```

## plan.md

用途：QA 測試計畫。

範例：

```md
# QA Plan

## Test Scope

- 忘記密碼申請
- 重設密碼連結
- 新密碼驗證

## Test Types

- E2E
- API
- Negative
- Regression

## Test Data

- 已註冊使用者 Email
- 可接收測試信件的 mailbox

## Risk

- 密碼重設是安全相關流程，token 規則需明確定義。
```

## tasks.md

用途：追蹤 PM、QA、工程師與 AI 的待辦。

範例：

```md
# Tasks

## PM

- [ ] 確認重設連結有效時間

## QA

- [ ] 審核 questions.md

## Engineering

- [ ] 確認測試環境 Email 設定

## AI

- [ ] 根據 spec.md 產生測試案例草稿
```
