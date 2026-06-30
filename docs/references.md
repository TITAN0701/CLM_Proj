# References

本專案參考幾種 AI-assisted workflow 的做法，但有針對 QA automation 場景重新調整。

## Reference Summary

| Reference | What It Provides | How This Project Uses It |
|---|---|---|
| `snarktank/ai-dev-tasks` | 用 Markdown prompt 將 PRD 拆成 task，讓 AI 分階段執行 | 參考「文件驅動 + 任務拆解 + 人工審核」概念 |
| `liatrio-labs/spec-driven-workflow` | Spec-driven workflow，從 spec 到 tasks 到 validation | 參考 `spec -> tasks -> validate` 流程，但改成 QA 測試流程 |
| `liatrio-labs/slash-command-manager` | 管理 AI coding assistant slash commands 的工具 | 參考 slash command 結構；本專案已用 `.claude/commands/` 實作簡化版 |
| MCP | 讓 AI assistant 連接工具、資料源與上下文的標準協定 | 暫時不導入；未來若要接 Jira、GitHub、Allure server 可評估 |
| `microsoft/LLM-Rubric` | 多維度校準評估框架（ACL 2024），Rubric = 多個評分問題，各維度獨立評分後合併 | `.claude/evals/` 三層結構的設計依據；rubrics/ 的多維度設計 + criteria/ 的合併判斷邏輯 |
| `vladfeigin/llm-agents-evaluation` | YAML 設定驅動的 agent 評估框架，指標：Groundedness/Relevance/Coherence/Similarity | `.claude/evals/criteria/metrics.md` 的四維度（Completeness/Consistency/Executability/Traceability）設計來源 |

## How We Adapted These Ideas

一般 spec-driven development 通常是：

```txt
PRD / Spec
  ↓
Tasks
  ↓
Implementation
  ↓
Validation
```

本專案改成 QA automation 場景：

```txt
PM inbox
  ↓
QA/AI spec
  ↓
questions
  ↓
scenarios
  ↓
test cases
  ↓
Cypress / pytest
  ↓
Allure
  ↓
QA report / PM Word report
```

## What Is Already Adopted

已採用：

- Markdown-based workflow
- Feature workspace
- Tasks file
- Human review gates
- Slash command prompt files
- Report generation flow

## What Is Not Adopted Yet

尚未採用：

- MCP server
- Central slash command manager CLI
- Jira / GitHub issue connector
- Allure server connector
- Fully automated AI execution pipeline

## Links

- `snarktank/ai-dev-tasks`: https://github.com/snarktank/ai-dev-tasks
- `liatrio-labs/spec-driven-workflow`: https://github.com/liatrio-labs/spec-driven-workflow
- `liatrio-labs/slash-command-manager`: https://github.com/liatrio-labs/slash-command-manager
- Model Context Protocol: https://modelcontextprotocol.io
