# QA Backlog

> 跨 session 的待辦追蹤清單。
> 每次執行前從此清單挑選任務填入 `current-task.md`，完成後回來更新狀態。
>
> 狀態：`[ ]` 待辦 / `[~]` 進行中 / `[x]` 完成

---

## 🔴 高優先

- [ ] **修正 selector skip 矛盾描述** — `selector-policy.md`、`test-strategy.md`、`QA-5` 三份說法不一致，統一以 `test-strategy.md` 為準
- [ ] **修正 scenarios.md 模板格式** — `_template/scenarios.md` 格式與 `doc-format.md` Harness 解析規則不符，會導致解析失敗
- [ ] **統一 manual_result 規則** — `report-format.md` 與 `test-strategy.md` 重複定義，從 `test-strategy.md` 移除，改為引用 `report-format.md`

---

## 🟡 中優先

- [ ] **修正 QA-5 selector 範例** — `.parent()` 改為 `.next()`，與 CLAUDE.md 規定一致
- [ ] **補上 QA-5 test-cases.json 樣本的 automation_candidate 欄位**
- [ ] **修正 selector-policy.md 適用系統描述** — 頭部「wetpaint」改為「RXCLM」
- [ ] **修正 risk-rules.md High Risk 內容** — 描述對象改為 RXCLM，移除 wetpaint 系統描述
- [ ] **統一 report-format.md Sheet 數量說明** — 明確區分 Sheets（7 個）與 xlsx（11 個）
- [ ] **統一 PM 需求文件欄位格式** — `PM-import.md` 對齊 `doc-format.md` 的定義

---

## 🟢 低優先

- [ ] **修正 QA-6 拼字錯誤** — `AI Suport` → `AI Support`
- [ ] **補上 QA-knowledge-update.md 讀取清單** — 加入 `doc-format.md`、`task-writing-guide.md`
- [ ] **清除 eval-loader.md 已廢除引用** — 移除 `test-report.md`、`release-summary.md`
- [ ] **修正 doc-format.md Section 6 重複標題** — 移除多餘的 questions.md 項目
- [ ] **補上 _template/README.md 副檔名** — `test-cases` → `test-cases.json`

---

## 已完成

<!-- 完成的項目移到此區塊，格式：[x] 項目描述（完成日期） -->
