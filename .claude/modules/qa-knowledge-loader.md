# Module: QA Knowledge Loader

此模組定義 QA command 執行前必須讀取的知識庫檔案。

## 使用方式

在 command 開頭加入：「先讀 `.claude/modules/qa-knowledge-loader.md` 載入知識庫」

## 必讀檔案

執行任何 QA 相關 command 前，讀取以下檔案（路徑來自 `config.json` 的 `knowledge.files`）：

```txt
qa-knowledge/glossary.md        ← 術語定義
qa-knowledge/selector-policy.md ← Selector 規則（含 data-testid 禁用說明）
qa-knowledge/test-strategy.md   ← 測試策略與可自動化判斷規則
qa-knowledge/risk-rules.md      ← 風險分級規則
```

## 讀取順序

1. `glossary.md` — 先建立術語理解
2. `selector-policy.md` — 確認 selector 限制
3. `test-strategy.md` — 確認測試策略
4. `risk-rules.md` — 確認風險分級

## 適用 Commands

- `/QA-clarify`
- `/QA-design`
- `/QA-5-generate-automation`
- `/QA-6-generate-report`
- `/QA-bug-report`
- `/QA-knowledge-update`
