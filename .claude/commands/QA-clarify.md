# QA Clarify

> ⚠️ **Pipeline 內部子步驟** — 請勿直接呼叫。應使用 `/QA-pipeline-spec`，由 pipeline 自動載入此步驟。

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/qa-knowledge-loader.md`

QA 整理對某個 feature 尚待釐清的假設與不確定點，存入 questions.md 作為內部備忘。

## Goal

讀取：

```txt
qa-workspace/specs/{feature}/spec.md
qa-knowledge/glossary.md
qa-knowledge/test-strategy.md
qa-knowledge/risk-rules.md
```

產出或更新：

```txt
qa-workspace/specs/{feature}/questions.md
```

Arguments:

```txt
$ARGUMENTS
```

## Rules

- 這是 QA 內部備忘，不是給 PM 填寫的表單
- 每個問題說明影響範圍（Impact）：會影響哪些測試或驗收標準
- 不確定的地方寫假設值（QA Assumption），讓後續 /QA-design 可以繼續推進
- 不要發明業務規則，只記錄「不確定」的地方
- 若已有填寫內容，保留既有紀錄

## Output Format

```md
# QA 釐清備忘

> QA 內部使用，記錄尚待確認的假設。來源：qa-workspace/specs/{feature}/spec.md

## 待釐清項目

1. 問題描述
   - Impact: 會影響哪些測試 / 驗收標準
   - QA Assumption: QA 暫時假設的答案（讓流程能繼續推進）

## 已確認項目

- 已確認的決策或規則
```
