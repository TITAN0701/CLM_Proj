# Benchmarks: QA 品質基準

參考 microsoft/LLM-Rubric 的校準基準（calibration against human baseline）
與 vladfeigin 的 agent 變體比較概念，定義各產出物的「已知好範例」品質水準。

AI 評估時，對照此基準判斷「目前產出和好範例差多少」，而非只看是否超過最低門檻。

---

## 基準品質定義（各維度目標分數）

### spec.md

| 維度 | 目標分數 | 已知好範例的特徵 |
|------|---------|----------------|
| Completeness | 5 | 有明確範圍聲明、≥3 條 acceptance criteria、例外處理、角色說明 |
| Consistency | 5 | 術語與 glossary.md 一致 |
| Executability | 4 | 每條 AC 都是可驗證的陳述，非模糊描述 |
| Traceability | — | 不適用（spec 是起點） |

### scenarios.md

| 維度 | 目標分數 | 已知好範例的特徵 |
|------|---------|----------------|
| Completeness | 5 | Happy + Negative + Boundary 三類路徑都有，每條 AC 至少一個情境 |
| Consistency | 5 | 每個情境的 When 對應到 spec 的某條 AC |
| Executability | 4 | Given/When/Then 每段都是具體可操作的描述 |
| Traceability | 5 | 情境標題可對應到 spec 的 AC 編號 |

### test-cases.json

| 維度 | 目標分數 | 已知好範例的特徵 |
|------|---------|----------------|
| Completeness | 5 | 每個 TC 有 ID、steps（≥2）、expected_result、risk 等級、automation_candidate |
| Consistency | 5 | TC ID 格式統一（TC-{FEATURE}-{三位數}）|
| Executability | 5 | steps 描述具體，expected_result 可驗收 |
| Traceability | 5 | 每個 TC 標注對應的 scenario 編號 |

### automation (.cy.ts)

| 維度 | 目標分數 | 已知好範例的特徵 |
|------|---------|----------------|
| Completeness | 4 | skip 率 ≤ 30%，有 screenshot 呼叫 |
| Consistency | 5 | selector 來自 Playwright snapshot，無推斷 |
| Executability | 5 | 無 data-testid、無硬寫憑證/URL |
| Traceability | 4 | 每個 it() 標題含 TC ID |

### report

| 維度 | 目標分數 | 已知好範例的特徵 |
|------|---------|----------------|
| Completeness | 5 | 所有執行過的功能都有結果，無遺漏 |
| Consistency | 5 | Pass/Fail 100% 來自 execution-results.json |
| Executability | — | 不適用 |
| Traceability | 5 | 每個 Failed TC 有對應失敗原因，可追溯 |

---

## 比較方式

每次評估後，AI 輸出「目前分數 vs 基準分數」：

```
scenarios.md 品質比對：
Completeness: 3/5（基準 5）— 缺 Boundary path
Consistency:  5/5（基準 5）✅
Executability: 4/5（基準 4）✅
Traceability: 3/5（基準 5）— 情境未對應 AC 編號
整體距基準差距：2 項需改善
```

若整體低於基準 2 個維度以上 → 觸發 `flow-gates.md` 的對應阻擋條件。
