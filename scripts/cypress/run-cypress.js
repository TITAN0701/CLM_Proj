const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { DESCRIBE_TO_FEATURE, DESCRIBE_TO_URL: DESCRIBE_TO_URL_CHECK, FEATURE_PAGE } = require("../shared/describe-maps");

const projectRoot = path.join(__dirname, "../..");

// 自動載入 .env
const envFile = path.join(projectRoot, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.trim().split("=");
    if (key && !key.startsWith("#") && rest.length) {
      process.env[key] = rest.join("=");
    }
  });
}

// spec 檔名 → pipeline-state feature key 對照表
const SPEC_TO_FEATURE = {
  "admin-ca-providers":      "CA 機構",
  "admin-dns-providers":     "DNS 機構",
  "admin-endpoints":         "Endpoint 管理",
  "admin-license":           "授權管理",
  "admin-approvals":         "部署核准",
  "admin-scan-policies":     "合規政策",
  "admin-users-groups":      "Group 管理",
  "accounts":                "Account 詳細",
  "audit-settings":          "稽核紀錄",
  "certs-list":              "憑證列表",
  "certs-new":               "申請新憑證",
  "dashboard":               "儀表板",
  "me":                      "我的帳號",
};

// DESCRIBE_TO_FEATURE / DESCRIBE_TO_URL_CHECK 來自 describe-maps.js（單一來源）

const cypressPackageJson = require.resolve("cypress/package.json");
const cypressBin = path.join(path.dirname(cypressPackageJson), "bin", "cypress");
const args = process.argv.slice(2);
const env = { ...process.env };

// 把 TEST_USER_EMAIL / TEST_USER_PASSWORD 對應到 Cypress env 變數
if (env.TEST_USER_EMAIL) env.CYPRESS_TEST_USER_EMAIL = env.TEST_USER_EMAIL;
if (env.TEST_USER_PASSWORD) env.CYPRESS_TEST_USER_PASSWORD = env.TEST_USER_PASSWORD;

delete env.ELECTRON_RUN_AS_NODE;

const resultJsonPath = path.join(projectRoot, "artifacts/raw/cypress-run-result.json");

const isRunMode = args[0] === "run";
const cypressArgs = [...args];

// ─────────────────────────────────────────────
// Layer 2：執行前靜態檢查 + 自動清除殘留 TC
// 若 cy.visit('/xxx') 與 describe 對應頁面不符 → 直接從 spec 刪除該 it block
// ─────────────────────────────────────────────
if (isRunMode) {
  const specIdx = args.indexOf("--spec");
  const specArg = specIdx !== -1 ? args[specIdx + 1] : null;
  if (specArg) {
    const specFiles = specArg.split(",").map(s => s.trim());
    for (const sf of specFiles) {
      const sfPath = path.join(projectRoot, sf);
      if (!fs.existsSync(sfPath)) continue;
      let content = fs.readFileSync(sfPath, "utf-8");

      // 收集本 spec 所有 describe 對應的 allowedUrls（支援多個 describe）
      const describeNames = [...content.matchAll(/describe\(['"]([^'"]+)['"]/g)].map(m => m[1]);
      const allowedUrls = describeNames
        .map(n => DESCRIBE_TO_URL_CHECK[n])
        .filter(Boolean);
      if (allowedUrls.length === 0) continue;

      // 找出所有 it block，偵測殘留並直接移除
      const itPattern = /(\n  it(?:\.skip)?\(['"]([\s\S]*?)['"]\s*,[\s\S]*?=>\s*\{[\s\S]*?\n  \}\);)/g;
      let m;
      const strayBlocks = [];
      while ((m = itPattern.exec(content)) !== null) {
        const fullBlock = m[1];
        const tcTitle   = m[2];
        const visits    = [...fullBlock.matchAll(/cy\.visit\(['"]([^'"]+)['"]\)/g)].map(v => v[1]);
        // 殘留判斷：visit 的 URL 不在本 spec 任何 describe 的 allowedUrls 中
        const stray = visits.filter(v => !allowedUrls.some(u => v.startsWith(u)));
        if (stray.length > 0) strayBlocks.push({ fullBlock, tcTitle, stray });
      }
      if (strayBlocks.length > 0) {
        console.log(`\n🧹 [執行前清除] ${sf} 發現 ${strayBlocks.length} 個殘留 TC，自動移除：`);
        for (const { fullBlock, tcTitle, stray } of strayBlocks) {
          console.log(`   - "${tcTitle}" → cy.visit(${stray.join(",")}) 與 spec 頁面不符`);
          content = content.replace(fullBlock, "");
        }
        fs.writeFileSync(sfPath, content, "utf-8");
        console.log(`   ✅ spec 已更新，移除 ${strayBlocks.length} 個殘留 TC\n`);
      }
    }
  }
}

// run 模式：清空 allure-results 確保 Allure Report 只呈現本次結果
if (isRunMode) {
  const allureResultsPath = path.join(projectRoot, "artifacts/raw/allure-results");
  if (fs.existsSync(allureResultsPath)) {
    fs.rmSync(allureResultsPath, { recursive: true, force: true });
  }
  fs.mkdirSync(allureResultsPath, { recursive: true });
}

// run 模式：用 json reporter，stdout 收回來解析
if (isRunMode) {
  cypressArgs.push("--reporter", "json");
}

const result = spawnSync(process.execPath, [cypressBin, ...cypressArgs], {
  env,
  stdio: isRunMode ? ["inherit", "pipe", "pipe"] : "inherit",
});

if (isRunMode) {
  // stderr（DevTools 訊息等）直接印出
  if (result.stderr) process.stderr.write(result.stderr);

  // stdout 混合了 Cypress 標頭文字 + json reporter 輸出
  const stdout = result.stdout ? result.stdout.toString() : "";
  process.stdout.write(stdout);

  // 從 stdout 找最後一個含 "stats" 的完整 JSON 物件
  // 用行掃描法：找以 { 開頭的行，嘗試從該位置往後 JSON.parse
  let jsonParsed = null;
  const lines = stdout.split("\n");
  for (let li = 0; li < lines.length; li++) {
    if (!lines[li].trimStart().startsWith("{")) continue;
    // 從這行開始往後累積，直到 JSON.parse 成功
    let buf = "";
    for (let lj = li; lj < lines.length; lj++) {
      buf += lines[lj] + "\n";
      try {
        const obj = JSON.parse(buf);
        if (obj.stats) { jsonParsed = obj; break; }
      } catch {}
    }
    if (jsonParsed) break;
  }

  if (jsonParsed) {
    fs.mkdirSync(path.dirname(resultJsonPath), { recursive: true });
    fs.writeFileSync(resultJsonPath, JSON.stringify(jsonParsed, null, 2), "utf-8");
    console.log(`\n✅ 結果已存：${resultJsonPath}`);
    autoUpdatePipelineState(args, jsonParsed);

    // 有失敗 → 自動執行 auto-fix.js（每個 spec 分開跑）
    if (jsonParsed.stats.failures > 0) {
      generateFailureReport(jsonParsed, args);
      const specIdx = args.indexOf("--spec");
      const specArg = specIdx !== -1 ? args[specIdx + 1] : null;
      if (specArg) {
        const autoFixScript = path.join(__dirname, "auto-fix.js");
        const specList = specArg.split(",").map(s => s.trim()).filter(Boolean);
        for (const singleSpec of specList) {
          console.log(`\n🔧 偵測到失敗，啟動 auto-fix：${singleSpec}\n`);
          spawnSync(process.execPath, [autoFixScript, "--spec", singleSpec], {
            env: { ...process.env },
            stdio: "inherit",
          });
        }
      }
    }
  } else {
    console.log("⚠️  無法從 stdout 萃取 JSON，跳過 pipeline-state 更新");
  }
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

// ─────────────────────────────────────────────
function generateFailureReport(runData, cypressArgs) {
  const failures = runData.failures || [];
  if (failures.length === 0) return;

  const specIdx = cypressArgs.indexOf("--spec");
  const specArg = specIdx !== -1 ? cypressArgs[specIdx + 1] : "unknown";

  const lines = [];
  lines.push(`# Cypress 失敗報告`);
  lines.push(`\n> spec: \`${specArg}\``);
  lines.push(`> 失敗數: ${failures.length} / ${runData.stats.tests}`);
  lines.push(`> 產出時間: ${new Date().toISOString()}\n`);
  lines.push(`---\n`);

  for (const f of failures) {
    const title = f.fullTitle || f.title || "unknown";
    const err = f.err || {};
    const msg = err.message || err.stack || String(err);

    // 從錯誤訊息萃取 selector 和期望值
    const selectorMatch = msg.match(/selector[:\s]+[`'"]?([^`'">\n]+)[`'"]?/i)
      || msg.match(/find element[:\s]+[`'"]([^`'"]+)[`'"]/)
      || msg.match(/Expected to find[^:]*:\s*[`'"]([^`'"]+)[`'"]/);
    const selector = selectorMatch ? selectorMatch[1].trim() : null;

    const describeName = title.split(" ")[0];
    const pageUrl = DESCRIBE_TO_URL_CHECK[describeName] || "（未知頁面）";

    lines.push(`## ❌ ${title}`);
    lines.push(`\n**錯誤訊息：**`);
    lines.push("```");
    lines.push(msg.slice(0, 800));
    lines.push("```\n");

    if (selector) {
      lines.push(`**失敗 selector：** \`${selector}\``);
    }
    lines.push(`**推算頁面：** \`${pageUrl}\``);
    lines.push(`\n**建議動作：**`);
    lines.push(`1. 用 Playwright MCP 截圖：navigate to \`${pageUrl}\``);
    lines.push(`2. 確認實際 DOM 結構中是否有 \`${selector || "對應元素"}\``);
    lines.push(`3. 將正確 selector 告知 AI 修正 spec\n`);
    lines.push(`---\n`);
  }

  const reportPath = path.join(projectRoot, "artifacts/raw/failure-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`\n📋 失敗報告已產出：${reportPath}`);
  console.log(`   → 把報告內容貼給 AI，AI 會用 Playwright 確認 DOM 並修正 spec\n`);

  // 自動為每個失敗 TC 建立 Bug Report md
  generateAutoBugReports(failures);
}

// ─────────────────────────────────────────────
function generateAutoBugReports(failures) {
  const bugsDir = path.join(projectRoot, "artifacts/generated/qa/bugs");
  fs.mkdirSync(bugsDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);

  // 迴圈外計算一次，避免同批次多個失敗 TC 讀到同一個 existing 導致 ID 重複
  let nextBugNum = fs.readdirSync(bugsDir).filter(f => f.startsWith("BUG-AUTO-")).length + 1;

  for (const f of failures) {
    const title = f.fullTitle || f.title || "unknown";
    const err = f.err || {};
    const msg = err.message || err.stack || String(err);

    // 從 fullTitle 解析 TC ID（格式：describe TC-Fxx-yy: 或 IT-xx-yy: 標題）
    const tcIdMatch = title.match(/(?:TC|IT)-[A-Z0-9]+-[A-Z0-9-]+/);
    const tcId = tcIdMatch ? tcIdMatch[0] : "TC-UNKNOWN";

    const describeKey = Object.keys(DESCRIBE_TO_FEATURE).find(k => title.startsWith(k));
    const feature = describeKey ? DESCRIBE_TO_FEATURE[describeKey] : "未知功能";

    // 從 TC ID 推算優先度（P1→High，其他→Medium）
    const severity = tcId.endsWith("-01") || tcId.endsWith("-02") ? "High" : "Medium";

    // 從錯誤訊息萃取 selector 或期望值
    const selectorMatch = msg.match(/Expected to find content: '([^']+)'/)
      || msg.match(/find element[:\s]+[`'"]([^`'"]+)[`'"]/)
      || msg.match(/selector[:\s]+[`'"]?([^`'">\n]+)[`'"]?/i);
    const selector = selectorMatch ? selectorMatch[1].trim() : "（見錯誤訊息）";

    const bugNum = String(nextBugNum).padStart(3, "0");
    const fileName = `BUG-AUTO-${tcId}-${today}.md`;
    const filePath = path.join(bugsDir, fileName);

    // FEATURE_PAGE 來自 describe-maps.js（單一來源）
    const pageName = FEATURE_PAGE[feature] || feature;

    // 將技術錯誤訊息轉為業務描述
    let businessDesc = "自動化測試驗證失敗，頁面功能可能無法正常運作。";
    let actualResult = "測試執行後，預期出現的內容未出現或功能未如預期運作。";
    let expectedResult = `${feature} 功能應正常顯示，所有必要資訊應可見。`;
    let steps = [
      `1. 以 admin 身分登入系統`,
      `2. 前往${pageName}`,
      `3. 觀察頁面是否正確載入並顯示預期資料`,
    ];

    if (msg.includes("Expected to find content")) {
      const contentMatch = msg.match(/Expected to find content: '([^']+)'/);
      const content2 = contentMatch ? contentMatch[1] : selector;
      businessDesc = `${feature} 頁面上應顯示的內容「${content2}」未出現，可能是資料未載入或功能異常。`;
      actualResult = `頁面載入後，找不到預期應顯示的「${content2}」。`;
      expectedResult = `${feature} 頁面應正確顯示所有相關資料（包含「${content2}」）。`;
    } else if (msg.includes("Timed out")) {
      businessDesc = `${feature} 頁面載入逾時或元素未出現，可能是系統回應緩慢或功能異常。`;
      actualResult = `等待頁面回應超時，功能未在預期時間內完成。`;
    } else if (msg.includes("not exist") || msg.includes("not.exist")) {
      businessDesc = `${feature} 頁面上的某個功能元素不存在，可能是 UI 結構改變或功能被移除。`;
      actualResult = `預期存在的頁面元素未找到。`;
    }

    // 若同 TC 同日已存在則覆蓋（避免重複）
    const content = [
      `# Bug Report: ${feature} — ${tcId}`,
      ``,
      `**ID**: BUG-AUTO-${bugNum}`,
      `**TC**: ${tcId}`,
      `**嚴重程度**: ${severity}`,
      `**狀態**: Open`,
      `受影響功能: ${feature}`,
      `**日期**: ${today}`,
      `**來源**: Cypress 自動化測試失敗（自動產出）`,
      ``,
      `---`,
      ``,
      `## 問題描述`,
      ``,
      businessDesc,
      ``,
      `> 測試案例：${title}`,
      ``,
      `## 重現步驟`,
      ``,
      ...steps,
      ``,
      `## 預期結果`,
      ``,
      expectedResult,
      ``,
      `## 實際結果`,
      ``,
      actualResult,
      ``,
      `## 影響範圍`,
      ``,
      `- 影響功能：${feature}`,
      `- 影響頁面：${pageName}`,
      `- 影響層級：功能異常（需 QA 確認是否為環境資料問題或功能缺陷）`,
      ``,
      `## 環境`,
      ``,
      `- 測試環境：SIT（${process.env.CYPRESS_BASE_URL || "http://192.168.0.122:19010"}）`,
      `- 偵測時間：${today}`,
      ``,
      `## 技術細節（QA 參考）`,
      ``,
      `\`\`\``,
      msg.slice(0, 400),
      `\`\`\``,
    ].join("\n");

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`🐛 Bug Report 已建立：${fileName}`);
    nextBugNum++;
  }
}

// ─────────────────────────────────────────────
function autoUpdatePipelineState(cypressArgs, runData) {
  if (!runData || !runData.stats) {
    console.log("⚠️  runData 無效，跳過 pipeline-state 自動更新");
    return;
  }

  // mocha json reporter 結構：stats + passes[]/pending[]/failures[] 都是 test 物件
  // 每個 test 的 fullTitle = "describe title  TC-xxx: ..."
  // 用 --spec 參數推算 feature（可能跑多個 spec）
  const specIdx = cypressArgs.indexOf("--spec");
  const specArg = specIdx !== -1 ? cypressArgs[specIdx + 1] : null;

  // 從 spec 路徑清單建立 featureName 集合
  const specFiles = specArg
    ? specArg.split(",").map(s => path.basename(s.trim(), ".cy.ts").replace(/\.cy$/, ""))
    : [];

  // 若只跑一個 spec，直接從 stats 取數字
  if (specFiles.length === 1) {
    const featureName = SPEC_TO_FEATURE[specFiles[0]];
    if (!featureName) {
      console.log(`⚠️  找不到對應 feature：${specFiles[0]}，跳過`);
      return;
    }
    const pass    = runData.stats.passes   || 0;
    const pending = runData.stats.pending  || 0;
    const fail    = runData.stats.failures || 0;

    const ps1 = path.join(__dirname, "../pipeline/update-pipeline-state.ps1");
    const psResult = spawnSync("powershell", [
      "-NoProfile", "-NonInteractive", "-File", ps1,
      "-Feature", featureName,
      "-Qa5", "done",
      "-TestsRun", "done",
      "-Pass", String(pass),
      "-Pending", String(pending),
      "-Fail", String(fail),
    ], { stdio: "inherit" });

    if (psResult.status === 0) {
      console.log(`✅ pipeline-state 已更新：${featureName}  pass=${pass} pending=${pending} fail=${fail}`);
    } else {
      console.log(`❌ pipeline-state 更新失敗：${featureName}`);
      return;
    }
  } else {
    // 多 spec：按 test fullTitle 的 describe 名稱分組
    const groups = {};
    const allTests = [
      ...(runData.passes   || []).map(t => ({ ...t, result: "pass" })),
      ...(runData.pending  || []).map(t => ({ ...t, result: "pending" })),
      ...(runData.failures || []).map(t => ({ ...t, result: "fail" })),
    ];
    for (const t of allTests) {
      // fullTitle 格式：「describe名稱 TC-Fxx-yy: 標題」（單空格分隔）
      const describeRaw = (t.fullTitle || "").split(" TC-")[0].trim();
      if (!groups[describeRaw]) groups[describeRaw] = { pass: 0, pending: 0, fail: 0 };
      groups[describeRaw][t.result]++;
    }
    const ps1 = path.join(__dirname, "../pipeline/update-pipeline-state.ps1");
    for (const [describe, counts] of Object.entries(groups)) {
      // DESCRIBE_TO_FEATURE 優先，再 fallback 到 SPEC_TO_FEATURE values
      const featureName = DESCRIBE_TO_FEATURE[describe]
        || Object.values(SPEC_TO_FEATURE).find(v => v === describe);
      if (!featureName) { console.log(`⚠️  找不到 feature：${describe}，跳過`); continue; }
      spawnSync("powershell", [
        "-NoProfile", "-NonInteractive", "-File", ps1,
        "-Feature", featureName, "-Qa5", "done", "-TestsRun", "done",
        "-Pass", String(counts.pass), "-Pending", String(counts.pending), "-Fail", String(counts.fail),
      ], { stdio: "inherit" });
      console.log(`✅ ${featureName}  pass=${counts.pass} pending=${counts.pending} fail=${counts.fail}`);
    }
  }

  // Finalize
  const ps1 = path.join(__dirname, "../pipeline/update-pipeline-state.ps1");
  spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-File", ps1, "-Finalize"], { stdio: "inherit" });
  console.log(`✅ pipeline-state totals 已重新計算`);

  // 寫入 TC 層級結果（從 Allure results 讀，涵蓋所有跑過的 spec）
  const statePath   = path.join(projectRoot, "qa-workspace/.pipeline-state.json");
  const allureDir   = path.join(projectRoot, "artifacts/raw/allure-results");
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^﻿/, ""));
    if (!state.tc_results) state.tc_results = {};

    // 從 allure-results 讀所有 TC 狀態（passed/skipped/failed → pass/pending/fail）
    if (fs.existsSync(allureDir)) {
      for (const f of fs.readdirSync(allureDir).filter(f => f.endsWith("-result.json"))) {
        try {
          const j = JSON.parse(fs.readFileSync(path.join(allureDir, f), "utf8"));
          const m = (j.name || "").match(/^((?:TC|IT)-[A-Z0-9-]+)/);
          if (!m) continue;
          const tcId = m[1];
          const status = j.status === "passed" ? "pass"
                       : j.status === "skipped" ? "pending"
                       : "fail";
          state.tc_results[tcId] = status;
        } catch {}
      }
    }

    // 補：從 .cy.ts 掃描 it.skip() 的 TC → pending（Allure 有的以 Allure 為準）
    const specDir = path.join(projectRoot, "automation/e2e/specs");
    for (const f of fs.readdirSync(specDir).filter(f => f.endsWith(".cy.ts"))) {
      const content = fs.readFileSync(path.join(specDir, f), "utf8");
      for (const sm of content.matchAll(/\bit\.skip\s*\(\s*['"`]((?:TC|IT)-[A-Z0-9-]+)/g)) {
        if (!state.tc_results[sm[1]]) state.tc_results[sm[1]] = "pending";
      }
    }

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
    console.log(`✅ TC 層級結果已寫入 pipeline-state（${Object.keys(state.tc_results).length} 筆）`);
  } catch (e) {
    console.log(`⚠️  TC 層級結果寫入失敗：${e.message}`);
  }

  // 把 Cypress 截圖同步進 evidence-index.json
  syncCypressScreenshotsToEvidence();
}

// ─────────────────────────────────────────────
// 把 artifacts/raw/screenshots/cypress/**/*.png upsert 進 evidence-index.json
// 截圖檔名格式："{describe} {TC-ID} {title}.png" 或 "{describe} -- {TC-ID} ... (failed).png"
// ─────────────────────────────────────────────
function syncCypressScreenshotsToEvidence() {
  const screenshotsDir = path.join(projectRoot, "artifacts/raw/screenshots/cypress");
  const evidenceDir    = path.join(projectRoot, "artifacts/raw/screenshots/evidence");
  const indexFile      = path.join(evidenceDir, "evidence-index.json");

  if (!fs.existsSync(screenshotsDir)) return;
  fs.mkdirSync(evidenceDir, { recursive: true });

  // 讀現有 index
  let index = { generated: new Date().toISOString().slice(0, 10), pipeline_id: "auto", evidence: [] };
  if (fs.existsSync(indexFile)) {
    try { index = JSON.parse(fs.readFileSync(indexFile, "utf8").replace(/^﻿/, "")); } catch {}
  }
  const existing = new Map(index.evidence.map(e => [e.tc_id, e]));

  // DESCRIBE_TO_FEATURE 來自 describe-maps.js（單一來源）

  let upserted = 0;
  for (const specDir of fs.readdirSync(screenshotsDir)) {
    const specPath = path.join(screenshotsDir, specDir);
    if (!fs.statSync(specPath).isDirectory()) continue;
    for (const file of fs.readdirSync(specPath).filter(f => f.endsWith(".png"))) {
      // 從檔名抽取 TC ID：找 TC-F\d+-\d+ 模式
      const tcMatch = file.match(/((?:TC|IT)-[A-Z0-9-]+)/);
      if (!tcMatch) continue;
      const tcId = tcMatch[1];

      // 判斷是否為失敗截圖（含 attempt 的也算中間截圖，跳過）
      const isFailed  = file.includes("(failed)");
      const isAttempt = file.includes("(attempt");
      if (isAttempt) continue; // retry 中間截圖不納入佐證

      // 已有該 TC 的記錄：
      // - 已有正常截圖 → 不被失敗截圖覆蓋
      // - 已有失敗截圖 → 若本次是正常截圖則覆蓋（TC 已修好）
      if (existing.has(tcId)) {
        const cur = existing.get(tcId);
        if (!isFailed) {
          // 本次是正常截圖，覆蓋（不管舊的是什麼）
        } else if (cur.status !== "failed") {
          // 本次是失敗截圖，舊的是正常 → 不覆蓋
          continue;
        } else {
          continue; // 兩個都是失敗截圖，不重複覆蓋
        }
      }

      // 從 describe 名稱（specDir 通常是 spec 檔名）推算 feature
      // 也嘗試從檔名抽取 describe（第一段文字）
      const describeMatch = file.match(/^([^—\-]+?)\s+(?:--|TC-)/);
      const describeName  = describeMatch ? describeMatch[1].trim() : "";
      const feature = DESCRIBE_TO_FEATURE[describeName] || describeName || specDir;

      // 相對路徑（從 evidence/ 看 cypress/）
      const relativePath = `../cypress/${specDir}/${file}`;
      const action = isFailed
        ? `❌ 失敗截圖：${file.replace(/\.png$/, "")}`
        : `截圖：${file.replace(/\.png$/, "")}`;

      existing.set(tcId, {
        tc_id:      tcId,
        sc_ref:     "",
        feature,
        page:       "",
        action,
        status:     isFailed ? "failed" : "captured",
        screenshot: relativePath,
      });
      upserted++;
    }
  }

  index.evidence = Array.from(existing.values());
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf8");
  if (upserted > 0) console.log(`✅ evidence-index 已更新：新增/更新 ${upserted} 筆截圖`);
}
