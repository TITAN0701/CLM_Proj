# Project Init

將此 QA 框架重置為新專案，清空所有舊內容但保留框架結構與工具。

## Goal

引導使用者輸入新專案設定，然後執行清空與初始化：

1. 收集新專案資訊
2. 確認清空範圍
3. 執行 `.\scripts\project-init.ps1`

## Arguments

```txt

```

- 不帶參數：互動式引導
- 帶參數（如 `新系統名稱`）：直接帶入專案名稱，其餘資訊仍互動收集

---

## Steps

### Step 1 — 收集新專案資訊

依序詢問以下資訊（缺什麼問什麼，不要一次全問）：

1. **專案名稱**（中文或英文，例如：國衛院成人健康評估系統）
2. **專案代號**（英文小寫，用於資料夾/檔名，例如：adult-health）
3. **SIT 環境 URL**（例如：https://sit-xxx.nhri.org.tw/）
4. **測試帳號 Email / 手機**
5. **測試帳號密碼**
6. **API Base URL**（如果有，沒有可留空）

收集完後**列出摘要請使用者確認**，格式如下：

```
即將初始化新專案：

  專案名稱：{名稱}
  專案代號：{代號}
  SIT URL：{url}
  測試帳號：{email}
  API URL：{api_url 或 無}

以下內容將被清空：
  ✗ pm-inbox/（保留 README.md）
  ✗ qa-workspace/specs/（保留 _template/）
  ✗ automation/e2e/specs/*.cy.ts
  ✗ automation/api/tests/*.py
  ✗ artifacts/generated/
  ✗ artifacts/raw/

以下內容將被保留：
  ✓ scripts/
  ✓ .claude/commands/
  ✓ qa-knowledge/
  ✓ automation/e2e/pages/、flows/、fixtures/
  ✓ package.json、cypress.config.ts

確認執行？(y/n)
```

### Step 2 — 使用者確認後執行腳本

使用者輸入 `y` 後，依序執行：

**2a — 更新 config.json**

讀取 `config.json`，更新以下欄位：

```json
{
  "project": { "name": "{專案名稱}", "code": "{專案代號}" },
  "env": { "sitUrl": "{SIT URL}", "testEmail": "{測試帳號}", "apiBaseUrl": "{API URL}" }
}
```

**2b — 執行清空腳本**

```powershell
.\scripts\project-init.ps1 `
  -ProjectName "{專案名稱}" `
  -ProjectCode "{專案代號}" `
  -SitUrl "{SIT URL}" `
  -TestEmail "{測試帳號}" `
  -TestPassword "{密碼}" `
  -ApiUrl "{API URL}"
```

### Step 3 — 回報結果

腳本執行完成後，提示使用者下一步：

```
✅ 專案初始化完成！

新專案：{專案名稱}（{代號}）
環境：{SIT URL}

下一步：
1. 將 PM 需求文件放入 pm-inbox/
2. 執行 /QA-1-import-pm-request 開始建立 spec
```

---

## Rules

- 執行腳本前**必須取得使用者明確確認**（y/n）
- 若使用者回答 `n`，中止並提示「已取消，未做任何變更」
- 密碼不顯示在摘要中（以 `****` 遮蓋）
- 專案代號自動轉小寫並將空格換成 `-`
- **不可直接刪除 `.env`**，只更新內容
