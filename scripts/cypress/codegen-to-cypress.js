/**
 * codegen-to-cypress.js
 * 讀取 Playwright codegen 輸出，轉換成 Cypress 語法，寫入指定 spec，並自動跑測試。
 *
 * 用法：
 *   node scripts/codegen-to-cypress.js --spec "automation/e2e/specs/foo.cy.ts" --tc "TC-F09-05" --desc "新增 CA 機構"
 *   node scripts/codegen-to-cypress.js --spec "..." --skip --no-run
 *   node scripts/codegen-to-cypress.js --spec "..." --input "scripts/codegen-output.ts"
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// --- 參數 ---
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null; };
const specPath  = getArg("--spec");
const inputPath = getArg("--input") || "scripts/codegen-output.ts";
const tcId      = getArg("--tc")    || "TC-CODEGEN";
const tcDesc    = getArg("--desc")  || "codegen 自動產出（請補上描述）";
const noRun     = args.includes("--no-run");
const useSkip   = args.includes("--skip");

if (!specPath) {
  console.error("❌ 請指定 --spec");
  process.exit(1);
}

const root      = path.join(__dirname, "..");
const inputFile = path.join(root, inputPath);
const specFile  = path.join(root, specPath);

if (!fs.existsSync(inputFile)) {
  console.error(`❌ 找不到 codegen 輸出：${inputFile}`);
  console.error("請先執行：npx playwright codegen --output scripts/codegen-output.ts <url>");
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf-8");
console.log(`✅ 讀取：${inputFile}`);

// =============================================================
// 步驟1：把 codegen 原始碼拆成 action 物件
// =============================================================
function parseActions(code) {
  const actions = [];
  for (const raw of code.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^import |^test\(|^}\);?$|^\}$/.test(line)) continue;

    // 移除 await page.
    const s = line.replace(/^await page\./, "").replace(/^await /, "");
    actions.push(s);
  }
  return actions;
}

// =============================================================
// 步驟2：過濾不需要的 actions
// =============================================================
const LOGIN_PATTERNS = [
  /goto\(.*\/login/,
  /getByText\('admin@local'\)/,
  /locator\('input\[type="email"\]'\)/,
  /locator\('input\[type="password"\]'\)/,
  /getByRole\('button',\s*\{\s*name:\s*'登入'\s*\}\)/,
];

const NOISE_PATTERNS = [
  /getByRole\('cell'/,           // cell click — 純確認，無互動意義
  /getByText\('.{20,}'\)\.click/, // 大段文字背景點擊
  /\.press\('CapsLock'\)/,        // 輸入法切換
];

// Playwright 專屬 API：無法轉換，改成 [SKIP] 註解
const PLAYWRIGHT_ONLY_PATTERNS = [
  /^(const \w+ = )?page\.waitForEvent\(/,   // download / dialog 事件等待
  /^const \w+ = await \w+Promise/,          // await downloadPromise 等
  /^page\.once\('dialog'/,                  // dialog handler
  /^dialog\.(dismiss|accept|message)/,      // dialog 操作
  /^console\.log\(/,                        // codegen 產出的 debug log
];

// 導覽列連結對照表（codegen 錄到 nav click → 直接 cy.visit）
const NAV_LINK_TO_PATH = {
  '帳號':     '/accounts',
  '憑證':     '/certs',
  '儀表板':   '/dashboard',
  '審核':     '/admin/approvals',
  '稽核紀錄': '/audit',
  '合規政策': '/admin/policies',
  '系統設定': '/admin/settings',
  '掃描既有憑證': '/admin/scan',
};

function shouldSkip(action) {
  for (const p of [...LOGIN_PATTERNS, ...NOISE_PATTERNS]) {
    if (p.test(action)) return true;
  }
  return false;
}

function isPlaywrightOnly(action) {
  for (const p of PLAYWRIGHT_ONLY_PATTERNS) {
    if (p.test(action)) return true;
  }
  return false;
}

// =============================================================
// 步驟3：合併連續同元素操作（去重複 fill/click）
// =============================================================
function getLocatorKey(s) {
  return s.replace(/\.(click|fill|clear|type|press|select)\(.*$/, "");
}

function mergeActions(actions) {
  const result = [];
  for (let i = 0; i < actions.length; i++) {
    const cur  = actions[i];
    const next = actions[i + 1];

    // 同元素連續 fill → 只保留最後一次
    if (cur.includes(".fill(") && next && getLocatorKey(cur) === getLocatorKey(next) && next.includes(".fill(")) continue;

    // 同元素 click 後緊接 fill → click 只是定位，跳過
    if (cur.endsWith(".click()") && next && getLocatorKey(cur) === getLocatorKey(next) && next.includes(".fill(")) continue;

    // 同元素連續 click（重複）→ 跳過
    if (cur.endsWith(".click()") && next && cur === next) continue;

    result.push(cur);
  }
  return result;
}

// =============================================================
// 步驟4：轉換單行
// =============================================================
function convertLine(s) {
  // 先去掉結尾分號，轉換完再統一補上
  let out = s.replace(/;$/, "");

  // goto → cy.visit（只保留 path）
  out = out.replace(/^goto\('https?:\/\/[^/]+(\/[^']*)'(\)?)$/, "cy.visit('$1');");
  out = out.replace(/^goto\((.*)\)$/, "cy.visit($1);");

  // getByRole('button').click()
  out = out.replace(
    /^getByRole\('button',\s*\{\s*name:\s*'([^']+)'\s*\}\)\.click\(\)$/,
    "cy.contains('button', '$1').click();"
  );

  // getByRole('button').nth(N).click()
  out = out.replace(
    /^getByRole\('button',\s*\{\s*name:\s*'([^']+)'\s*\}\)\.nth\((\d+)\)\.click\(\)$/,
    "cy.contains('button', '$1').eq($2).click();"
  );

  // getByRole('link').click() — 若是導覽列連結，改成 cy.visit
  out = out.replace(
    /^getByRole\('link',\s*\{\s*name:\s*'([^']+)'\s*\}\)\.click\(\)$/,
    (_, name) => {
      const path = NAV_LINK_TO_PATH[name];
      return path ? `cy.visit('${path}');` : `cy.contains('a', '${name}').click();`;
    }
  );

  // getByRole('textbox').fill(val) — name 可能含跳脫字元如 Let\'s
  out = out.replace(
    /^getByRole\('textbox',\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)'\s*\}\)\.fill\('((?:[^'\\]|\\.)*)'\)$/,
    (_, ph, val) => `cy.get('input[placeholder="${ph.replace(/\\'/g, "\\'")}"]').clear().type('${val}');`
  );
  out = out.replace(
    /^getByRole\('textbox',\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)'\s*\}\)\.fill\("([^"]*)"\)$/,
    (_, ph, val) => `cy.get('input[placeholder="${ph.replace(/\\'/g, "'")}"]').clear().type("${val}");`
  );

  // getByRole('textbox').click() → 省略（只是定位用）
  out = out.replace(
    /^getByRole\('textbox',\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)'\s*\}\)\.click\(\)$/,
    ""
  );

  // getByRole('textbox').press('Tab') → 省略
  out = out.replace(
    /^getByRole\('textbox',\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)'\s*\}\)\.press\('Tab'\)$/,
    ""
  );

  // getByRole('combobox').selectOption(val)
  out = out.replace(
    /^getByRole\('combobox',\s*\{\s*name:\s*'([^']+)'\s*\}\)\.selectOption\('([^']+)'\)$/,
    "cy.get('select').select('$2');"
  );

  // getByLabel('...').fill(val)
  out = out.replace(
    /^getByLabel\('([^']+)'\)\.fill\('([^']*)'\)$/,
    "cy.get('label').contains('$1').siblings('input').clear().type('$2');"
  );

  // locator('selector').click/fill
  out = out.replace(/^locator\('([^']+)'\)\.click\(\)$/, "cy.get('$1').click();");
  out = out.replace(/^locator\('([^']+)'\)\.fill\('([^']*)'\)$/, "cy.get('$1').clear().type('$2');");

  // getByText('...').click()
  out = out.replace(/^getByText\('([^']+)'\)\.click\(\)$/, "cy.contains('$1').click();");

  // expect toHaveURL
  out = out.replace(/^expect\(page\)\.toHaveURL\('([^']+)'\)$/, "cy.url().should('include', '$1');");

  // 成功/儲存提示訊息 click → should('be.visible')（✓ 開頭或含「成功」「已儲存」）
  out = out.replace(
    /^cy\.contains\('([^']*(?:✓|成功|已儲存|已刪除|已更新)[^']*)'\)\.click\(\);$/,
    "cy.contains('$1').should('be.visible');"
  );

  // 空行（被省略的 click/press）→ 不輸出
  if (out.trim() === "") return null;

  // 補分號（cy. 開頭且沒有分號）
  if (out.startsWith("cy.") && !out.endsWith(";")) out += ";";

  // 還有殘留的 Playwright API → TODO 註解
  if (/^(getBy|locator|expect|page\.)/.test(out)) {
    out = `// [TODO] 未轉換：${out}`;
  }

  return "    " + out;
}

// =============================================================
// 主流程
// =============================================================
const rawActions      = parseActions(raw);
const filteredActions = rawActions.filter(a => !shouldSkip(a));

// Playwright-only 行轉成 [SKIP] 註解（不過濾掉，保留為註解讓開發者知道）
const annotatedActions = filteredActions.map(a =>
  isPlaywrightOnly(a) ? `// [SKIP] Playwright-only，需手動實作：${a}` : a
);

const mergedActions = mergeActions(annotatedActions);

if (filteredActions.length < rawActions.length) {
  console.log(`  ℹ️  跳過登入/雜訊步驟 ${rawActions.length - filteredActions.length} 行`);
}
const skippedPlaywright = filteredActions.filter(a => isPlaywrightOnly(a)).length;
if (skippedPlaywright > 0) {
  console.log(`  ℹ️  Playwright-only 行轉為 [SKIP] 註解：${skippedPlaywright} 行`);
}

const cypressLines = mergedActions.map(convertLine).filter(Boolean);

const itKeyword = useSkip ? "it.skip" : "it";
const tcBlock = `
  ${itKeyword}('${tcId}: ${tcDesc}', () => {
${cypressLines.join("\n")}
  });`;

// --- 插入到 spec 最後一個 }); 之前 ---
if (!fs.existsSync(specFile)) {
  console.error(`❌ 找不到 spec：${specFile}`);
  process.exit(1);
}

let spec = fs.readFileSync(specFile, "utf-8");
const lastClose = spec.lastIndexOf("});");
if (lastClose === -1) {
  console.error("❌ spec 格式錯誤，找不到 });");
  process.exit(1);
}

spec = spec.slice(0, lastClose) + tcBlock + "\n" + spec.slice(lastClose);
fs.writeFileSync(specFile, spec, "utf-8");
console.log(`✅ 已寫入 spec：${specFile}`);
console.log(`   ${itKeyword}('${tcId}: ${tcDesc}')`);

if (noRun) { console.log("ℹ️  --no-run，跳過 Cypress"); process.exit(0); }

// --- 載入 .env ---
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.trim().split("=");
    if (key && !key.startsWith("#") && rest.length) process.env[key] = rest.join("=");
  });
}

const env = { ...process.env };
if (env.TEST_USER_EMAIL) env.CYPRESS_TEST_USER_EMAIL = env.TEST_USER_EMAIL;
if (env.TEST_USER_PASSWORD) env.CYPRESS_TEST_USER_PASSWORD = env.TEST_USER_PASSWORD;
delete env.ELECTRON_RUN_AS_NODE;

const cypressBin = path.join(path.dirname(require.resolve("cypress/package.json")), "bin", "cypress");
console.log("\n🚀 執行 Cypress...\n");
const result = spawnSync(process.execPath, [cypressBin, "run", "--spec", specPath], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
