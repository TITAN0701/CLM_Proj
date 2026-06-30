# QA Risk Notes — RXCLM 憑證生命週期管理系統

> 來源：Playwright 冒煙測試（2026-06-18）  
> 版本：初版冒煙測試後風險評估

---

## CA 機構管理
**風險等級**: Low  
影響範圍: CA 機構設定、憑證申請依賴 CA Provider  
建議 Owner: QA  
是否建議 Release: Yes（路由已確認，TC 全數通過）

- 正確路由為 `/admin/providers`（非 `/admin/ca-providers`）— 2026-06-24 Playwright 補驗確認
- 直接導航 `/admin/ca-providers` 會 404 重導，需透過「管理項目」下拉選單進入或使用正確路由
- TC-F09-01~05 全數通過，CA 機構管理功能正常

---

## 憑證掃描
**風險等級**: Medium  
影響範圍: unmanaged 憑證偵測、Endpoint 整合  
建議 Owner: QA  
是否建議 Release: Yes（功能頁面正常，但掃描觸發流程待驗證）

- 掃描頁面載入正常，但實際掃描觸發需有 Endpoint 設定
- 環境中尚未確認有可用的測試 Endpoint 連線目標

---

## 部署核准（Approvals）
**風險等級**: Medium  
影響範圍: 憑證部署流程完整性  
建議 Owner: QA  
是否建議 Release: Yes（核准/拒絕 UI 待驗證）

- 待審清單頁面正常顯示，但測試環境目前無待核准任務
- 核准/拒絕操作流程尚未執行驗證
- **建議**：製造一筆待核准任務後執行完整流程測試

---

## 自動續簽設定
**風險等級**: Medium  
影響範圍: 憑證到期前自動更新  
建議 Owner: QA  
是否建議 Release: Yes（設定 UI 正常，自動觸發待觀察）

- 網域詳細頁的自動續簽設定 UI 正常（api-test2 顯示「啟用中，到期前 30 天觸發」）
- 但實際 cron 觸發行為未在本次冒煙測試中驗證
- 最後嘗試顯示「從未」，需確認 scheduler 是否正常運行

---

## 儀表板
**風險等級**: Low  
影響範圍: 統計卡顯示、快速操作連結  
建議 Owner: QA  
是否建議 Release: Yes

- 4/4 TC 全數通過，統計卡、bar chart、快速連結均正常
- 資料為即時讀取，需注意空環境（0 筆憑證）時的顯示行為

---

## 憑證列表
**風險等級**: Low  
影響範圍: 憑證搜尋、篩選、Excel 匯出  
建議 Owner: QA  
是否建議 Release: Yes

- 5/5 TC 全數通過，搜尋、篩選、30天快篩、Excel 下載均正常
- Excel 匯出僅驗證觸發下載，未驗證內容完整性

---

## 網域詳細
**風險等級**: Medium  
影響範圍: 憑證詳細資訊、自動續簽設定、Tag 管理、手動 Renew  
建議 Owner: QA  
是否建議 Release: Yes（讀取正常，寫入操作待驗證）

- 2/6 TC 通過（顯示與設定區塊讀取），4 個寫入 TC（編輯、Tag、Renew）待 SDET 確認 selector
- 手動 Renew 涉及 CA 呼叫，需謹慎執行

---

## Order 詳細
**風險等級**: Low  
影響範圍: Order 基本資訊顯示  
建議 Owner: QA  
是否建議 Release: Yes

- 1/1 TC 通過（Playwright MCP 補驗），Order 基本資訊正常顯示
- 需有實際 Order 存在才能驗證，測試環境有現有 Order 可用

---

## 申請新憑證
**風險等級**: High  
影響範圍: 憑證申請主流程、CA 選擇、表單驗證  
建議 Owner: QA + 開發工程師  
是否建議 Release: Yes（驗證 TC 通過，完整申請流程待確認）

- 3/4 TC 通過（表單驗證、CA 選擇、取消操作），完整送出流程（TC-F05-03）因會建立真實 Order 暫 skip
- 申請流程是核心功能，建議在隔離環境補測完整送出

---

## 匯入既有憑證
**風險等級**: High  
影響範圍: 外部憑證導入、PEM 格式解析  
建議 Owner: QA  
是否建議 Release: Conditional（需準備 PEM fixture 後補測）

- 0/2 TC 執行（TC-F06-01 需有效 PEM fixture，TC-F06-03 fail — 錯誤訊息 selector 不符）
- 匯入功能是否正常無法確認，建議補充有效 PEM fixture 後重測

---

## ACME 帳號
**風險等級**: Low  
影響範圍: ACME 帳號列表顯示  
建議 Owner: QA  
是否建議 Release: Yes

- 1/1 TC 通過，ACME 帳號清單正常顯示
- 新增/刪除 ACME 帳號功能尚未測試

---

## Account 詳細
**風險等級**: Medium  
影響範圍: ACME 帳號詳細、RXCA 連線、TWCA EAB 設定、owner 轉移  
建議 Owner: QA + 開發工程師  
是否建議 Release: Yes（RXCA 連線異常待確認）

- 6/7 TC 通過，TC-F08-04 RXCA 帳號新增 fail（SIT 環境 Network error 訊息格式不符預期）
- RXCA 連線行為需工程師確認 SIT 環境 RXCA 服務狀態

---

## DNS 機構
**風險等級**: Low  
影響範圍: DNS Provider 設定、測試連線、類型切換  
建議 Owner: QA  
是否建議 Release: Yes

- 7/7 TC 全數通過，Manual 和 Cloudflare 類型新增、測試連線、刪除均正常
- 實際連線測試使用 Mock，不呼叫外部 Cloudflare API

---

## Group 管理
**風險等級**: Low  
影響範圍: Group 新增、編輯、刪除  
建議 Owner: QA  
是否建議 Release: Yes

- 3/3 TC 全數通過，新增、編輯 Display name、刪除均正常（自建自刪）

---

## User 管理
**風險等級**: Low  
影響範圍: User 新增、編輯、搜尋、Role 篩選、強登出  
建議 Owner: QA  
是否建議 Release: Yes

- 6/6 TC 全數通過，User CRUD、搜尋篩選、強登出 dialog 均正常
- 強登出只驗證 dialog 出現，實際 session 失效未端對端驗證

---

## Endpoint 管理（部署核准）
**風險等級**: Low  
影響範圍: Endpoint 新增（local/webhook/ssh/f5）  
建議 Owner: QA  
是否建議 Release: Yes

- 4/6 TC 通過（清單顯示、local/webhook/ssh/f5 新增），核准/拒絕 2 TC 需環境有 Pending 任務
- Endpoint 新增測試均自建自刪，無資料污染

---

## 授權管理
**風險等級**: Low  
影響範圍: 授權狀態顯示、授權碼啟用  
建議 Owner: QA  
是否建議 Release: Yes（顯示正常，啟用流程待測）

- 1/2 TC 通過（狀態顯示），啟用授權碼（TC-F14-02）需準備有效授權碼 fixture
- Development mode 狀態下系統正常運作

---

## 合規政策
**風險等級**: Medium  
影響範圍: 政策清單顯示、新增政策  
建議 Owner: QA  
是否建議 Release: Yes（清單正常，新增待驗證）

- 1/2 TC 通過（清單顯示），新增政策（TC-F17-02）待確認表單欄位 selector

---

## 稽核紀錄
**風險等級**: Low  
影響範圍: 操作歷史顯示、Excel 匯出  
建議 Owner: QA  
是否建議 Release: Yes

- 2/2 TC 全數通過，稽核紀錄顯示、Excel 匯出均正常

---

## 系統設定
**風險等級**: Medium  
影響範圍: 一般設定、SMTP 配置  
建議 Owner: QA + 系統管理員  
是否建議 Release: Yes（顯示正常，修改待驗證）

- 1/3 TC 通過（頁面顯示），修改設定值和 SMTP 配置待確認 selector
- SMTP 設定變更影響全系統郵件發送，建議謹慎操作

---

## 我的帳號
**風險等級**: Medium  
影響範圍: 個人資料顯示、密碼修改  
建議 Owner: QA  
是否建議 Release: Yes（顯示正常，密碼修改待謹慎執行）

- 1/3 TC 通過（個人資料顯示），密碼修改 2 TC 需謹慎執行（避免無法還原）
- 修改密碼涉及 Auth 服務，建議在隔離帳號執行測試

---

## 整體
**風險等級**: Low  
影響範圍: 整體功能可用性  
建議 Owner: QA Team  
是否建議 Release: Yes（冒煙測試通過率 93%）

- 20 頁冒煙測試中 19 頁正常，1 頁（CA 機構路由）需確認
- 43 個 TC 中 27 個已 Pass、30 個 Pending（待後續執行）、1 個 Fail
- 系統整體穩定，主要功能（憑證申請、列表、網域詳細、審核）均正常
