# Feature: {{FEATURE_NAME}}

> Draft generated from PM inbox requirement "{{REQUIREMENT_TITLE}}". QA/AI should review and refine before automation.

## PM Inbox Source

- Source file: {{SOURCE_PATH}}
- Requirement: {{REQUIREMENT_TITLE}}

~~~md
{{SECTION_BODY}}
~~~

## Customer Request

{{STORY}}

## Background

此需求來自會員入口需求集合，目標是讓使用者可以完成「{{REQUIREMENT_TITLE}}」相關流程。

## Business Goal

- 支援會員入口的必要使用者流程。
- 降低使用者在登入、帳號存取或註冊入口上的阻塞。

## User Roles

- 一般使用者

## Scope

### In Scope

{{SCOPE_LINES}}

### Out of Scope

- PM 標示為暫不納入或尚未確認的內容。
- 未在此需求章節列出的延伸流程。

## Acceptance Criteria

{{ACCEPTANCE_LINES}}

## Business Rules

{{NOTE_LINES}}

## Error Messages

- 依驗收條件與 PM 回答確認。
- 若文案尚未確認，測試應先標記為待釐清，不應硬編碼斷言。

## Dependencies

- 測試環境登入入口 URL。
- 穩定 selector 或 data-testid。
- 可用測試資料。
- 若涉及 API 或通知寄送，需後端/API 文件或測試替身。

## Open Questions

- 請參考 questions.md。
