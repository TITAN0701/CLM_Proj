# Criteria: QA 品質評估維度

參考 vladfeigin/llm-agents-evaluation 的評估指標設計（Groundedness、Relevance、Coherence、Similarity），
以及 microsoft/LLM-Rubric 的多維度評分方法，定義適用於 QA 產出物的品質維度。

每個維度以 1–5 分評估，AI 對每個 rubric 項目套用對應維度打分。

---

## 品質維度定義

| 維度 | 說明 | 對應 vladfeigin |
|------|------|----------------|
| **Completeness（完整性）** | 產出物是否涵蓋應有的所有內容 | Relevance |
| **Consistency（一致性）** | 是否與流程上游產出物（spec → scenarios → TC）保持一致 | Groundedness |
| **Executability（可執行性）** | 產出物是否能被實際執行或驗收（TC 能跑、automation 能執行）| Coherence |
| **Traceability（可追蹤性）** | 每個產出物是否能追溯到 spec 或 scenarios 的依據 | Similarity |

---

## 各產出物的主要適用維度

| 產出物 | 最關鍵維度 |
|--------|----------|
| spec.md | Completeness（內容是否足夠讓 QA 作業）|
| scenarios.md | Completeness + Consistency（路徑夠不夠、對應 spec 否）|
| test-cases.json | Traceability + Executability（能追到 scenarios、步驟能執行）|
| automation (.cy.ts) | Executability + Consistency（selector 正確、無安全違規）|
| report | Consistency（Pass/Fail 來自執行結果，不是推斷）|

---

## 評分尺度

| 分數 | 說明 |
|------|------|
| 5 | 完全達標，無缺失 |
| 4 | 輕微缺失，不影響後續步驟 |
| 3 | 中度缺失，需補充但可繼續 |
| 2 | 明顯缺失，後續步驟品質受影響 |
| 1 | 嚴重缺失，必須修正才能繼續 |

分數 ≤ 2 的高權重維度 → 觸發 `flow-gates.md` 的阻擋條件。
