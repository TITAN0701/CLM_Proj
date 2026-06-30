# 整合測試情境：RXCLM 跨模組整合驗證

> 系統：Ruenxin CLM
> 版本：2026-06-25
> 範圍：跨模組端對端整合情境（與 scenarios.md 互補，scenarios.md 驗單頁行為，此檔驗跨模組串聯）
> 命名規則：IT-{分類}-{序號}-{子情境序號}

---

## 憑證生命週期

### IT-LC-NEG-01-01 申請送出後 CA 非同步失敗 → Order 頁顯示 FAILED 狀態
- **Given** 已登入 admin，Account 設定為會觸發 CA 回傳失敗的環境
- **When** 填寫憑證申請表單並送出
- **Then** Order 詳細頁狀態應顯示 FAILED，不是申請頁彈窗

### IT-LC-NEG-01-02 Order FAILED 後詳細頁顯示失敗原因
- **Given** Order 狀態為 FAILED
- **When** 進入該 Order 詳細頁
- **Then** 應顯示 CA 回傳的具體失敗原因訊息

### IT-LC-NEG-01-03 Order FAILED 後憑證列表無新增該憑證
- **Given** Order 狀態為 FAILED
- **When** 進入憑證列表
- **Then** 不應出現該申請對應的 ISSUED 憑證

---

### IT-LC-NEG-02-01 匯入完全空白 PEM → 前端拒絕
- **Given** 已登入 admin，進入匯入既有憑證頁
- **When** PEM 欄位留空直接送出
- **Then** 應顯示「格式錯誤」或「必填」驗證訊息，不送出至後端

### IT-LC-NEG-02-02 匯入空字串 PEM → 後端拒絕並回傳錯誤
- **Given** 已登入 admin，進入匯入既有憑證頁
- **When** 貼入空字串並送出
- **Then** 後端應回傳格式錯誤，頁面顯示錯誤訊息

### IT-LC-NEG-02-03 空白 PEM 與損壞 PEM 的錯誤訊息不同
- **Given** 已登入 admin
- **When** 分別貼入空白與損壞 PEM 各送出一次
- **Then** 兩次的錯誤訊息應不同（空白 vs 格式無效），各自有明確說明

---

### IT-LC-STATUS-01-01 PENDING_DNS 狀態 Order 顯示 DNS 挑戰資訊
- **Given** 有一筆 Order 處於 PENDING_DNS 狀態
- **When** 進入該 Order 詳細頁
- **Then** 應顯示 DNS 挑戰類型、Record Name、Record Value

### IT-LC-STATUS-01-02 DNS 驗證完成後 Order 狀態更新為 ISSUED
- **Given** Order 處於 PENDING_DNS，DNS 挑戰記錄已正確設定
- **When** 等待 DNS 驗證完成（系統輪詢）
- **Then** Order 狀態應自動更新為 ISSUED，不需手動重整

### IT-LC-STATUS-01-03 Order ISSUED 後憑證列表同步出現該憑證
- **Given** Order 狀態剛從 PENDING_DNS 轉為 ISSUED
- **When** 進入憑證列表
- **Then** 應出現對應 CN 的 ISSUED 憑證，到期日正確

---

### IT-LC-01-01 申請新憑證 → Order issued → 憑證列表顯示 ISSUED
- **Given** 已設定可用 ACME Account + DNS Provider
- **When** 填寫申請表單送出，等待 CA 處理完成
- **Then** Order 狀態為 ISSUED，憑證列表出現對應 CN 的憑證

### IT-LC-01-02 ISSUED 憑證出現在 30 天到期快篩（模擬近到期）
- **Given** 憑證列表有 ISSUED 憑證
- **When** 套用「30 天內到期」快篩
- **Then** 近到期的憑證應出現在列表中

### IT-LC-01-03 觸發 Renew → 新 Order 產生並進入流程
- **Given** 有 ISSUED 憑證且到期日在 30 天內
- **When** 在憑證列表或網域詳細頁手動觸發 Renew
- **Then** 產生新的 Order，狀態為 PENDING 或 PROCESSING

---

## 部署流程

### IT-DP-NEG-01-01 Endpoint 設定不可達主機 → 部署任務觸發後標為 Error
- **Given** 已登入 admin，Endpoint 主機設定為不可達 IP，有 Pending 部署任務
- **When** 觸發對該 Endpoint 的部署
- **Then** 部署任務狀態應標為 Error，不顯示 Done

### IT-DP-NEG-01-02 部署 Error 後待審清單仍保留該任務
- **Given** 部署任務狀態為 Error
- **When** 進入部署核准頁
- **Then** 該任務仍顯示在列表中，狀態標為 Error（非消失）

### IT-DP-NEG-01-03 部署 Error 後可重新觸發部署
- **Given** 部署任務狀態為 Error
- **When** 修正 Endpoint 連線設定後重新觸發
- **Then** 部署應重新執行，狀態更新

---

### IT-DP-NEG-02-01 新增 webhook Endpoint 填入非 URL 格式 → 前端驗證拒絕
- **Given** 已登入 admin，進入新增 Endpoint 表單，選擇 webhook 類型
- **When** URL 欄位填入 `not-a-url` 並送出
- **Then** 前端應顯示 URL 格式驗證錯誤，不送出至後端

### IT-DP-NEG-02-02 新增 webhook Endpoint 填入無 schema 的 URL → 前端拒絕
- **Given** 已登入 admin，進入新增 Endpoint 表單，選擇 webhook 類型
- **When** URL 欄位填入 `192.168.0.1`（無 http://）並送出
- **Then** 應顯示 URL 格式錯誤提示

### IT-DP-NEG-02-03 新增 webhook Endpoint 填入有效 URL → 可成功儲存
- **Given** 已登入 admin，進入新增 Endpoint 表單，選擇 webhook 類型
- **When** URL 欄位填入合法 URL（如 `http://192.168.0.1:8080/hook`）並送出
- **Then** Endpoint 儲存成功，出現在清單中，操作完成後自行刪除

---

### IT-DP-ROLE-01-01 user 角色嘗試進入 /admin/approvals → 被導向
- **Given** 已以 user 角色登入
- **When** 直接瀏覽 /admin/approvals
- **Then** 應被導向無權限頁或跳回首頁，不顯示部署核准內容

### IT-DP-ROLE-01-02 supervisor 角色可正常進入 /admin/approvals
- **Given** 已以 supervisor 角色登入
- **When** 進入 /admin/approvals
- **Then** 應正常顯示待審清單

### IT-DP-ROLE-01-03 user 角色導航列不顯示「部署核准」入口
- **Given** 已以 user 角色登入
- **When** 查看導航列
- **Then** 不應出現「部署核准」或 /admin/approvals 的連結

---

### IT-DP-01-01 憑證 issued 後部署核准待審清單自動出現
- **Given** 已設定 Endpoint 與合規政策，憑證申請完成並 issued
- **When** 進入部署核准頁
- **Then** 待審清單應出現對應的部署任務

### IT-DP-01-02 supervisor 核准後 Endpoint 接收部署
- **Given** 有待審部署任務
- **When** supervisor 登入並核准該任務
- **Then** 部署狀態更新為 Done，Endpoint 接收到憑證

### IT-DP-01-03 核准後稽核紀錄出現核准操作
- **Given** supervisor 剛完成核准操作
- **When** 進入 /audit
- **Then** 應有一筆核准操作的稽核紀錄，含操作者與時間

---

## CA / DNS / Account 設定

### IT-CA-NEG-01-01 新增 CA 機構表單開啟後點取消 → 清單無新增
- **Given** 已登入 admin，進入 CA 機構管理
- **When** 點擊「新增」→ 填入 CA 資訊 → 點「取消」
- **Then** CA 清單無新增項目，筆數不變

### IT-CA-NEG-01-02 取消新增後再次開啟表單 → 欄位為空
- **Given** 已執行過一次取消新增
- **When** 再次點擊「新增」
- **Then** 表單欄位應為空，不保留上次填入的值

---

### IT-DNS-NEG-01-01 Cloudflare DNS Provider 填入無效 Token → 測試連線失敗
- **Given** 已登入 admin，新增 Cloudflare 類型 DNS Provider
- **When** 填入無效 API Token 並點「測試連線」
- **Then** 顯示連線失敗錯誤訊息

### IT-DNS-NEG-01-02 測試連線失敗後表單仍可修正重送
- **Given** 測試連線顯示失敗
- **When** 修正 Token 後再次點「測試連線」
- **Then** 若 Token 正確則顯示連線成功；錯誤則再次失敗

---

### IT-DNS-FORM-01-01 新增表單選 Manual 類型 → 顯示對應欄位
- **Given** 已登入 admin，進入新增 DNS Provider 表單
- **When** 類型選擇 Manual
- **Then** 顯示 Manual 類型專屬欄位，不顯示 API Token 欄位

### IT-DNS-FORM-01-02 切換類型 Manual → Cloudflare → 欄位動態更換
- **Given** 已選 Manual 類型且欄位已顯示
- **When** 切換類型至 Cloudflare
- **Then** 欄位切換為 Cloudflare 專屬欄位（API Token），Manual 欄位消失

### IT-DNS-FORM-01-03 切換回 Manual 後欄位重置為空
- **Given** 曾切換至 Cloudflare 並填入部分資料
- **When** 切換回 Manual
- **Then** Manual 欄位重新顯示且為空，不帶入 Cloudflare 的殘留值

---

### IT-CA-01-01 新增 CA Provider → 申請憑證表單的 CA 下拉出現新 CA
- **Given** 已登入 admin
- **When** 在 CA 機構管理新增一個 CA Provider，再前往申請新憑證頁
- **Then** CA 下拉選單應出現剛新增的 CA 名稱

### IT-CA-01-02 選用新增的 CA 送出申請 → Order 正常產生
- **Given** 申請表單已選用剛新增的 CA
- **When** 填寫完整表單並送出
- **Then** Order 正常產生，CA 欄位顯示為剛新增的 CA 名稱

### IT-CA-01-03 刪除 CA Provider 後申請表單下拉不再出現該 CA
- **Given** 完成驗證後刪除剛新增的 CA
- **When** 回到申請新憑證頁
- **Then** CA 下拉選單不再出現已刪除的 CA

---

### IT-DNS-01-01 新增 DNS Provider → 申請憑證 DNS 驗證選項出現新 Provider
- **Given** 已登入 admin
- **When** 在 DNS 機構新增一個 Provider，再前往申請新憑證頁
- **Then** DNS 驗證方式下拉應出現剛新增的 Provider 名稱

### IT-DNS-01-02 選用新增的 DNS Provider 送出申請 → Order 使用正確 DNS
- **Given** 申請表單已選用剛新增的 DNS Provider
- **When** 填寫完整表單並送出
- **Then** Order 詳細頁顯示使用的 DNS Provider 為剛新增者

### IT-DNS-01-03 刪除 DNS Provider 後申請表單下拉不再出現該 Provider
- **Given** 完成驗證後刪除剛新增的 Provider
- **When** 回到申請新憑證頁
- **Then** DNS 驗證方式下拉不再出現已刪除的 Provider

---

## 帳號權限

### IT-UA-NEG-01-01 修改密碼填入錯誤舊密碼 → Auth 拒絕
- **Given** 已登入
- **When** 前往我的帳號頁，修改密碼填入錯誤的舊密碼並送出
- **Then** Auth 拒絕，UI 顯示「舊密碼錯誤」或類似錯誤訊息

### IT-UA-NEG-01-02 錯誤舊密碼被拒後密碼未變更 → 原密碼仍可登入
- **Given** 修改密碼因錯誤舊密碼被拒
- **When** 登出後以原密碼重新登入
- **Then** 登入成功，密碼未被修改

### IT-UA-NEG-01-03 輸入正確舊密碼 → 密碼修改成功 → 舊密碼無效
- **Given** 已登入
- **When** 修改密碼填入正確舊密碼與新密碼並送出
- **Then** 修改成功，以舊密碼登入應失敗

---

### IT-UA-NEG-02-01 新增 User 填入非 email 格式 → 前端驗證拒絕
- **Given** 已登入 admin，進入 User 管理新增表單
- **When** email 欄填入 `not-an-email` 並送出
- **Then** 前端顯示 email 格式驗證錯誤，不送出至後端

### IT-UA-NEG-02-02 新增 User 填入缺少 @ 的字串 → 前端驗證拒絕
- **Given** 已登入 admin，進入 User 管理新增表單
- **When** email 欄填入 `userdomain.com` 並送出
- **Then** 前端顯示格式驗證錯誤

### IT-UA-NEG-02-03 填入合法 email 格式 → 可成功新增（完成後自行刪除）
- **Given** 已登入 admin，進入 User 管理新增表單
- **When** 填入合法 email 格式（如 `test-it@rxclm.local`）並完成送出
- **Then** User 成功建立，出現在 User 清單，操作完成後自行刪除

---

### IT-UA-ROLE-01-01 user 角色嘗試進入 /admin/users → 被導向
- **Given** 已以 user 角色登入
- **When** 直接瀏覽 /admin/users
- **Then** 應被導向無權限頁或跳回首頁

### IT-UA-ROLE-01-02 user 角色嘗試進入 /admin/policies → 被導向
- **Given** 已以 user 角色登入
- **When** 直接瀏覽 /admin/policies
- **Then** 應被導向無權限頁或跳回首頁

### IT-UA-ROLE-01-03 admin 角色可正常進入所有 /admin/* 路由
- **Given** 已以 admin 角色登入
- **When** 依序進入 /admin/users、/admin/policies、/admin/approvals
- **Then** 三個頁面均正常顯示內容

---

### IT-GRP-PERM-01-01 建立 Group 並設定可存取指定 Account
- **Given** 已登入 admin
- **When** 建立新 Group，設定可存取特定 ACME Account
- **Then** Group 設定儲存成功，設定頁顯示正確的 Account 存取範圍

### IT-GRP-PERM-01-02 將 User 加入該 Group → User 登入後可見該 Account
- **Given** Group 已設定可存取特定 Account，User 已加入該 Group
- **When** 以該 User 帳號登入
- **Then** 帳號列表應出現被授權的 Account，不在授權範圍的 Account 不顯示

### IT-GRP-PERM-01-03 將 User 移出 Group → User 再次登入後 Account 消失
- **Given** User 在 Group 中可見授權 Account
- **When** admin 將 User 從 Group 移除，User 重新登入
- **Then** 該 Account 不再顯示於 User 的帳號列表

---

### IT-UA-01-01 新增 User 並指派有限 Group → 憑證可見範圍受限
- **Given** 已登入 admin，有一個只能存取部分 Account 的 Group
- **When** 建立新 User 並指派至該 Group，以新 User 登入
- **Then** 憑證列表只顯示 Group 授權範圍內的憑證

### IT-UA-01-02 User 未指派任何 Group → 憑證列表為空
- **Given** 已建立一個未指派 Group 的 User
- **When** 以該 User 登入並進入憑證列表
- **Then** 憑證列表應為空或只顯示系統預設可見範圍

### IT-UA-01-03 User 指派多個 Group → 可見範圍為多個 Group 的聯集
- **Given** User 同時加入 Group-A（Account 1）與 Group-B（Account 2）
- **When** 以該 User 登入並進入帳號列表
- **Then** Account 1 和 Account 2 均應可見

---

### IT-UA-02-01 admin 對線上 User 執行強登出 → 操作成功
- **Given** 已登入 admin，目標 User 有現存 session
- **When** 在 User 管理對該 User 點擊強登出並確認
- **Then** 操作成功，UI 顯示確認訊息

### IT-UA-02-02 被強登出的 User 現有操作被導向登入頁
- **Given** 目標 User 剛被 admin 強登出
- **When** 目標 User 在同一 session 繼續操作（如點擊連結）
- **Then** 應跳轉至 /login，session 已失效

### IT-UA-02-03 被強登出後以原帳密重新登入可成功
- **Given** 目標 User 被強登出
- **When** 以原帳密重新登入
- **Then** 登入成功，session 重新建立

---

## 掃描 / 合規 / 稽核

### IT-AU-NEG-01-01 user 角色存取 /audit → 被導向
- **Given** 已以 user 角色登入
- **When** 直接瀏覽 /audit
- **Then** 應被導向無權限頁或跳回首頁，不顯示稽核紀錄

### IT-AU-NEG-01-02 supervisor 角色存取 /audit → 被導向（稽核為 admin 限定）
- **Given** 已以 supervisor 角色登入
- **When** 直接瀏覽 /audit
- **Then** 應被導向無權限頁，稽核紀錄不對 supervisor 開放

### IT-AU-NEG-01-03 admin 角色可正常查看 /audit
- **Given** 已以 admin 角色登入
- **When** 進入 /audit
- **Then** 正常顯示稽核紀錄列表

---

### IT-POL-NEG-01-01 設定 RSA-2048 強制政策 → 政策清單出現
- **Given** 已登入 admin
- **When** 新增合規政策，設定強制最低 RSA-2048
- **Then** 政策清單出現剛設定的政策，狀態為啟用

### IT-POL-NEG-01-02 申請 RSA-1024 憑證 → 系統阻擋（政策生效）
- **Given** RSA-2048 強制政策已啟用
- **When** 嘗試申請 RSA-1024 憑證
- **Then** 系統應阻擋申請並顯示違規原因（不合規政策）

### IT-POL-NEG-01-03 申請 RSA-2048 憑證 → 不被阻擋可正常送出
- **Given** RSA-2048 強制政策已啟用
- **When** 嘗試申請 RSA-2048 憑證
- **Then** 申請不被阻擋，Order 正常產生

---

### IT-SC-UNMANAGED-01-01 對有 unmanaged 憑證的 Endpoint 執行掃描 → 結果顯示
- **Given** 已登入 admin，Endpoint 主機有系統外憑證
- **When** 觸發憑證掃描
- **Then** 掃描結果頁出現 unmanaged 狀態的憑證項目

### IT-SC-UNMANAGED-01-02 點擊「納管」→ 憑證進入系統憑證列表
- **Given** 掃描結果有 unmanaged 憑證
- **When** 點擊該憑證的「納管」操作
- **Then** 憑證進入系統，於憑證列表以 ISSUED 狀態顯示

### IT-SC-UNMANAGED-01-03 納管後掃描結果不再顯示該憑證為 unmanaged
- **Given** 憑證已完成納管
- **When** 再次觸發掃描
- **Then** 該憑證不再出現在 unmanaged 列表

---

### IT-SC-01-01 設定合規政策 → 觸發掃描 → 不合規憑證被標注
- **Given** 已設定合規政策，Endpoint 有不符政策的憑證
- **When** 觸發 Endpoint 掃描
- **Then** 掃描結果中不合規憑證有違規標注

### IT-SC-01-02 掃描完成後憑證列表顯示不合規標記
- **Given** 掃描已完成且偵測到不合規憑證
- **When** 進入憑證列表
- **Then** 不合規憑證應有政策違規標記或特殊狀態顯示

### IT-SC-01-03 修正不合規憑證後重新掃描 → 標記消除
- **Given** 不合規憑證已被替換為合規版本
- **When** 再次觸發掃描
- **Then** 該憑證不再有違規標記

---

### IT-AU-01-01 執行寫入操作後稽核紀錄即時出現
- **Given** 已登入 admin
- **When** 執行任意寫入操作（如編輯 User 顯示名稱）並進入 /audit
- **Then** 對應操作的稽核紀錄應立即出現，不需手動重整

### IT-AU-01-02 稽核紀錄含 before/after diff 且內容正確
- **Given** 有一筆剛產生的稽核紀錄
- **When** 展開該稽核紀錄的詳細內容
- **Then** 應顯示 before 與 after 的欄位差異，且 after 值與實際操作結果一致

### IT-AU-01-03 多筆連續操作後稽核紀錄序列完整且時序正確
- **Given** 已登入 admin
- **When** 依序執行三筆不同操作（如新增 User → 編輯 Group → 修改設定）
- **Then** 稽核紀錄應有三筆，時序與操作順序一致

---

## 職責分離（SoD）

### IT-SOD-01-01 簽發請求提交者嘗試自我核准 → 系統阻擋
- **Given** 已以 admin 帳號登入，並提交一筆憑證簽發請求（CIR）
- **When** 進入核准頁，嘗試對自己提交的請求點擊「核准」
- **Then** 系統應拒絕並顯示 SoD 阻擋訊息，操作不成功；稽核紀錄記錄此次拒絕

### IT-SOD-01-02 SoD 阻擋訊息應包含拒絕原因說明
- **Given** 已提交 CIR 的 admin 嘗試自我核准
- **When** 系統拒絕後顯示錯誤訊息
- **Then** 錯誤訊息應明確說明「同一使用者不可提交與核准同一請求」，非通用錯誤

### IT-SOD-01-03 SoD 阻擋事件記錄於稽核紀錄
- **Given** admin A 嘗試自我核准並被系統阻擋
- **When** 進入稽核紀錄查詢
- **Then** 應有一筆記錄顯示：操作者=admin A、動作=自我核准嘗試、結果=拒絕

### IT-SOD-02-01 Binding 核准與部署作業核准須由不同帳號執行
- **Given** 帳號 A 提交 binding 請求，帳號 B 核准 binding
- **When** 帳號 B 嘗試同時核准後續部署作業
- **Then** 系統應依 SoD 政策判斷是否阻擋（若阻擋則顯示原因，若允許則記錄例外）

### IT-SOD-02-02 部署核准需由非部署申請者執行（雙閘驗證）
- **Given** 帳號 A 申請部署，帳號 B 為可核准者
- **When** 帳號 B 核准部署
- **Then** 部署作業執行，稽核紀錄記錄：申請者=A、核准者=B

### IT-SOD-02-03 同一帳號無法同時提交 binding 與核准部署
- **Given** 只有單一 admin 帳號
- **When** 帳號嘗試自己完成提交 binding + 核准部署的完整流程
- **Then** 至少一個步驟應被 SoD 規則阻擋

### IT-SOD-03-01 申請者無法核准自己的下載請求
- **Given** 帳號 A 申請憑證下載
- **When** 帳號 A 嘗試自我核准下載請求
- **Then** 系統應拒絕，核准須由其他授權帳號執行

### IT-SOD-03-02 下載連結為一次性且使用後失效
- **Given** 帳號 B 核准帳號 A 的下載請求，系統產生一次性下載連結
- **When** 帳號 A 使用該連結下載後，再次嘗試使用同一連結
- **Then** 第二次請求應回傳 403 或 410，連結不可重複使用

### IT-SOD-03-03 下載連結 15 分鐘 TTL 到期後 URL 無效
- **Given** 已產生一次性下載連結但尚未使用
- **When** 等待 15 分鐘後嘗試存取該連結
- **Then** 系統應回傳 403 或 410，連結已過期

---

## 跨群組隔離（IDOR）

### IT-IDOR-01-01 User 只能看到自己群組內指派給自己的憑證
- **Given** 已以 Group A 的 user 角色登入
- **When** 進入憑證列表
- **Then** 只顯示 assignee==self 且在 Group A 內的憑證，不顯示 Group B 憑證

### IT-IDOR-01-02 User 帶他群組憑證 ID 直接存取 → 404
- **Given** 已以 Group A 的 user 角色登入
- **When** 直接輸入 Group B 憑證的 order-id 嘗試存取
- **Then** 系統回傳 404（不回傳 403，不洩漏資源存在性）

### IT-IDOR-01-03 憑證列表不顯示他群組 EXPIRED 或 REVOKED 憑證
- **Given** Group B 有 EXPIRED 憑證，Group A user 已登入
- **When** 進入憑證列表
- **Then** Group B 的 EXPIRED 憑證完全不顯示（非隱藏，是完全不存在）

### IT-IDOR-02-01 Group A supervisor 的待審清單只顯示 Group A 請求
- **Given** 已以 Group A supervisor 登入
- **When** 進入待審（核准）清單
- **Then** 只顯示 Group A 的待審請求，Group B 的請求完全不出現

### IT-IDOR-02-02 Group A supervisor 帶 Group B 請求 ID 執行核准 → 被拒
- **Given** 已以 Group A supervisor 登入，取得 Group B 的待審請求 ID
- **When** 嘗試對 Group B 請求 ID 執行核准 API 呼叫
- **Then** 系統回傳 403 或 404，核准操作不成功

### IT-IDOR-02-03 Group A supervisor 帶 Group B 請求 ID 執行撤銷核准 → 被拒
- **Given** 已以 Group A supervisor 登入，取得 Group B 的已核准請求 ID
- **When** 嘗試對 Group B 請求 ID 撤銷核准
- **Then** 系統回傳 403 或 404，撤銷操作不成功

### IT-IDOR-03-01 Group A supervisor 無法存取 Group B 的 discovery PEM
- **Given** 已以 Group A supervisor 登入，Group B 有 discovery PEM
- **When** 嘗試存取 Group B 的 discovery PEM 路徑或 API
- **Then** 系統拒絕（403 或 404），PEM 內容無法取得

### IT-IDOR-03-02 憑證 Excel 匯出只含自己群組範圍的憑證
- **Given** 已以 Group A supervisor 登入
- **When** 執行憑證匯出至 Excel
- **Then** 下載的 Excel 只含 Group A 的憑證，不含 Group B 資料

### IT-IDOR-03-03 匯入 Group B 的 discovery PEM → 系統拒絕
- **Given** 已以 Group A supervisor 登入，有 Group B 的 discovery PEM 檔案
- **When** 嘗試匯入 Group B 的 PEM 至 Group A
- **Then** 系統拒絕（範圍不符），匯入失敗

### IT-IDOR-04-01 supervisor 存取稽核 API 只回傳自己群組資料
- **Given** 已以 Group A supervisor 登入
- **When** 呼叫稽核查詢 API
- **Then** 只回傳 Group A 的操作紀錄，不含 Group B 資料

### IT-IDOR-04-02 user 嘗試存取 /admin/settings → 403
- **Given** 已以 user 角色登入
- **When** 嘗試 GET /admin/settings
- **Then** 回傳 403，設定內容不回傳

### IT-IDOR-04-03 user 嘗試 POST /mail/test → 403
- **Given** 已以 user 角色登入
- **When** 嘗試 POST /mail/test
- **Then** 回傳 403，操作不執行

### IT-IDOR-05-01 supervisor 使用者管理只列出自己群組成員
- **Given** 已以 Group A supervisor 登入
- **When** 進入使用者管理頁
- **Then** 只顯示 Group A 的成員，不顯示 Group B 成員

### IT-IDOR-05-02 跨群組 user 看到聯集資料但不超過所屬群組範圍
- **Given** 某 user 同時屬於 Group A 和 Group B
- **When** 進入憑證列表
- **Then** 顯示 A+B 的憑集（屬於 self 的），但不顯示 Group C 或其他群組資料

### IT-IDOR-06-01 Group A user 存取 Group B 部署作業 → 被拒
- **Given** 已以 Group A user 登入，取得 Group B 的部署 jobId
- **When** 嘗試存取 Group B 部署作業（帶 jobId）
- **Then** 系統拒絕（403 或 404）

### IT-IDOR-06-02 user 角色呼叫僅 admin 端點 → 403（垂直權限提升防護）
- **Given** 已以 user 角色登入
- **When** 嘗試呼叫僅限 admin 的 API 端點
- **Then** 回傳 403，操作不執行，稽核紀錄記錄此次嘗試

### IT-IDOR-07-01 Group A admin 憑證列表、user 清單均只含 Group A 資料
- **Given** 已以 Group A admin 登入
- **When** 依序查看憑證列表與使用者列表
- **Then** 兩個清單均只顯示 Group A 資料，Group B 資料完全不出現

### IT-IDOR-07-02 Group A admin 帶 Group B 資源 ID 呼叫 API → 403/404
- **Given** 已以 Group A admin 登入，持有 Group B 的資源 ID
- **When** 帶 Group B 資源 ID 呼叫各類 API（憑證、user、群組）
- **Then** 全部回傳 403 或 404，無一成功

### IT-IDOR-07-03 Group A admin 稽核紀錄只含 Group A 操作
- **Given** 已以 Group A admin 登入
- **When** 查看稽核紀錄
- **Then** 只顯示 Group A 的操作紀錄，Group B 操作完全不出現

---

## MFA 認證

### IT-MFA-01-01 MFA 註冊流程完成且 TOTP 驗證成功
- **Given** 帳號尚未啟用 MFA
- **When** 進入 MFA 設定頁，掃描 QR Code 完成驗證器綁定，登出後重新登入輸入正確 TOTP
- **Then** 登入成功，session 建立，MFA 狀態顯示為已啟用

### IT-MFA-01-02 輸入錯誤 TOTP → 登入被拒
- **Given** 帳號已啟用 MFA，進入 TOTP 輸入步驟
- **When** 輸入錯誤的 TOTP 碼
- **Then** 系統拒絕登入，顯示「驗證碼不正確」，不建立 session

### IT-MFA-01-03 MFA 密鑰持久化且重新登入後仍有效
- **Given** 帳號已完成 MFA 設定，密鑰已儲存
- **When** 24 小時後再次登入輸入當下 TOTP
- **Then** TOTP 仍有效，驗證通過，session 建立

### IT-MFA-02-01 admin 強制 MFA 後非 MFA 帳號登入被阻擋
- **Given** admin 啟用強制 MFA 政策
- **When** 未設定 MFA 的帳號嘗試登入
- **Then** 系統要求先完成 MFA 設定才能繼續，或直接拒絕登入

### IT-MFA-02-02 OIDC SSO 繞過 MFA 行為明確記錄（安全降級風險）
- **Given** 已設定 OIDC SSO，帳號已啟用 MFA
- **When** 透過 OIDC SSO 流程完成登入
- **Then** 確認 MFA 是否被繞過，並在稽核紀錄中明確標記此為 SSO 登入（含 MFA 狀態）

---

## 合規進階

### IT-POL-02-01 WARN 嚴重度政策：違規請求通過但記錄警告
- **Given** 已設定一條 WARN 嚴重度政策
- **When** 提交違反 WARN 政策的憑證申請
- **Then** 申請通過，但合規警告記錄在稽核紀錄中

### IT-POL-02-02 AUDIT_ONLY 嚴重度政策：違規請求通過且稽核
- **Given** 已設定一條 AUDIT_ONLY 嚴重度政策
- **When** 提交違反 AUDIT_ONLY 政策的憑證申請
- **Then** 申請通過，稽核紀錄包含合規稽核標記

### IT-POL-02-03 BLOCK 嚴重度政策：違規請求被拒並顯示原因
- **Given** 已設定一條 BLOCK 嚴重度政策
- **When** 提交違反 BLOCK 政策的憑證申請
- **Then** 申請被拒，顯示具體政策違規原因訊息

### IT-POL-03-01 private-key.export.forbidden=true 時 UI 下載私鑰被阻擋
- **Given** 已設定 private-key.export.forbidden=true，有 ISSUED 憑證
- **When** 嘗試透過 UI 下載私鑰
- **Then** 系統拒絕，下載按鈕不可用或回傳錯誤

### IT-POL-03-02 private-key.export.forbidden=true 時 API 取得私鑰被阻擋
- **Given** 已設定 private-key.export.forbidden=true，有 ISSUED 憑證
- **When** 嘗試透過 API 取得私鑰
- **Then** API 回傳 403，私鑰內容不回傳

### IT-POL-03-03 private-key.export.forbidden=true 時含私鑰 PFX 匯出被阻擋
- **Given** 已設定 private-key.export.forbidden=true，有 ISSUED 憑證
- **When** 嘗試匯出含私鑰的 PFX 格式
- **Then** 系統拒絕 PFX 匯出，提示私鑰匯出已禁用

### IT-POL-04-01 BLOCK 政策在核准時拒絕請求並顯示違規原因給請求者
- **Given** 已設定 BLOCK 政策，提交違反政策的簽發請求
- **When** 核准流程觸發政策檢查
- **Then** 核准被拒，請求者可看到具體違規原因說明

### IT-POL-04-02 RSA-1024 憑證簽發後被標記且自動部署被抑制
- **Given** 提交 RSA-1024 憑證（繞過前端驗證），CA 完成簽發
- **When** 憑證狀態為 ISSUED
- **Then** 合規系統標記此憑證違規，自動部署被抑制；憑證狀態仍顯示 ISSUED

### IT-POL-05-01 匯入不合規 PEM 不觸發合規引擎（完全繞過）
- **Given** 有一張違反合規政策的 PEM 憑證（如 RSA-1024）
- **When** 透過匯入功能上傳此 PEM
- **Then** 匯入成功，不觸發合規政策拒絕；記錄此行為是否標記或完全無警示

---

## 稽核鏈進階

### IT-AU-02-01 撤銷流程產生三筆鏈結稽核紀錄（申請、核准、CA完成）
- **Given** 有 ISSUED 憑證，提交撤銷申請
- **When** 核准通過並 CA 完成撤銷
- **Then** 稽核紀錄含三筆：撤銷申請、核准、CA 撤銷完成，且三筆可互相溯源

### IT-AU-02-02 每筆稽核紀錄含前一步驟的參考 ID
- **Given** 撤銷流程已完成，稽核鏈已建立
- **When** 查看各筆稽核紀錄詳細內容
- **Then** 每筆含前一步驟的參考 ID 或流程串聯識別欄位

### IT-AU-02-03 稽核鏈可從第一筆追溯至最後一筆
- **Given** 完整撤銷流程的稽核鏈已建立
- **When** 從撤銷申請那筆開始，依參考 ID 追溯
- **Then** 可完整追溯至 CA 撤銷完成那筆，鏈不斷裂

### IT-AU-03-01 偵測稽核紀錄被篡改（鏈中途斷裂警示）
- **Given** 系統有完整的稽核鏈，模擬篡改其中一筆紀錄
- **When** 系統執行稽核驗證
- **Then** 系統應偵測到鏈中途斷裂並發出警示，指出異常紀錄位置

### IT-AU-03-02 刪除中間稽核紀錄後鏈斷裂被偵測
- **Given** 系統有連續三筆稽核紀錄（A→B→C）
- **When** 刪除中間紀錄 B
- **Then** 系統應偵測到 A 到 C 之間的斷裂，觸發警示

### IT-AU-04-01 user 角色存取 /audit → 403
- **Given** 已以 user 角色登入
- **When** 嘗試存取 /audit 頁面或 API
- **Then** 回傳 403，稽核內容不顯示

### IT-AU-04-02 supervisor 角色存取 /audit → 403
- **Given** 已以 supervisor 角色登入
- **When** 嘗試存取 /audit 頁面或 API
- **Then** 回傳 403，稽核內容不顯示

### IT-AU-04-03 admin 角色可存取 /audit 且可執行匯出
- **Given** 已以 admin 角色登入
- **When** 存取 /audit 頁面，並執行稽核匯出
- **Then** 頁面正常顯示，匯出檔案成功下載

---

## 批次匯入

### IT-BATCH-01-01 有效列成功匯入，不受其他失敗列影響
- **Given** 上傳含有效列與無效格式列的 Excel
- **When** 批次匯入完成
- **Then** 有效列成功匯入，無效列回傳對應錯誤，兩者互相獨立不影響

### IT-BATCH-01-02 重複 CN 列回傳重複錯誤
- **Given** 上傳含重複 CN 的 Excel（兩列 CN 相同）
- **When** 批次匯入處理重複 CN 列
- **Then** 重複列回傳「已存在」或「重複 CN」錯誤，其餘有效列不受影響

### IT-BATCH-01-03 超出群組範圍的列回傳範圍錯誤
- **Given** 上傳含超出群組授權範圍的憑證列
- **When** 批次匯入處理此列
- **Then** 回傳範圍不符錯誤，該列匯入失敗，批次結果頁顯示各列狀態

### IT-BATCH-02-01 超過列數上限的 Excel 被拒並顯示上限說明
- **Given** 準備超過系統允許列數的 Excel
- **When** 上傳至批次匯入
- **Then** 系統拒絕，顯示列數上限說明，不執行任何匯入

### IT-BATCH-02-02 超過大小限制的工作簿被拒
- **Given** 準備超過檔案大小限制的 Excel
- **When** 上傳至批次匯入
- **Then** 系統拒絕，顯示檔案大小限制說明

---

## 續約排程

### IT-RENEW-01-01 手動觸發續約後新 Order 進入核准佇列
- **Given** 有 ISSUED 憑證，已設定核准流程
- **When** 手動觸發續約
- **Then** 新 Order 進入核准佇列，狀態為待審

### IT-RENEW-01-02 對同一憑證再次觸發續約 → 去重，不產生重複 Order
- **Given** 已對某憑證觸發一次續約（Order 進入佇列）
- **When** 再次觸發同一憑證的續約
- **Then** 系統不產生第二筆 Order（去重機制），或明確顯示「已有進行中的續約」

### IT-RENEW-01-03 續約後受指派人資訊保留至新 Order
- **Given** 憑證有受指派人，觸發續約
- **When** 新 Order 建立
- **Then** 新 Order 的受指派人與原憑證相同

### IT-RENEW-02-01 Cron 後備機制處理無政策的 CN 並記錄
- **Given** 有無政策的 CN 憑證，Cron 觸發
- **When** Cron 處理無政策 CN
- **Then** 後備機制啟動並在日誌或稽核中記錄處理行為

### IT-RENEW-02-02 靜默時段內不產生新續約 Order
- **Given** 已設定靜默時段（如每日 02:00-04:00）
- **When** 在靜默時段內到期或 Cron 觸發
- **Then** 不產生新續約 Order，等待靜默時段結束

### IT-RENEW-03-01 憑證到期後新訂單被拒，既有 ISSUED 憑證狀態不變
- **Given** 憑證已到期
- **When** 嘗試提交新簽發 Order
- **Then** 被拒（到期後不可新訂），既有 ISSUED 憑證狀態仍為 ISSUED

### IT-RENEW-03-02 到期警示每門檻僅發送一次（去重）
- **Given** 憑證接近到期，每日重新掃描
- **When** 連續多天掃描觸發同一門檻（如 30 天警示）
- **Then** 30 天警示只發送一次，不重複發送

---

## 韌性 / 故障轉移

### IT-RES-01-01 CA 回傳 authz INVALID → Order 標為 FAILED
- **Given** CA Provider 回傳 authz INVALID
- **When** Order 處理此回應
- **Then** Order 狀態標為 FAILED，含 CA 回傳的失敗原因

### IT-RES-01-02 FAILED Order 含診斷訊息且 DNS 挑戰記錄已清理
- **Given** Order 已因 authz INVALID 標為 FAILED
- **When** 查看 Order 詳細頁與 DNS 記錄
- **Then** 詳細頁顯示診斷訊息；DNS 挑戰記錄已清理，不殘留

### IT-RES-02-01 CA 撤銷失敗時憑證狀態維持 ISSUED（fail-closed）
- **Given** 有 ISSUED 憑證，核准撤銷後 CA 撤銷 API 失敗
- **When** 系統處理 CA 失敗
- **Then** 憑證狀態維持 ISSUED，不標為假 REVOKED，稽核紀錄記錄失敗原因

### IT-RES-02-02 CA 撤銷成功後憑證狀態標為 REVOKED
- **Given** 有 ISSUED 憑證，核准撤銷後 CA 撤銷 API 成功
- **When** CA 確認撤銷完成
- **Then** 憑證狀態標為 REVOKED，稽核紀錄記錄完成

### IT-RES-03-01 應用程式重啟後 AcmeOrderRecoveryRunner 恢復進行中 Order
- **Given** 有 Order 處於 PROCESSING 狀態時模擬應用程式重啟
- **When** 應用程式重啟完成，AcmeOrderRecoveryRunner 啟動
- **Then** 進行中 Order 被接管並繼續完成，或被標為適當失敗狀態（不卡在 PROCESSING）

---

## 併發 / 競態

### IT-CONC-01-01 並發核准同一 CN 的兩筆 CIR → 只產生一筆 ACME Order
- **Given** 同一 CN 有兩筆待審 CIR，模擬同時送出核准請求
- **When** 兩個核准請求幾乎同時到達
- **Then** 系統只建立一筆 ACME Order，另一筆被去重或標為 DUPLICATE

### IT-CONC-01-02 去重後被拒的核准請求應有明確狀態說明
- **Given** 並發核准中，第二筆被去重
- **When** 查看第二筆請求結果
- **Then** 顯示「已有進行中的同 CN Order」或「去重拒絕」說明

### IT-CONC-02-01 並行核准同一 jobId → 只派發一次
- **Given** 同一 deploy jobId 有兩個並行核准請求
- **When** 兩個核准請求幾乎同時到達
- **Then** 只執行一次派發，第二個核准回傳「已處理」或冪等結果

### IT-CONC-02-02 一次性下載連結在並發下嚴格只允許單次使用
- **Given** 已核准的一次性下載連結，兩個請求幾乎同時使用
- **When** 兩個並發下載請求到達
- **Then** 只有一個成功，另一個回傳 403 或 410

### IT-CONC-03-01 CAS 原子操作防止雙重核准
- **Given** 兩個 session 同時嘗試核准同一筆請求
- **When** 兩個核准請求並發處理
- **Then** 只有一個成功核准，另一個回傳「已被處理」或類似錯誤

### IT-CONC-03-02 CAS 原子操作防止雙重私鑰提取
- **Given** 兩個 session 同時嘗試提取同一憑證的私鑰
- **When** 兩個提取請求並發處理
- **Then** 只有一個成功，另一個回傳錯誤（不可重複提取）

---

## 安全

### IT-SEC-01-01 同 IP 超過速率限制回傳 429 + Retry-After 標頭
- **Given** 從同一 IP 連續送出超過允許次數的登入請求
- **When** 超過速率限制門檻
- **Then** 回傳 HTTP 429，回應含 Retry-After 標頭，說明何時可重試

### IT-SEC-01-02 Retry-After 時間過後可重新嘗試登入
- **Given** 已觸發速率限制，等待 Retry-After 時間
- **When** 時間到後重新嘗試登入（正確帳密）
- **Then** 登入成功，速率限制已重置

### IT-SEC-02-01 OIDC 帶未驗證 email 的 token → 被拒
- **Given** OIDC Provider 發出含未驗證 email 的 token
- **When** 使用此 token 嘗試登入
- **Then** 系統拒絕，顯示 email 未驗證錯誤

### IT-SEC-02-02 已停用的本機帳號嘗試登入 → 被拒
- **Given** 管理員已停用某本機帳號
- **When** 該帳號嘗試使用密碼登入
- **Then** 系統拒絕，顯示帳號已停用訊息

### IT-SEC-03-01 cert-inspect 端點對低權限角色隱藏敏感欄位
- **Given** 已以低權限角色登入
- **When** 呼叫 cert-inspect 端點
- **Then** 回應不含私鑰、CA 密鑰等敏感欄位（欄位不回傳或遮蔽）

### IT-SEC-04-01 竄改 localStorage role 為 admin 後無法存取 admin 功能
- **Given** 以 user 角色登入，開啟 DevTools 修改 localStorage 的 role 欄位為 admin
- **When** 重整頁面後嘗試存取 admin 功能
- **Then** 無法存取 admin 功能，API 呼叫仍以 JWT 中的 user 角色為準

---

## 路由 / UI

### IT-UI-01-01 深層路由 hard-refresh 後頁面正確渲染
- **Given** 已登入
- **When** 直接輸入深層路由（如 /certs/123）並 hard-refresh
- **Then** 頁面正確渲染，不跳轉至 404 或空白

### IT-UI-01-02 不存在路由顯示統一 404 頁面
- **Given** 已登入
- **When** 輸入不存在的路由（如 /nonexistent-path）
- **Then** 顯示統一的 404 錯誤頁面，非空白頁或崩潰

### IT-UI-02-01 切換語系後頁面標題與選單文字更新
- **Given** 已登入，語系為中文
- **When** 切換語系至英文
- **Then** 頁面標題與選單文字更新為英文，不殘留中文

---

## 通知

### IT-NOTIFY-01-01 SMTP 暫時失敗後退避重試，最終 SENT
- **Given** SMTP 伺服器暫時不可達，已觸發通知（如到期警示）
- **When** 系統進入退避重試，SMTP 恢復正常
- **Then** 通知最終標記為 SENT 狀態，記錄每次重試嘗試

### IT-NOTIFY-01-02 SENT 狀態後同一通知不再重複發送
- **Given** 通知已成功發送（狀態 SENT）
- **When** 系統重新掃描或 Cron 再次觸發
- **Then** 不重複發送同一通知，SENT 狀態作為去重依據
