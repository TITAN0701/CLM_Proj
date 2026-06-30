/**
 * audit-claude-docs.js
 * 掃描 .claude/ 設定檔與 CLAUDE.md，比對現況自動修正過時內容。
 *
 * 用法：
 *   node scripts/audit-claude-docs.js           ← 掃描 + 自動修正
 *   node scripts/audit-claude-docs.js --dry-run ← 只列出問題，不寫入
 *
 * 修正完成後輸出：
 *   artifacts/raw/audit-claude-docs.md          ← 修正摘要
 */

const fs   = require("node:fs");
const path = require("node:path");

const root    = path.join(__dirname, "..");
const dryRun  = process.argv.includes("--dry-run");
const logLines = [];

// ─────────────────────────────────────────────────────────────
// 掃描目標
// ─────────────────────────────────────────────────────────────
const SCAN_DIRS = [
  path.join(root, ".claude/commands"),
  path.join(root, ".claude/modules"),
];
const SCAN_FILES_EXTRA = [
  path.join(root, "CLAUDE.md"),
];

function collectFiles() {
  const files = [...SCAN_FILES_EXTRA];
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) files.push(path.join(dir, f));
    }
  }
  return files;
}

// ─────────────────────────────────────────────────────────────
// 現況事實（從 repo 動態讀取）
// ─────────────────────────────────────────────────────────────
function getActualSpecFiles() {
  const specDir = path.join(root, "automation/e2e/specs");
  if (!fs.existsSync(specDir)) return [];
  return fs.readdirSync(specDir)
    .filter(f => f.endsWith(".cy.ts"))
    .map(f => f.replace(/\.cy\.ts$/, ""));
}

function getActualScripts() {
  const scriptDir = path.join(root, "scripts");
  if (!fs.existsSync(scriptDir)) return [];
  return fs.readdirSync(scriptDir);
}

function getActualPipelineFeatures() {
  const stateFile = path.join(root, "qa-workspace/.pipeline-state.json");
  if (!fs.existsSync(stateFile)) return [];
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    return Object.keys(state.features || {});
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────
// 規則定義
// 每條規則：{ id, desc, match(content), fix(content) → newContent | null, severity }
// severity: "auto" = 自動修正, "warn" = 只警告
// ─────────────────────────────────────────────────────────────
function buildRules(actualSpecs, actualFeatures) {
  // 舊系統 feature 名稱（非 RXCLM）
  const STALE_FEATURES = [
    "login", "card-matching", "register", "account-register",
    "re-recording", "verbal-expression", "admin-backend",
    "question-content", "question-logic", "gait-analysis",
    "forgot-password", "TC-LOGIN-006",
  ];

  // 已廢除的腳本或產物
  const DEPRECATED_SCRIPTS = [
    "export-pm-report-docx.ps1",   // Word 匯出已廢除（QA-6 已說明）
    "test-report.md",               // 廢除的中間產物
    "failure-analysis.md",
    "release-summary.md",
  ];

  // pipeline-state 範例中的過時 feature 清單（用實際 feature 替換範例）
  const STALE_PIPELINE_EXAMPLE = `"login":         { "qa5": "done"`;
  const ACTUAL_PIPELINE_EXAMPLE = (() => {
    if (actualFeatures.length === 0) return null;
    const sample = actualFeatures.slice(0, 2);
    return sample.map(f => `    "${f}": { "qa5": "done", "tests_run": "done", "pass": 1, "pending": 0, "fail": 0 }`).join(",\n");
  })();

  return [
    // ── 規則 1：兒童發展量表遺留規則（與 RXCLM 無關）
    {
      id: "stale-child-exam-rules",
      desc: "playwright-smoke-test.md 含兒童量表規則（createChild/影片錄製/測驗個案）",
      severity: "auto",
      match: (c) => /createChild|supine|gait|startExamFor|verbal-expression|walk-fb|walk-side/.test(c),
      fix: (c) => {
        // 移除與兒童量表相關的 Rules 條目（bullet 行）
        return c
          .replace(/^- \*\*測驗個案\*\*：每次執行前.*\n/gm, "")
          .replace(/^- \*\*影片題無法跳過\*\*：supine.*\n/gm, "")
          .replace(/^- \*\*選擇題.*答題速度.*\n/gm, "")
          .replace(/^- \*\*影片錄製模組.*\n/gm, "")
          .replace(/^- \*\*測驗流程中每一題.*\n/gm, "")
          .replace(/\(可用.*批次作答.*\)\n/gm, "");
      },
    },

    // ── 規則 2：舊系統 feature 名稱出現在範例中
    {
      id: "stale-feature-names-in-example",
      desc: `pipeline-state 範例含舊系統 feature（${STALE_FEATURES.slice(0,4).join(", ")} 等）`,
      severity: "auto",
      match: (c) => STALE_FEATURES.some(f => c.includes(`"${f}"`)),
      fix: (c) => {
        // 只替換 JSON code block 內的 feature 範例，保留 RXCLM 實際 feature
        // 找到 pipeline-state 範例 JSON block 並替換其中的 features 部分
        return c.replace(
          /"login":\s*\{[^}]+\}[,\s\n]*"card-matching":\s*\{[^}]+\}/g,
          ACTUAL_PIPELINE_EXAMPLE ||
          `"CA 機構": { "qa5": "done", "tests_run": "done", "pass": 5, "pending": 0, "fail": 0 },\n    "Account 詳細": { "qa5": "done", "tests_run": "done", "pass": 4, "pending": 0, "fail": 0 }`
        );
      },
    },

    // ── 規則 3：legitimate_skip 舊 feature 清單
    {
      id: "stale-legitimate-skip-features",
      desc: "pending_breakdown.legitimate_skip.features 含舊系統 feature 名稱",
      severity: "auto",
      match: (c) => c.includes('"login(1)"') || c.includes('"card-matching(5)"') || c.includes('"re-recording(2)"'),
      fix: (c) => {
        return c.replace(
          /"features":\s*\["login\(1\)"[^\]]*\]/,
          `"features": ["匯入既有憑證(2)", "部署核准(2)", "我的帳號(2)"]`
        );
      },
    },

    // ── 規則 4：QA-5 Step 5 用全跑而非 --spec 個別執行
    {
      id: "qa5-step5-no-spec",
      desc: "QA-5 Step 5 執行指令缺少 --spec 參數（應改為個別 spec 執行）",
      severity: "auto",
      match: (c) => /### Step 5[\s\S]{0,200}npm run test:e2e\s*\n/.test(c),
      fix: (c) => {
        return c.replace(
          /```powershell\s*\nnpm run test:e2e\s*\n```/,
          "```powershell\nnpm run test:e2e -- --spec \"automation/e2e/specs/{feature}.cy.ts\"\n```"
        );
      },
    },

    // ── 規則 5：CLAUDE.md 缺少 auto-fix.js 的腳本規則庫指引
    {
      id: "claude-md-missing-auto-fix-ref",
      desc: "自動化修正機制章節缺少「規則庫：scripts/auto-fix.js → inferFix()」說明",
      severity: "warn",
      match: (c) => c.includes("自動化修正機制") && !c.includes("inferFix"),
      fix: null,
    },

    // ── 規則 6：廢除腳本仍被引用
    {
      id: "deprecated-script-reference",
      desc: `引用已廢除的腳本或產物（${DEPRECATED_SCRIPTS.join(", ")}）`,
      severity: "warn",
      match: (c) => DEPRECATED_SCRIPTS.some(s => c.includes(s) && !c.includes("已廢除") && !c.includes("廢除")),
      fix: null,
    },

    // ── 規則 7：pipeline-state.json 範例中的 totals 數字與現況不符
    {
      id: "stale-totals-in-example",
      desc: "pipeline-state 範例的 totals 數字過時（pass:34 pending:23 specs:58）",
      severity: "auto",
      match: (c) => c.includes('"pass": 34, "pending": 23') || c.includes('"specs": 58'),
      fix: (c) => {
        return c
          .replace(/"pass": 34, "pending": 23, "fail": 0, "specs": 58, "playwright_verified": 36/g,
            '"pass": 37, "pending": 28, "fail": 0, "specs": 65, "playwright_verified": 37')
          .replace(/"pass": 34, "pending": 23/g, '"pass": 37, "pending": 28');
      },
    },

    // ── 規則 8b：範例表格中的舊系統 feature 行（table rows）
    {
      id: "stale-feature-table-rows",
      desc: "摘要表格範例含舊系統 feature（login/card-matching/gait-analysis）",
      severity: "auto",
      match: (c) => /\|\s*login\s*\|/.test(c) || /\|\s*card-matching\s*\|/.test(c) || /\|\s*gait-analysis\s*\|/.test(c),
      fix: (c) => {
        return c
          .replace(/^\| login\s+\|.*\n/gm, "| CA 機構              | ✅ done   | 5    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |\n")
          .replace(/^\| forgot-password\s+\|.*\n/gm, "| Account 詳細         | ✅ done   | 4    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |\n")
          .replace(/^\| card-matching\s+\|.*\n/gm, "| 憑證列表             | ✅ done   | 5    | 0       | 0    | ⏭️ 跳過   | ⏭️ 跳過   |\n")
          .replace(/^\| gait-analysis\s+\|.*\n/gm, "| 申請新憑證           | ⏳ 未完成  | -    | -       | -    | 🔄 產出   | 🔄 執行   |\n");
      },
    },

    // ── 規則 8：pipeline-state 範例 pipeline_id 日期過時
    {
      id: "stale-pipeline-id-date",
      desc: "pipeline-state 範例的 pipeline_id 日期（2026-06-15）已過時",
      severity: "auto",
      match: (c) => c.includes('"pipeline_id": "2026-06-15-001"'),
      fix: (c) => c.replace(
        /"pipeline_id": "2026-06-15-001"/g,
        '"pipeline_id": "PIPE-RXCLM-20260622-001"'
      ).replace(
        /"started_at": "2026-06-15T05:30:00\+08:00"/g,
        '"started_at": "2026-06-22T08:00:00+08:00"'
      ).replace(
        /"last_updated": "2026-06-15T16:00:00\+08:00"/g,
        '"last_updated": "2026-06-22T16:00:00+08:00"'
      ),
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────
console.log(`\n🔍 audit-claude-docs.js ${dryRun ? "[DRY-RUN]" : "[AUTO-FIX]"}\n`);

const actualSpecs    = getActualSpecFiles();
const actualFeatures = getActualPipelineFeatures();
const rules          = buildRules(actualSpecs, actualFeatures);
const files          = collectFiles();

console.log(`  📂 掃描檔案：${files.length} 個`);
console.log(`  📋 實際 spec：${actualSpecs.join(", ")}`);
console.log(`  📋 實際 feature：${actualFeatures.join(", ")}\n`);
logLines.push(`# audit-claude-docs 修正摘要`);
logLines.push(`> 執行時間：${new Date().toISOString()}`);
logLines.push(`> 模式：${dryRun ? "dry-run（只列問題，未寫入）" : "auto-fix（自動修正）"}\n`);

let totalIssues = 0;
let totalFixed  = 0;

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  const relPath = path.relative(root, filePath);
  let content   = fs.readFileSync(filePath, "utf-8");
  let modified  = false;
  const fileIssues = [];

  for (const rule of rules) {
    if (!rule.match(content)) continue;

    totalIssues++;
    fileIssues.push(rule);

    if (rule.severity === "auto" && rule.fix) {
      const newContent = rule.fix(content);
      if (newContent !== content) {
        content  = newContent;
        modified = true;
        totalFixed++;
        console.log(`  ✅ [${relPath}] ${rule.desc}`);
        logLines.push(`- ✅ **${relPath}**：${rule.desc}`);
      } else {
        console.log(`  ⚠️  [${relPath}] ${rule.desc}（規則命中但替換字串未找到）`);
        logLines.push(`- ⚠️  **${relPath}**：${rule.desc}（命中但替換未生效，請手動確認）`);
      }
    } else {
      console.log(`  ⚠️  [${relPath}] ${rule.desc}（需手動確認）`);
      logLines.push(`- ⚠️  **${relPath}**：${rule.desc}（warn，需手動確認）`);
    }
  }

  // 寫回檔案
  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

// ─────────────────────────────────────────────────────────────
// 完成摘要
// ─────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`  發現問題：${totalIssues} 個`);
console.log(`  自動修正：${totalFixed} 個`);
console.log(`  需手動確認：${totalIssues - totalFixed} 個`);
if (dryRun) console.log(`  ℹ️  dry-run 模式，未寫入任何檔案`);

logLines.push(`\n---`);
logLines.push(`**發現問題：${totalIssues} 個 ／ 自動修正：${totalFixed} 個 ／ 需手動：${totalIssues - totalFixed} 個**`);

// 產出摘要
const outDir  = path.join(root, "artifacts/raw");
const outPath = path.join(outDir, "audit-claude-docs.md");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, logLines.join("\n"), "utf-8");
console.log(`\n  📋 摘要：${outPath}\n`);
