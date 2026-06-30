# QA Pipeline: Spec & Design

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/qa-knowledge-loader.md`、`.claude/modules/eval-loader.md`

依序執行 QA-1 → QA-clarify → QA-design，完整完成需求分析到測試案例設計。
原有指令內容不變，此 pipeline 只負責串聯與 gate 判斷。

Arguments:

```txt
$ARGUMENTS
```

## 預設行為（無需使用者確認）

- **未帶 feature 參數** → 掃描 pm-inbox，對所有有效需求依序執行
- **spec 已存在** → 跳過 QA-1 建檔，直接從 QA-clarify 繼續
- **遇到已完成 feature** → 僅執行評估，不重新產出（除非使用者明確要求重跑）

---

## Steps

### Step 1 — 執行 QA-1

載入並執行 `.claude/commands/QA-1-import-pm-request.md` 的所有步驟。

完成後執行 spec 評估：
- 結果為 `SPEC_INCOMPLETE` → **停止**，告知使用者補充 spec 後重新執行此 pipeline
- 結果為 `SPEC_OK` → 繼續 Step 2

### Step 2 — 執行 QA-clarify

載入並執行 `.claude/commands/QA-clarify.md` 的所有步驟。

完成後直接繼續，QA-clarify 不產生阻擋條件。

### Step 3 — 執行 QA-design

載入並執行 `.claude/commands/QA-design.md` 的所有步驟。

完成後執行 scenarios + test-cases 評估：
- 結果為 `SCENARIOS_INCOMPLETE` → **停止**，告知使用者後重新執行此 pipeline
- 結果為 `TC_INVALID` → **停止**，告知使用者修正後重新執行此 pipeline
- 全部通過 → 輸出完成摘要，建議執行 `/QA-pipeline-run`

---

## 完成摘要格式

```
QA Pipeline: Spec & Design 完成
Feature: {feature}
✅ Step 1 QA-1     — SPEC_OK
✅ Step 2 QA-clarify — 完成
✅ Step 3 QA-design  — SCENARIOS_OK / TC_OK
下一步：/QA-pipeline-run {feature}
```

> 💡 **Context 建議**：完成後請執行 `/compact`，再開新 session 執行 `/QA-pipeline-run`。
> 可減少 context 殘留，降低 token 消耗。
