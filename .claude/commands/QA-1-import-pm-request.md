# QA-1 Import PM Request

> ⚠️ **Pipeline 內部子步驟** — 請勿直接呼叫。應使用 `/QA-pipeline-spec`，由 pipeline 自動載入此步驟。

> 執行前先讀：`.claude/modules/config-loader.md`、`.claude/modules/eval-loader.md`

You are helping QA import PM inbox requirements into the QA/AI workspace.

## Goal

Inspect PM inbox files and guide the user to run:

```powershell
.\scripts\new-feature-from-inbox.ps1
```

Arguments:

```txt
$ARGUMENTS
```

## Rules

- PM inbox may contain one feature or a batch of requirements.
- If the inbox file contains a batch, identify suggested feature splits.
- Do not create automation code.
- Do not overwrite existing `qa-workspace/specs/{feature}` folders.
- Ask for explicit confirmation before creating or changing files if the action is destructive or ambiguous.

## Expected Output

Provide:

- Which PM inbox files exist.
- Which are already imported.
- Which are new.
- Suggested feature names if the file contains multiple requirements.
- Next command to run.

若 `qa-workspace/specs/{feature}/spec.md` 已存在，對照 `.claude/evals/rubrics/spec.md` 執行 spec 評估，輸出結果代碼。`SPEC_INCOMPLETE` 時列出缺少項目，供使用者補充後再繼續。

