# Risk Rules

此文件定義測試風險分級，供 AI 產生 risk notes 或 test report 時使用。
適用系統：國衛院學齡前兒童發展數位評估系統（wetpaint）

## High Risk

- 核心登入、權限驗證、帳號管理流程失敗。
- 兒童檢測資料（影片、手寫、步態）無法正確上傳或儲存。
- AI 模組（verbal expression、handwriting、gait analysis）結果異常或無法觸發。
- 題目邏輯錯誤（年齡分層、題組跳轉、觀察題組進入條件），導致評估結果不正確。
- 同一失敗影響多個角色（一般使用者 / 管理員）或多個主要檢測流程。
- API 回傳 5xx 或發生資料一致性錯誤（身分證字號格式、CASEID 流水號）。
- 安全相關規則未確認，例如 token 過期、帳號停用後仍可操作、敏感兒童資料外洩。

## Medium Risk

- 單一瀏覽器或單一角色失敗，其他情境正常。
- 非核心流程失敗（如忘記密碼、帳號邀請流程），但有 workaround。
- 重新錄製流程異常，但初次錄製正常。
- 錯誤訊息文案不一致，但功能仍可完成。
- 進度條顯示錯誤，但不影響實際檢測流程。
- 測試資料不穩定（如 fixture 缺少對應年齡層個案）。
- 需求仍有中度未確認問題（QA Assumption 尚未驗證）。

## Low Risk

- 文案、標點或非阻斷性 UI 顯示問題。
- 已知且有 workaround 的問題。
- 不影響主要檢測流程的報告或統計顯示問題。
- 管理後台非核心統計數字顯示不準確。

## 不可自動化情境（manual only）

以下情境 automation_candidate 應設為 false：

- 需實際錄製影片（video-recording、gait-analysis、verbal-expression）
- 需 AI 模組實際分析完成才能驗證結果
- 需人眼判斷影片畫質、輔助框比例等視覺品質
- 涉及「開始測驗 / 開始檢測」操作（SIT 環境限制）
- 非同步上傳等待外部 API 回應

## Report Rule

AI 產生風險說明時，必須說明：

- 風險等級
- 影響範圍
- 判斷依據
- 建議 owner
- 是否建議 release
