# Bug Report: Endpoint 管理 — IT-DP-NEG-02

**ID**: BUG-AUTO-006
**TC**: IT-DP-NEG-02
**嚴重程度**: Medium
**狀態**: Open
受影響功能: Endpoint 管理
**日期**: 2026-06-25
**來源**: Cypress 自動化測試失敗（自動產出）

---

## 問題描述

前端對 Webhook Endpoint 的 URL 欄位缺乏格式驗證，填入非 URL 格式字串後仍可儲存成功，表單未阻擋。

> 測試案例：Endpoint 管理 IT-DP-NEG-02: 新增 webhook Endpoint 填無效 URL → 前端驗證阻擋

## 重現步驟

1. 以 admin 身分登入系統
2. 前往/admin/endpoints（Endpoint 管理頁）
3. 觀察頁面是否正確載入並顯示預期資料

## 預期結果

Endpoint 管理 頁面應正確顯示所有相關資料（包含「新增 Endpoint」）。

## 實際結果

頁面載入後，找不到預期應顯示的「新增 Endpoint」。

## 影響範圍

- 影響功能：Endpoint 管理
- 影響頁面：/admin/endpoints（Endpoint 管理頁）
- 影響層級：功能異常（需 QA 確認是否為環境資料問題或功能缺陷）

## 環境

- 測試環境：SIT（http://192.168.0.122:19010）
- 偵測時間：2026-06-25

## 技術細節（QA 參考）

```
Timed out retrying after 10000ms: Expected to find content: '新增 Endpoint' within the selector: 'h3' but never did.
```