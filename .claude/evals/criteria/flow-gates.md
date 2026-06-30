# Criteria: Flow Gates

根據 `metrics.md` 的維度評分結果，決定流程是否繼續、警告或阻擋。
評分邏輯參考 microsoft/LLM-Rubric 的多維度合併方法：先對每個維度評分，再合併判斷整體結果。

---

## 決策邏輯

```
Step 1：對照 rubrics/ 逐項評估
Step 2：依 metrics.md 的維度給每項評分（1–5）
Step 3：高權重項目有任何維度分數 ≤ 2 → 觸發阻擋
Step 4：輸出結果代碼 + 行動說明
```

---

## 結果代碼與阻擋條件

| 產出物 | 阻擋條件 | 結果代碼 | 行動 |
|--------|---------|---------|------|
| spec.md | 高權重項目 Completeness ≤ 2 | `SPEC_INCOMPLETE` | 停止，補充後再繼續 |
| scenarios.md | 高權重項目 Completeness 或 Consistency ≤ 2，且超過 2 項 | `SCENARIOS_INCOMPLETE` | 重新產出 |
| test-cases.json | 高權重項目任一維度 ≤ 2 | `TC_INVALID` | 修正後才繼續產 automation |
| .cy.ts / .py | 高權重項目 Executability ≤ 1（安全違規）| `AUTOMATION_BLOCKED` | 必須修正，不可提交 |
| test-report.md | Consistency ≤ 1（Pass/Fail 非來自執行結果）| `REPORT_INVALID` | 不產出報告 |
| release-summary.md | 同上 | `REPORT_INVALID` | 不產出報告 |

---

## 通過條件

| 結果代碼 | 條件 | 行動 |
|---------|------|------|
| `SPEC_OK` | 全部高權重維度 ≥ 3 | 繼續 |
| `SCENARIOS_OK` | 高權重 Completeness + Consistency ≥ 3 | 繼續 |
| `TC_OK` | 全部高權重維度 ≥ 3 | 繼續 |
| `AUTOMATION_OK` | 無安全違規，有 skip 則列出 SDET 清單 | 可提交 |
| `REPORT_OK` | Consistency = 5（來源確認）| 可交付 |

---

## 輸出格式

```
[產出物] Eval: {feature}
Completeness: 4/5 — 缺少邊界條件情境
Consistency:  5/5
Executability: 3/5 — 2 個 TC 步驟不足
Traceability: 5/5
結論: TC_OK（可繼續，建議補充邊界條件步驟）
```
