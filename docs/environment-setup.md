# Environment Setup

此文件說明如何把本專案連到實際被測產品。

## Local Environment

複製範本：

```powershell
Copy-Item .env.example .env
```

填入實際測試環境：

```env
CYPRESS_BASE_URL=https://your-site.example.com
API_BASE_URL=https://api-staging.example.com
TEST_USER_EMAIL=your_test_email_or_phone
TEST_USER_PASSWORD=your_test_password
TEST_ENV=staging
```

注意：

- `.env` 不應提交到 Git。
- 真實帳密應使用測試帳號，不可使用正式帳號。
- 若環境需要 OTP、MFA 或 captcha，需先和工程師確認測試繞過方式。

## Cypress

Cypress 使用：

```txt
CYPRESS_BASE_URL
```

本機執行：

```powershell
$env:CYPRESS_BASE_URL="https://staging.example.com"
npm run test:e2e
```

## pytest API

pytest 使用：

```txt
API_BASE_URL
```

本機執行：

```powershell
$env:API_BASE_URL="https://api-staging.example.com"
pytest
```

## GitHub Actions Secrets

GitHub repo 需要設定（4 個，名稱如下）：

```txt
CYPRESS_BASE_URL
API_BASE_URL
CYPRESS_TEST_USER_EMAIL
CYPRESS_TEST_USER_PASSWORD
```

CI workflow 會自動將 `CYPRESS_TEST_USER_EMAIL` / `CYPRESS_TEST_USER_PASSWORD` 同時對應給 Cypress 與 pytest 使用，只需設這 4 個 Secret。

設定位置：

```txt
GitHub Repository
  -> Settings
  -> Secrets and variables
  -> Actions
```

## Required Product Information

在正式撰寫自動化前，需要確認：

- Web URL
- API base URL
- 測試帳號
- 測試資料建立方式
- selector / data-testid 規範
- 測試環境是否穩定
- 是否有 captcha / MFA / email verification
- 是否可以重設測試資料
