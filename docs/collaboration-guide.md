# PM / QA / AI Collaboration Guide

此文件定義 PM、QA、工程師與 AI 的分工。

## Role Ownership

| Role | Ownership |
|---|---|
| PM | 客戶原始需求、需求背景、期望結果、已知內容、待確認問題 |
| QA | 需求可測性、測試情境、測試案例、風險、執行判斷 |
| AI | 文件整理草稿、問題清單、測試設計草稿、自動化草稿、報告摘要 |
| Engineer | 技術限制、API contract、selector、測試環境、code review |

## PM Scope

PM 只需要接觸：

```txt
pm-inbox/{feature}.md
pm-inbox/{release-or-sprint}.md
```

PM 不需要建立：

```txt
qa-workspace/specs/{feature}/
```

PM 也不需要寫：

- `spec.md`
- `scenarios.md`
- `plan.md`
- `tasks.md`
- `test-cases.json`
- 自動化測試碼

## QA Scope

QA 負責把 PM inbox 需求轉成可測試工作項目。

QA 會接觸：

```txt
qa-workspace/specs/{feature}/spec.md
qa-workspace/specs/{feature}/questions.md
qa-workspace/specs/{feature}/scenarios.md
artifacts/generated/qa/test-cases.json
artifacts/generated/qa/test-plan.md
artifacts/generated/qa/risk-notes.md
```

## AI Scope

AI 適合做：

- 根據 PM inbox 整理 `spec.md` 草稿
- 根據 `spec.md` 產生 `questions.md`
- 根據 PM answer 產生 `scenarios.md`
- 產生 `test-cases.json` 與 `test-plan.md`
- 產生自動化測試草稿
- 根據 raw report 產生測試報告摘要

AI 不應該做：

- 自行決定未確認的商業規則
- 自行判定 pass / fail
- 未經 SDET review 直接合併測試碼
- 使用正式帳密或敏感資料

## Workflow

```txt
1. PM 將客戶需求紀錄寫到 pm-inbox/{feature}.md，或整理成一份批次需求文件
2. QA/AI 判斷是否需要拆成多個 feature
3. QA 執行 scripts/qa-workspace/new-feature-from-inbox.ps1
4. QA 預覽 PM 需求，確認後輸入 YES
5. 系統建立 qa-workspace/specs/{feature}/
6. QA/AI 根據 PM inbox 整理 spec.md
7. QA/AI 產生 questions.md（QA Assumption，不等 PM）
8. QA/AI 產生 scenarios.md 與測試設計
9. QA 審核測試案例
10. SDET 決定是否進入自動化
12. CI 執行測試
13. AI 根據 raw report 產生報告
```

## QA Assumption Rule

`questions.md` 是 QA 內部備忘，PM 不需填寫。

QA 對不確定的需求自行填入假設值（QA Assumption），讓流程繼續推進。若假設後來驗證有誤，再更新 `spec.md` 與 `scenarios.md`。
