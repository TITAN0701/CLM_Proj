# 測試情境：RXCLM 憑證生命週期管理系統（核心功能）

> 系統：Ruenxin CLM  
> 版本：2026-06-18  
> 來源：使用導覽 24 個頁籤 + Playwright 冒煙測試驗證  
> 範圍：admin 角色全功能驗證

---

## F01 — 儀表板（/dashboard）

### S01-01 儀表板統計卡正確顯示
- **Given** 已以 admin 身分登入
- **When** 進入 /dashboard
- **Then** 應顯示 6 張統計卡（現役憑證、進行中、30天內到期、7天內到期、已過期、帳號數），數字大於等於 0
- **And** 頁面應包含「依狀態」bar chart 與「依 CA」bar chart

### S01-02 統計卡點擊跳轉篩選
- **Given** 儀表板已載入
- **When** 點擊「現役憑證」統計卡
- **Then** 應跳轉至憑證列表並自動套用 ISSUED 狀態篩選

### S01-03 快速操作連結正確
- **Given** 儀表板已載入
- **When** 點擊「新申請憑證」快速操作
- **Then** 應導向 /certs/new

### S01-04 重新整理更新資料時間
- **Given** 儀表板已載入
- **When** 點擊「重新整理」按鈕
- **Then** 「資料時間」應更新為當前時間

---

## F02 — 憑證列表（/certs）

### S02-01 預設顯示「依網域」頁籤
- **Given** 已登入
- **When** 進入 /certs
- **Then** 預設選中「依網域」頁籤，表格顯示 CN 聚合資料

### S02-02 切換「所有訂單」頁籤
- **Given** 在憑證列表頁
- **When** 點擊「所有訂單 (含歷史)」
- **Then** 表格切換為每筆 Order 一行顯示

### S02-03 搜尋功能
- **Given** 在憑證列表頁
- **When** 在搜尋框輸入 "api-test2" 並點查詢
- **Then** 結果只顯示 Common Name 包含 "api-test2" 的憑證

### S02-04 30天內到期快篩
- **Given** 在憑證列表頁
- **When** 點擊「30 天內到期」按鈕
- **Then** 應只顯示剩餘天數 ≤ 30 的憑證

### S02-05 Excel 下載
- **Given** 在憑證列表頁
- **When** 點擊「Excel 下載」
- **Then** 應觸發 .xlsx 檔案下載

### S02-06 儲存當前篩選為看板
- **Given** 已套用篩選條件
- **When** 點擊「儲存當前篩選」並輸入名稱
- **Then** 看板名稱應出現在「我的看板」清單中

---

## F03 — 網域詳細（/certs/domain/:cn）

### S03-01 顯示現役憑證資訊
- **Given** 有 ISSUED 狀態憑證的網域
- **When** 進入網域詳細頁
- **Then** 應顯示當前 Order ID、Serial、有效到日期、CA/Account、負責人

### S03-02 自動續簽設定顯示
- **Given** 在網域詳細頁
- **When** 查看「自動續簽」區塊
- **Then** 應顯示啟用狀態、續簽門檻（天數）、最後嘗試時間

### S03-03 編輯自動續簽設定
- **Given** 在網域詳細頁
- **When** 點擊「編輯」按鈕修改門檻天數
- **Then** 儲存後設定應更新

### S03-04 Tags 管理
- **Given** 在網域詳細頁
- **When** 輸入 tag key/value 並點「加 tag」
- **Then** 新 tag 應顯示在標籤清單中

### S03-05 刪除 Tag
- **Given** 網域已有 tag
- **When** 點擊 tag 旁的「×」
- **Then** tag 應從清單移除

### S03-06 手動更新憑證
- **Given** 網域有 ISSUED 憑證且未在 Pending 狀態
- **When** 點擊「更新憑證 (Renew)」
- **Then** 應建立新的 Order 並進入申請流程

### S03-07 綁定 Endpoint
- **Given** 系統有可用的 Endpoint
- **When** 點擊「綁定新 endpoint」並選擇
- **Then** Endpoint 應出現在部署清單中

### S03-08 變更 DNS binding
- **Given** 在網域詳細頁
- **When** 點擊「變更 binding」
- **Then** 應開啟 DNS 管理模式選擇器

---

## F04 — Order 詳細（/certs/:ca/:acc/:ord）

### S04-01 Order 基本資訊顯示
- **Given** 有效的 Order ID
- **When** 進入 Order 詳細頁
- **Then** 應顯示 Order 狀態、憑證鏈、建立時間

### S04-02 DNS 挑戰紀錄顯示
- **Given** 在 PENDING_DNS 狀態的 Order
- **When** 進入 Order 詳細頁
- **Then** 應顯示 DNS TXT record 挑戰資訊

---

## F05 — 申請新憑證（/certs/new）

### S05-01 表單欄位驗證
- **Given** 在申請新憑證頁面
- **When** 未填 Common Name 就點「建立 order」
- **Then** 按鈕應維持 disabled 或顯示驗證錯誤

### S05-02 選擇 CA 機構
- **Given** 在申請新憑證頁面
- **When** 從下拉選擇「TWCA」
- **Then** Account 選項應更新為 TWCA 帳號

### S05-03 填寫並送出申請
- **Given** CA = Letsencrypt、Account 已選、CN = smoke-test.example.com
- **When** 填寫所有必填欄位後點「建立 order (送 CA 開單)」
- **Then** 應建立新 Order 並跳轉至 Order 詳細頁

### S05-04 取消申請
- **Given** 在申請新憑證頁面已填入資料
- **When** 點「取消」
- **Then** 應返回上一頁且不建立 Order

---

## F06 — 匯入既有憑證（/certs/import）

### S06-01 PEM 單張匯入
- **Given** 在匯入憑證頁面
- **When** 貼上有效的 PEM 憑證內容並送出
- **Then** 憑證應成功匯入並出現在憑證列表（狀態 IMPORTED）

### S06-02 Excel 批次匯入
- **Given** 在匯入憑證頁面
- **When** 上傳符合格式的 .xlsx 批次檔
- **Then** 所有憑證應批次匯入並回報匯入數量

### S06-03 無效 PEM 格式錯誤提示
- **Given** 在匯入憑證頁面
- **When** 貼上非 PEM 格式的文字
- **Then** 應顯示格式錯誤訊息

---

## F07 — ACME 帳號（/accounts）

### S07-01 帳號列表顯示
- **Given** 已登入
- **When** 進入 /accounts
- **Then** 應列出所有 ACME 帳號，包含 CA、顯示名稱、聯絡 email

### S07-02 新增 ACME 帳號
- **Given** 在帳號列表頁
- **When** 點擊「新增帳號」並填寫 CA / email / 名稱
- **Then** 新帳號應出現在列表中

---

## F08 — Account 詳細（/accounts/:ca/:acc）

### S08-01 帳號基本資訊顯示
- **Given** 有效的 Account ID
- **When** 進入 Account 詳細頁
- **Then** 應顯示 CA、顯示名稱、聯絡 email、最近 Order 摘要

### S08-02 新增、編輯、刪除帳號
- **Given** 在帳號列表頁
- **When** 新增帳號 → 進入詳細頁編輯顯示名稱並儲存 → 刪除帳號
- **Then** 各步驟顯示正確提示訊息，刪除後導回 /accounts

### S08-03 轉移負責人
- **Given** 在 Account 詳細頁
- **When** 點擊「轉移負責人」並選擇新負責人後確認
- **Then** 負責人更新成功，清理後導回 /accounts

### S08-04 新增 RXCA 帳號錯誤提示
- **Given** 在帳號列表頁 RXCA 頁籤
- **When** 新增帳號並送出（SIT 環境 RXCA 連線可能不通）
- **Then** 應顯示明確錯誤訊息（如「Network error」）

### S08-05 新增 TWCA EAB 無效資料報錯
- **Given** 在帳號列表頁 TWCA EAB 頁籤
- **When** 填入格式錯誤的 EAB Key 並送出
- **Then** 顯示「Bad key size:」錯誤訊息

### S08-06 TWCA 帳號詳細頁資訊顯示
- **Given** 有效的 TWCA Account ID
- **When** 進入 TWCA Account 詳細頁
- **Then** 顯示帳號名稱、CA 類型、主檔資料、名下訂單 / 憑證（含 ISSUED）

### S08-07 新增 TWCA EAB 空白欄位驗證
- **Given** 在帳號列表頁 TWCA EAB 頁籤
- **When** 空白送出表單，再填入無效 EAB Key 送出
- **Then** 必填欄位仍可見；顯示「Bad key size:」錯誤訊息

---

## F09 — CA 機構管理

### S09-01 CA 清單顯示
- **Given** 已登入 admin
- **When** 進入 CA 管理頁
- **Then** 應顯示已設定的 CA Provider 清單（letsencrypt、twca 等）

### S09-02 新增 CA 機構表單開啟與取消
- **Given** 在 CA 機構管理頁
- **When** 點擊「新增」按鈕後再點「取消」
- **Then** 表單應出現後關閉，清單無變化

### S09-03 編輯 CA 機構表單開啟與取消
- **Given** 在 CA 機構管理頁有現有 CA Provider
- **When** 點擊「編輯」按鈕後再點「取消」
- **Then** 編輯表單應出現後關閉，資料無變化

### S09-04 新增 CA 機構並驗證列表
- **Given** 在 CA 機構管理頁
- **When** 填寫 CA Provider 名稱與類型並儲存
- **Then** 新 CA Provider 應出現在清單中

### S09-05 新增後刪除 CA 機構
- **Given** 已新增測試用 CA Provider
- **When** 點擊「刪除」並確認
- **Then** 該 CA Provider 應從清單中移除

---

## F10 — DNS 機構（/admin/dns-providers）

### S10-01 DNS Provider 清單顯示
- **Given** 已登入 admin
- **When** 進入 /admin/dns-providers
- **Then** 應顯示所有已設定的 DNS Provider

### S10-02 新增 DNS Provider
- **Given** 在 DNS 管理頁
- **When** 填寫 Provider 類型（Cloudflare/Route53 等）與 credentials
- **Then** 新 Provider 應加入清單

### S10-03 Cloudflare 類型表單驗證
- **Given** 在 DNS 管理頁新增表單
- **When** 選擇 Cloudflare 類型並填寫名稱
- **Then** 儲存按鈕應從 disabled 變為可點擊

### S10-04 Manual Provider 測試連線成功
- **Given** 已新增 Manual DNS Provider
- **When** 點擊「測試連線」
- **Then** 應回傳連線成功訊息

### S10-05 Provider 測試連線失敗
- **Given** 使用無效 credentials 的 Provider
- **When** 點擊「測試連線」
- **Then** 應回傳連線失敗錯誤訊息

### S10-06 新增表單類型切換驗證
- **Given** 在 DNS 管理頁新增表單
- **When** 切換 Provider 類型（Manual ↔ 其他）
- **Then** 對應欄位應動態顯示或隱藏

### S10-07 新增後刪除 DNS Provider
- **Given** 已新增測試用 DNS Provider
- **When** 完成測試連線後執行刪除
- **Then** 該 Provider 應從清單中移除

---

## F11 — Group 管理（/admin/groups）

### S11-01 Group 清單顯示
- **Given** 已登入 admin
- **When** 進入 /admin/groups
- **Then** 應顯示 Group 清單（含 Default group）

### S11-02 建立新 Group
- **Given** 在 Group 管理頁
- **When** 輸入 Group 名稱並建立
- **Then** 新 Group 應出現在清單中

### S11-04 編輯 Group Display name
- **Given** 有現有 Group
- **When** 點擊「編輯」並修改 Display name 後儲存
- **Then** 清單中應顯示更新後的 Display name

### S11-03 設定 Group 權限範圍
- **Given** 有新建的 Group
- **When** 設定可存取的 ACME 帳號、Endpoint、DNS Provider
- **Then** 設定應儲存並生效

---

## F12 — User 管理（/admin/users）

### S12-01 User 清單顯示
- **Given** 已登入 admin
- **When** 進入 /admin/users
- **Then** 應顯示所有使用者清單（含 email、角色、Group）

### S12-02 建立新 User
- **Given** 在 User 管理頁
- **When** 填寫 email、角色（admin/supervisor/user）並建立
- **Then** 新 User 應出現在清單中

### S12-05 搜尋 User
- **Given** 在 User 管理頁
- **When** 在搜尋欄輸入關鍵字
- **Then** 清單應即時過濾顯示符合的 User

### S12-06 Role 篩選
- **Given** 在 User 管理頁
- **When** 選擇 Role 篩選條件（admin/user）
- **Then** 清單應只顯示該角色的 User

### S12-07 編輯 User 顯示名稱
- **Given** 有現有 User
- **When** 點擊「編輯」並修改顯示名稱後儲存
- **Then** 清單中應顯示更新後的顯示名稱

### S12-08 強登出 User
- **Given** 有現有 User
- **When** 點擊「強登出」並確認
- **Then** 確認 dialog 出現並可取消，取消後 dialog 關閉

### S12-03 指派 Group
- **Given** 有未分配 Group 的 User
- **When** 將 User 加入指定 Group
- **Then** User 的 Group 欄位應更新

### S12-04 密碼重設
- **Given** 在 User 管理頁選定某 User
- **When** 執行密碼重設
- **Then** 應觸發重設流程（寄信或生成臨時密碼）

---

## F13 — Endpoint 管理（/admin/endpoints）

### S13-01 Endpoint 清單顯示
- **Given** 已登入 admin
- **When** 進入 /admin/endpoints
- **Then** 應顯示所有 Endpoint（local/webhook/ssh/f5/k8s_secret）

### S13-02 新增 local Endpoint
- **Given** 在 Endpoint 管理頁
- **When** 選擇類型 local 並填寫路徑
- **Then** 新 Endpoint 應出現在清單

### S13-03 新增 webhook Endpoint
- **Given** 在 Endpoint 管理頁
- **When** 選擇類型 webhook 並填寫 URL
- **Then** 新 Endpoint 應出現在清單

### S13-04 新增 ssh Endpoint
- **Given** 在 Endpoint 管理頁
- **When** 選擇類型 ssh 並填寫 host/user/key path
- **Then** 新 Endpoint 應出現在清單

### S13-05 新增 F5 Endpoint
- **Given** 在 Endpoint 管理頁
- **When** 選擇類型 f5 並填寫 BIG-IP host/credentials
- **Then** 新 Endpoint 應出現在清單

---

## F14 — 授權管理（/admin/license）

### S14-01 授權狀態顯示
- **Given** 已登入 admin
- **When** 進入 /admin/license
- **Then** 應顯示授權狀態（有效 / 到期 / 尚未啟用）與到期日

### S14-02 啟用授權碼
- **Given** 取得潤新提供的授權碼
- **When** 貼入授權碼並送出
- **Then** 授權狀態應更新為「有效」

---

## F15 — 部署核准（/admin/approvals）

### S15-01 待審清單顯示
- **Given** 有待核准的部署任務
- **When** 進入 /admin/approvals
- **Then** 應顯示三類待審清單（憑證部署、DNS Binding 變更、CIR）

### S15-02 核准部署任務
- **Given** 有 Pending 的部署任務
- **When** 以 supervisor/admin 身分點擊「核准」
- **Then** 任務狀態應更新為 APPROVED 並觸發部署

### S15-03 拒絕部署任務
- **Given** 有 Pending 的部署任務
- **When** 點擊「拒絕」並填寫原因
- **Then** 任務狀態應更新為 REJECTED

---

## F16 — 憑證掃描（/admin/scan）

### S16-01 掃描觸發
- **Given** 已設定 Endpoint
- **When** 在掃描頁面選擇 Endpoint 並執行掃描
- **Then** 應執行掃描並顯示進度

### S16-02 掃描結果顯示 unmanaged 憑證
- **Given** 掃描完成
- **When** 查看掃描結果
- **Then** 系統外憑證（unmanaged）應標示出來並可選擇納管

---

## F17 — 合規政策（/admin/policies）

### S17-01 政策清單顯示
- **Given** 已登入 admin
- **When** 進入 /admin/policies
- **Then** 應顯示強制政策清單（演算法、Key size、CA、有效期、域名）

### S17-02 新增合規政策
- **Given** 在合規政策頁
- **When** 設定政策條件（如演算法必須為 RSA-2048+）並儲存
- **Then** 政策應生效並套用至後續憑證申請

---

## F18 — 稽核紀錄（/audit）

### S18-01 稽核紀錄顯示
- **Given** 已登入 admin
- **When** 進入 /audit
- **Then** 應顯示所有操作紀錄（含 before/after diff）

### S18-02 稽核紀錄 Excel 匯出
- **Given** 在稽核紀錄頁
- **When** 點擊「Excel 匯出」
- **Then** 應下載包含完整紀錄的 .xlsx 檔案

### S18-03 HMAC 鏈完整性
- **Given** 稽核紀錄存在
- **When** 系統驗證 HMAC 完整性
- **Then** 所有紀錄應通過完整性驗證

---

## F19 — 系統設定（/admin/settings）

### S19-01 一般設定顯示
- **Given** 已登入 admin
- **When** 進入 /admin/settings
- **Then** 應顯示 key-value 設定清單

### S19-02 修改設定值
- **Given** 在系統設定頁
- **When** 修改某設定值並儲存
- **Then** 設定應立即生效

### S19-03 Mail（SMTP）設定
- **Given** 在系統設定頁
- **When** 設定 SMTP server、port、sender
- **Then** 可發送測試信驗證

---

## F20 — 我的帳號（/me）

### S20-01 個人資料顯示
- **Given** 已登入
- **When** 進入 /me
- **Then** 應顯示 email、角色

### S20-02 修改密碼
- **Given** 在「我的帳號」頁
- **When** 輸入舊密碼與新密碼並確認
- **Then** 密碼應成功更新，重新登入有效

### S20-03 啟用 MFA (TOTP)
- **Given** 尚未啟用 MFA
- **When** 點啟用 MFA、掃描 QR Code 並輸入驗證碼
- **Then** MFA 應啟用成功，下次登入需輸入 TOTP
