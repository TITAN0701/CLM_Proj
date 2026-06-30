# Module: Config Loader

此模組定義如何從 `config.json` 讀取專案設定，供所有 command 使用。

## 使用方式

在 command 開頭加入：「先讀 `.claude/modules/config-loader.md` 載入專案設定」

## 讀取目標

```txt
config.json
```

## 常用設定對照

| 用途 | config.json 路徑 |
|------|-----------------|
| 專案名稱 | `project.name` |
| SIT URL | `env.sitUrl` |
| PM inbox 路徑 | `paths.pmInbox` |
| Spec 路徑 | `paths.specs` |
| 自動化 E2E 路徑 | `paths.automationE2E` |
| Snapshot 路徑 | `paths.snapshots` |
| 報告輸出路徑 | `paths.generatedQA` / `paths.generatedPM` |
| Skip 標記 | `automation.skipMarker` |
| 報告狀態值 | `reports.statusValues` |

## 換專案時

執行 `/project-init` 會更新 `config.json`，所有 command 自動套用新設定，不需逐一修改 command 檔。

## 適用 Commands

所有 command 均可讀取，特別重要的是：
- `/project-init` — 寫入新設定
- `/QA-5-generate-automation` — 讀取 snapshot 路徑、skipMarker
- `/QA-6-generate-report` — 讀取報告路徑、statusValues
- `/playwright-smoke-test` — 讀取 sitUrl、pagesFile
