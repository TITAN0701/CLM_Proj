# Test Strategy

此文件定義 QA 設計測試案例時的優先順序與自動化判斷規則。
適用系統：國衛院學齡前兒童發展數位評估系統（wetpaint）

## Priority

測試優先順序：

1. 核心檢測流程（題目邏輯、AI 模組、影片錄製、結果顯示）
2. 資料正確性（身分證字號格式、年齡分層、CASEID 流水號）
3. 權限與帳號安全（登入、帳號停用、角色限制）
4. 觀察題組與重新錄製等特殊流程
5. 常見錯誤情境與邊界條件
6. 後台管理功能（帳號管理、孩童列表、題目管理）

## Automation Rule

適合優先自動化（automation_candidate: true）：

- 登入 / 帳號管理流程
- 表單驗證（身分證字號格式、必填欄位）
- 管理後台 UI 結構驗證（導覽列、欄位、搜尋）
- 頁面導覽與 URL 驗證
- API contract test（資料格式、HTTP 狀態碼）
- 明確輸入與輸出的 business rule（題目邏輯分層條件）

適合自動化（即使在「影片」類 feature 中也可自動化）：

- 錄製頁面的 **UI 文字比對**（提示詞、衣著說明、時長說明、注意事項等）— 不需啟動相機，用 `cy.contains()` 驗證即可
- 錄製頁面的 **DOM 元素存在性**（按鈕可見、輔助框可見等）— 不需啟動相機

不適合自動化（automation_candidate: false）：

- 需**啟動相機實際錄製**（mediaDevices API）的案例 — 如計時行為、最短錄製時長限制、錄製畫面品質
- 需 AI 模組實際分析完成才能驗證結果（observation-group 等外部非同步行為）
- 需人眼判斷視覺品質（影片畫質、輔助框比例、人臉對齊）
- 涉及「開始測驗 / 開始檢測」操作（SIT 環境限制）
- 非同步上傳等待外部 API 回應
- 需求尚未穩定或 QA Assumption 仍待驗證的功能

> ⚠️ 注意：gait-analysis、video-recording、verbal-expression 等 feature 中**同時存在可/不可自動化的 TC**，
> 判斷依據是「是否需要啟動相機」，不是整個 feature 的名稱。
> 請依每個 TC 的 `automation_candidate` 欄位判斷，不可套用 feature 名稱直接判斷全部 skip。

## Selector Rule

**目前禁止使用 `data-testid` selector**（SIT DOM 尚未加入，詳見 selector-policy.md）。

現階段使用順序：`input[placeholder]` > `cy.contains('button/a', '文字')` > `a[href]` > 穩定唯一中文文字

無法確認 selector 的 TC → 先用 Playwright MCP 補驗取得 snapshot，再從 snapshot 抽 selector。若系統入口確實不存在才寫 `it.skip()`。
禁止使用 CSS nth-child、不穩定 class name、完整 XPath。

## TC 執行狀態定義（唯一來源）

> **所有 pipeline command 與腳本的 pass / fail / skip 判定，以此區塊為準，不在其他地方重複定義。**

### ✅ Pass（通過）

滿足以下任一條件：

| 條件 | 說明 |
|------|------|
| Cypress `it()` 全部 assertion 執行成功 | 由 `run-cypress.js` 自動寫入 `pipeline-state.tc_results` |
| Playwright MCP 補驗通過 | 手動將 `tc_results[TC-ID]` 更新為 `pass`，並在 `.cy.ts` 加 `// [VERIFIED BY PLAYWRIGHT MCP]` comment |

### ❌ Fail（失敗）

滿足以下任一條件：

| 條件 | 說明 |
|------|------|
| Cypress `it()` 任一 assertion 失敗 | 由 `run-cypress.js` 自動寫入 `pipeline-state.tc_results` 為 `fail` |
| SIT 可觸發但結果不符預期 | 必須用 `it()` 真實跑出失敗，並產出 BUG-AUTO 報告 |

**嚴禁用 `it.skip()` 掩蓋 fail** — Fail 欄永遠 0，報告失去可信度。

### ⏭️ Skip / Pending（跳過）

`it.skip` 只有兩種合法使用時機：

| 時機 | 說明 |
|------|------|
| SIT 系統上確實沒有此功能或入口（功能未上線） | 加 `[SDET TODO]` 說明原因 |
| SIT 環境完全不支援該服務（缺憑證、服務未部署） | 加 `[SDET TODO]` 說明原因 |

**不合法的 skip 用法（一律禁止）：**

- selector 不知道、fixture 未建、技術待確認 → 補齊後再跑，不用 skip
- 影片錄製、視覺品質等無法自動化 → 在 `test-cases.json` 標記 `automation_candidate: false`，不產出 `.cy.ts`，不寫 `it.skip`
- 功能有問題 → 必須 fail，不可 skip


## 佐證截圖規則（唯一來源）

**截圖命名必須以 TC ID 開頭**，`run-cypress.js` 的 evidence-index upsert 才能正確比對：

```typescript
// ✅ 正確：TC ID 開頭，evidence-index 可識別
cy.screenshot('TC-F11-01 Group清單顯示');
cy.screenshot('TC-F12-02 新增成功');

// ❌ 錯誤：純中文說明，evidence-index 無法比對 TC ID
cy.screenshot('Group清單');
cy.screenshot('新增成功畫面');
```

**截圖時機**：在 assertion 前、關鍵操作結果出現時截圖，不依賴 `afterEach`（`afterEach` 截的是 TC 結束後整頁，已不是關鍵畫面）：

```typescript
// ✅ 正確：操作完成、結果出現時截
cy.contains('新增成功').should('be.visible');
cy.screenshot('TC-F12-02 新增成功');

// ❌ 錯誤：靠 afterEach 截，畫面已跳回列表頁
```

**每個 TC 應至少有一張關鍵截圖**，命名格式：`{TC ID} {操作說明}`（空格分隔）。

## Playwright MCP 補驗規則

**當 Cypress 無法執行測試時（前置需 mediaDevices、需完整流程狀態、SIT 不支援直連 URL），改用 Playwright MCP 驗證。**

- Cypress 失敗或無法到達的步驟 → 用 Playwright MCP 手動走完流程並截圖 + snapshot 為憑
- 驗證結果存入 `artifacts/raw/screenshots/snapshots/snapshot-step-{step}.yml`
- 截圖存入 `artifacts/raw/screenshots/smoke/smoke-{名稱}.png`
- Playwright MCP 補驗通過 → pipeline-state 記為 `pass`，不計 pending，**不保留 it.skip**（移除 skip，改為純 comment 標注 `// [VERIFIED BY PLAYWRIGHT MCP] {日期} — {確認的事實}`）
- 補驗後若仍需保留 `.cy.ts` 測試，改寫成能跑的真實 `it()`；若 Cypress 結構上無法到達（需走完影片前置），則整個 `it()` body 以截圖 + comment 說明為憑，不放無法執行的 cy 指令

## BUG-AUTO 報告完整性規則（唯一來源）

> **產報告前必須交叉確認，確保 Bug Report 與 pipeline-state 一致。**

### 不一致的識別方式

合併檢視出現以下情況代表資料不一致，必須修正後才能產報告：

| 症狀 | 代表的問題 |
|------|-----------|
| TC 欄狀態「通過」但 Bug ID 欄非空 | pipeline-state fail=0，但有對應 BUG-AUTO 存在 |
| Bug Reports 分頁有 Open Bug，Test Report 該 feature fail=0 | pipeline-state 未同步更新 |
| 兩個 TC 的 Bug ID 相同 | `generateAutoBugReports()` 的 Bug ID 編號邏輯錯誤（見下方） |

### 不一致時的修正流程

```powershell
# 以 Cypress 實際執行日誌為準，手動修正 pipeline-state
.\scripts\pipeline\update-pipeline-state.ps1 -Feature "功能名稱" -Qa5 "done" -TestsRun "done" -Pass N -Pending N -Fail N
```

確認原則：**Bug Report 狀態 Open + 該 feature fail=0 不可能同時正確**，兩者矛盾時以 Cypress 執行日誌為準。

## RXCLM 路由與 DOM 特殊規則

| 頁面 | 正確路由 | 注意事項 |
|------|---------|---------|
| CA 機構管理 | `/admin/providers` | `/admin/ca-providers` 為 404，會重導首頁 |
| 部署核准 | `/admin/approvals` | — |
| 合規政策 | `/admin/policies` | — |
| 系統設定 | `/admin/settings` | — |
| 稽核紀錄 | `/audit` | — |

**CA 機構管理**：「管理項目」下拉選單連結在 DOM 中不存在，需點擊後用 `page.evaluate()` 讀取動態渲染的 href。直接導航用 `/admin/providers`。

**RXCLM CA 申請為非同步流程**：CA 失敗不在申請頁彈窗，而是在 Order 詳細頁以 FAILED 狀態顯示。TC 撰寫時必須反映此架構，不可在申請頁 assert CA 失敗訊息。

## DNS 類型憑證欄位對照表

不同 DNS Provider 類型在新增表單顯示不同欄位，TC 撰寫時必須查表填入正確欄位名，不可統一用 `API Token`：

| DNS 類型 | 憑證欄位 |
|---------|---------|
| Cloudflare、Akamai、Alibaba、Azure、DigitalOcean、DNSPod、GoDaddy、Google、Hetzner、Linode、NS1、PowerDNS、Vultr | `API Token` |
| AWS Route 53 | `AWS Access Key ID` + `AWS Secret Access Key` |
| RFC 2136 (BIND / PowerDNS nsupdate) | `DNS server hostname / IP` + `TSIG key name` + `TSIG secret` |
| acme-dns (self-hosted) | `Server base URL` |
| Manual | 無憑證欄位 |

此對照表已寫入 `scripts/cypress/auto-fix.js` 的 `DNS_TYPE_CREDENTIAL_FIELDS` 常數。

## evidence-index.json quality 欄位規則

每筆截圖 entry 的 `quality` 欄位定義：

| 值 | 說明 | 處理方式 |
|----|------|---------|
| `ok` | 截圖內容正常 | 直接使用 |
| `blank` | 頁面主體空白（資料未載入） | 用 Playwright MCP 補拍 |
| `loading` | 頁面仍在 loading | 用 Playwright MCP 補拍 |
| `empty_list` | 頁面正常但清單無資料 | 視情況補拍或保留 |

`quality` + `quality_note` 由 `syncCypressScreenshotsToEvidence()` 自動寫入，補拍後手動更新 quality 為 `ok`。

## Integration Tests 測試方法標籤系統

每個 Integration Test TC 必須填入 `testMethod` 欄位（唯一來源：`scripts/shared/integration-tests-data.js`）：

| 標籤 | 說明 |
|------|------|
| `UI操作` | Cypress 操作表單、按鈕、跳轉 |
| `狀態核查` | 驗證 DB/UI 狀態在操作後正確更新 |
| `API驗證` | 直接呼叫後端 API（cy.request）驗證回應 |
| `負向測試` | 輸入無效資料、驗證錯誤訊息 / 拒絕行為 |
| `邊界測試` | 邊界值、空白、極大值、特殊字元 |
| `權限組合` | 不同角色 / Group 的存取控制組合驗證 |
| `跨模組` | 跨越兩個以上功能模組的串聯驗證 |

**IT-XX 命名規範**：

| ID 格式 | 說明 |
|--------|-----|
| `IT-{區塊}-{序號}` | 跨模組正向（IT-LC-01、IT-CA-01） |
| `IT-{區塊}-NEG-{序號}` | 負向 / 邊界 |
| `IT-{區塊}-ROLE-{序號}` | 角色 / 權限控制 |
| `IT-{區塊}-FORM-{序號}` | 表單動態行為 |
| `IT-{區塊}-STATUS-{序號}` | 狀態機 / 狀態轉換 |

區塊代號：`LC`=憑證生命週期、`DP`=部署流程、`CA`=CA機構、`DNS`=DNS機構、`GRP`=Group、`UA`=帳號管理、`SC`=掃描、`POL`=合規政策、`AU`=稽核

**新增 IT TC 規則**：
1. 每個 TC 必須填 `testMethod`，用「/」分隔多個標籤
2. 規劃中的 IT-XX 只加入 `integration-tests-data.js`，不建立 `.cy.ts`，等環境滿足後才移出規劃
3. 新增 IT-XX 後，`scripts/shared/integration-tests-data.js` 是唯一來源，`sync-to-sheet.js` 和 `upload-to-drive.js` 皆 `require` 它，不需各自維護副本

## manual_result 欄位規則

`test-cases.json` 每筆 TC 的 `manual_result` 欄位：

| 建議值 | 意義 |
|-------|------|
| `✅ Pass` | 手測通過 |
| `❌ Fail` | 手測失敗 |
| `⏭️ Skip` | 手測跳過 |
| `""` | 尚未手測 |

- **不會被 Cypress 覆蓋**：`run-cypress.js` 的 `autoUpdatePipelineState()` 只更新 `tc_results`，不動 `manual_result`
- **填寫方式**：直接編輯 `test-cases.json`，`npm run sync:sheet` 後帶入 Test Cases sheet「手測結果」欄

## Review Rule

QA 審核 AI 產出的測試案例時，應確認：

- 是否覆蓋主要 acceptance criteria
- 是否包含成功與失敗情境
- 是否有測試資料需求（年齡層 fixture、帳號角色）
- 是否有不合理的 AI 假設
- 是否適合自動化（對照 risk-rules.md 不可自動化情境）
- Selector 是否使用真實存在的 DOM 屬性
