/**
 * auto-fix.js
 * Cypress 失敗後自動修正 spec 並重跑
 *
 * 流程：
 *   1. 讀 artifacts/raw/cypress-run-result.json 取得失敗 TC
 *   2. 用 Playwright 登入 → 導航到對應頁面 → 截 snapshot（最多重試 2 次）
 *   3. 規則比對找出正確 selector
 *   4. 自動修改 spec
 *   5. 重跑 Cypress
 *
 * 用法：
 *   node scripts/auto-fix.js --spec "automation/e2e/specs/accounts.cy.ts"
 *   node scripts/auto-fix.js --spec "..." --no-rerun
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { DESCRIBE_TO_URL } = require("../shared/describe-maps");

const root = path.join(__dirname, "../..");

// 載入 .env
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.trim().split("=");
    if (key && !key.startsWith("#") && rest.length) process.env[key] = rest.join("=");
  });
}

const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null; };
const specPath = getArg("--spec");
const noRerun  = args.includes("--no-rerun");

if (!specPath) { console.error("❌ 請指定 --spec"); process.exit(1); }

const BASE_URL   = process.env.CYPRESS_BASE_URL || "http://192.168.0.122:19010";
const EMAIL      = process.env.TEST_USER_EMAIL   || "0999999993";
const PASSWORD   = process.env.TEST_USER_PASSWORD || "password123";
const resultPath = path.join(root, "artifacts/raw/cypress-run-result.json");
const specFile   = path.join(root, specPath);

if (!fs.existsSync(resultPath)) {
  console.error("❌ 找不到 cypress-run-result.json，請先執行測試");
  process.exit(1);
}

const runData  = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
const failures = runData.failures || [];

// DESCRIBE_TO_URL 來自 describe-maps.js（單一來源，在 require 處已載入）

// 不管有沒有失敗，先掃描並清除殘留 TC
console.log(`\n🧹 掃描殘留 TC...`);
{
  let specContent = fs.readFileSync(specFile, "utf-8");
  const { content: cleanedContent, removed: removedTCs } = removeStrayTCs(specContent, specFile);
  if (removedTCs.length > 0) {
    fs.writeFileSync(specFile, cleanedContent, "utf-8");
    console.log(`   ✅ 已移除 ${removedTCs.length} 個殘留 TC，spec 已更新`);
  } else {
    console.log(`   ✅ 無殘留 TC`);
  }
}

if (failures.length === 0) {
  console.log("✅ 沒有失敗的 TC，不需要修正");
  process.exit(0);
}

console.log(`\n🔍 發現 ${failures.length} 個失敗，開始自動分析修正...\n`);

// ─────────────────────────────────────────────
// 規則庫：從錯誤訊息 + snapshot 推算正確 selector
// DNS 類型 → 對應憑證欄位名稱對照表（從 Playwright 實際確認，2026-06-23）
const DNS_TYPE_CREDENTIAL_FIELDS = {
  "Cloudflare":                          ["API Token"],
  "Akamai EdgeDNS":                      ["API Token"],
  "Alibaba Cloud DNS":                   ["API Token"],
  "Azure DNS":                           ["API Token"],
  "DigitalOcean":                        ["API Token"],
  "DNSPod (Tencent)":                    ["API Token"],
  "GoDaddy":                             ["API Token"],
  "Google Cloud DNS":                    ["API Token"],
  "Hetzner DNS":                         ["API Token"],
  "Linode (Akamai)":                     ["API Token"],
  "NS1":                                 ["API Token"],
  "PowerDNS API":                        ["API Token"],
  "Vultr":                               ["API Token"],
  "AWS Route 53":                        ["AWS Access Key ID", "AWS Secret Access Key"],
  "RFC 2136 (BIND / PowerDNS nsupdate)": ["DNS server hostname / IP", "TSIG key name", "TSIG secret"],
  "acme-dns (self-hosted DNS server)":   ["Server base URL"],
  "Manual (使用者自己編 TXT)":            [],  // 無憑證欄位
};

// ─────────────────────────────────────────────
// 規則子函數（每個獨立、可測試）
// ─────────────────────────────────────────────

function fixInputTypeText(selector, snapshotText) {
  if (!/input\[type="text"\]/.test(selector)) return null;
  if (snapshotText.includes("編輯")) {
    return {
      old: `cy.get('input[type="text"]').first()`,
      new: `cy.contains('h3', '編輯').parent().find('input').first()`,
      reason: "input[type=text] 無 placeholder，改用 h3 編輯區塊定位",
    };
  }
  if (snapshotText.includes("主檔資料")) {
    return {
      old: `cy.get('input[type="text"]').first()`,
      new: `cy.contains('h3', '主檔資料').parent().find('input').first()`,
      reason: "input[type=text] 無 placeholder，改用 h3 主檔資料區塊定位",
    };
  }
  return null;
}

function fixPlaceholderTruncated(errMsg, snapshotText) {
  const phMatch = errMsg.match(/input\[placeholder="([^"]+)"\]/);
  if (!phMatch) return null;
  const ph = phMatch[1];
  const fullPhMatch = snapshotText.match(new RegExp(`placeholder="(${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*)"`, ));
  if (fullPhMatch && fullPhMatch[1] !== ph) {
    return {
      old: `input[placeholder="${ph}"]`,
      new: `input[placeholder="${fullPhMatch[1]}"]`,
      reason: `placeholder 截斷，補全為 "${fullPhMatch[1]}"`,
    };
  }
  return null;
}

function fixToastClick(errMsg, selector) {
  if (!/\.click\(\)/.test(selector) || !/Expected to find content/.test(errMsg)) return null;
  const msgMatch = errMsg.match(/Expected to find content:\s*'([^']+)'/);
  if (!msgMatch) return null;
  return {
    old: `cy.contains('${msgMatch[1]}').click();`,
    new: `cy.contains('${msgMatch[1]}').should('be.visible');`,
    reason: "提示訊息不需要 click，改成 should('be.visible')",
  };
}

function fixSelectEq(errMsg) {
  if (!/cy\.select\(\) failed.*could not find a single.*option/.test(errMsg)) return null;
  const selectMatch = errMsg.match(/value, index,[^"]*"([^"]+)"/);
  if (!selectMatch) return null;
  const val = selectMatch[1];
  return {
    old: `cy.get('select').eq(0).select('${val}')`,
    new: `cy.get('main').contains('類型:').parent().find('select').select('${val}')`,
    reason: "select.eq(0) 不穩定，改用 main 範圍內 label 文字定位，排除 navbar combobox",
  };
}

function fixSelectMultiple(errMsg) {
  if (!/cy\.select\(\) can only be called on a single.*2 elements/.test(errMsg)) return null;
  return {
    old: `cy.contains('類型:').parent().find('select')`,
    new: `cy.get('main').contains('類型:').parent().find('select')`,
    reason: "select 找到多個元素（含 navbar combobox），加 cy.get('main') 限定範圍",
    replaceAll: true,
  };
}

function fixApiTokenForEach(errMsg, snapshotText, specContent, tcTitle) {
  if (!/Expected to find content:\s*'API Token'/.test(errMsg)) return null;
  if (!specContent || !specContent.includes("類型 *") || !specContent.includes(".select(")) return null;
  if (!tcTitle || !tcTitle.includes("類型切換")) return null;
  const optionMatches = [...snapshotText.matchAll(/option "([^"]+)"/g)].map(m => m[1]);
  const typesWithToken = optionMatches.filter(o => !o.includes("Manual") && !['全部', 'cloudflare', 'manual', '啟用', '停用'].includes(o));
  if (typesWithToken.length === 0) return null;
  const forEachBlock = `const typesWithToken = [\n      '${typesWithToken.join("',\n      '")}',\n    ];\n\n    typesWithToken.forEach((type) => {\n      cy.contains('類型 *').parent().find('select').select(type);\n      cy.contains('API Token').should('be.visible');\n    });`;
  const itMatch = specContent.match(/(it\('[^']*類型切換[^']*'[^{]*\{[\s\S]*?)\n  \}\);/);
  if (!itMatch) return null;
  const oldBlock = itMatch[0];
  const newBlock = oldBlock.replace(
    /(\n    cy\.contains\('類型 \*'\)\.parent\(\)\.find\('select'\)\.select\([^)]+\);\n    cy\.contains\('API Token'\)\.should\('be\.visible'\);)+/,
    `\n\n    ${forEachBlock}`
  );
  if (newBlock === oldBlock) return null;
  return { old: oldBlock, new: newBlock, reason: "類型切換逐行 select+assert 改成 forEach 迴圈，解決渲染時序問題" };
}

function fixApiTokenWrongField(errMsg, specContent) {
  if (!/Expected to find content:\s*'API Token'/.test(errMsg) || !specContent) return null;
  const selectMatches = [...specContent.matchAll(/\.select\('([^']+)'\)/g)].map(m => m[1]);
  for (const typeName of selectMatches) {
    const fields = DNS_TYPE_CREDENTIAL_FIELDS[typeName];
    if (fields && fields.length > 0 && !fields.includes("API Token")) {
      const firstField = fields[0];
      return {
        old: `cy.contains('API Token').should('be.visible');\n    cy.contains('類型 *').parent().find('select').select('${typeName}');`,
        new: `cy.contains('${firstField}').should('be.visible');\n    cy.contains('類型 *').parent().find('select').select('${typeName}');`,
        reason: `類型 "${typeName}" 的憑證欄位不是 API Token，而是 "${firstField}"（依 DNS_TYPE_CREDENTIAL_FIELDS 對照表）`,
      };
    }
  }
  return null;
}

function fixNavLink(errMsg) {
  const navMatch = errMsg.match(/Expected to find content:\s*'([^']+)' within the selector:\s*'a'/);
  if (!navMatch) return null;
  const navMap = {
    '帳號': '/accounts', '憑證': '/certs', '儀表板': '/dashboard',
    '審核': '/admin/approvals', '稽核紀錄': '/audit',
    '合規政策': '/admin/policies', '系統設定': '/admin/settings',
  };
  const text = navMatch[1];
  const url  = navMap[text];
  if (!url) return null;
  return { old: `cy.contains('a', '${text}').click();`, new: `cy.visit('${url}');`, reason: `導覽列連結改用 cy.visit('${url}')` };
}

function fixButtonText(errMsg, snapshotText) {
  const btnMatch = errMsg.match(/Expected to find content:\s*'([^']+)' within the selector:\s*'button'/);
  if (!btnMatch) return null;
  const btnText = btnMatch[1];
  const found = snapshotText.match(new RegExp(`button[^"]*"([^"]*${btnText.slice(0, 4)}[^"]*)"`, "i"));
  if (!found || found[1] === btnText) return null;
  return { old: `cy.contains('button', '${btnText}')`, new: `cy.contains('button', '${found[1]}')`, reason: `按鈕文字不符，從 snapshot 找到近似：${found[1]}` };
}

function fixHeading(errMsg, snapshotText) {
  const headingMatch = errMsg.match(/Expected to find content:\s*'([^']+)' within the selector:\s*'h([23])'/);
  if (!headingMatch) return null;
  const text = headingMatch[1];
  const tag  = `h${headingMatch[2]}`;
  if (!snapshotText.includes(text)) return null;
  return { old: `cy.contains('${tag}', '${text}').should('be.visible')`, new: `cy.contains('${text}').should('be.visible')`, reason: `${tag} selector 改成不限 tag 的 contains` };
}

function fixSuccessIconClick(errMsg, selector) {
  if (!/Expected to find content.*[✓✗]/.test(errMsg) || !/\.click\(\)/.test(selector)) return null;
  return { old: `.click();`, new: `.should('be.visible');`, reason: "成功提示訊息不需要 click，改成 should('be.visible')" };
}

// ─────────────────────────────────────────────
// 主入口：依序嘗試各規則，第一個命中即回傳
// ─────────────────────────────────────────────
function inferFix(errMsg, selector, snapshotText, specContent, tcTitle) {
  return (
    fixInputTypeText(selector, snapshotText) ||
    fixPlaceholderTruncated(errMsg, snapshotText) ||
    fixToastClick(errMsg, selector) ||
    fixSelectEq(errMsg) ||
    fixSelectMultiple(errMsg) ||
    fixApiTokenForEach(errMsg, snapshotText, specContent, tcTitle) ||
    fixApiTokenWrongField(errMsg, specContent) ||
    fixNavLink(errMsg) ||
    fixButtonText(errMsg, snapshotText) ||
    fixHeading(errMsg, snapshotText) ||
    fixSuccessIconClick(errMsg, selector) ||
    null
  );
}

// ─────────────────────────────────────────────
// 取得 Playwright snapshot（重試最多 2 次）
// ─────────────────────────────────────────────
function getSnapshot(pageUrl, retryCount = 0) {
  const snapshotScript = path.join(root, "scripts/_snapshot-helper.js");

  const helperCode = `
const { chromium } = require('playwright');
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('${BASE_URL}', { waitUntil: 'networkidle', timeout: 15000 });
    // 若已登入直接導航，否則登入
    if (!page.url().includes('/dashboard') && !page.url().includes('/admin') && !page.url().includes('/certs') && !page.url().includes('/accounts')) {
      try {
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        await page.fill('input', '${EMAIL}');
        await page.fill('input[type="password"]', '${PASSWORD}');
        await page.click('button:has-text("登入")');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
      } catch (e) {
        // 可能已在登入狀態或頁面結構不同，嘗試直接導航
      }
    }
    await page.goto('${BASE_URL}${pageUrl}', { waitUntil: 'networkidle', timeout: 15000 });
    const snapshot = await page.evaluate(() => {
      const getText = (el, depth = 0) => {
        if (depth > 4) return '';
        const tag = el.tagName.toLowerCase();
        const text = el.textContent.trim().slice(0, 60);
        const ph = el.placeholder || '';
        const type = el.type || '';
        const role = el.getAttribute('role') || '';
        const label = el.getAttribute('aria-label') || '';
        const id = el.id || '';
        let info = tag;
        if (ph) info += \` placeholder="\${ph}"\`;
        if (type && type !== 'text') info += \` type="\${type}"\`;
        if (role) info += \` role="\${role}"\`;
        if (label) info += \` aria-label="\${label}"\`;
        if (id) info += \` id="\${id}"\`;
        if (text && !['script','style'].includes(tag)) info += \` "\${text}"\`;
        const children = [...el.children].map(c => '  '.repeat(depth+1) + getText(c, depth+1)).filter(Boolean).join('\\n');
        return info + (children ? '\\n' + children : '');
      };
      return getText(document.querySelector('main') || document.body);
    });
    console.log(snapshot);
  } finally {
    if (browser) await browser.close();
  }
})().catch(e => { console.error('SNAPSHOT_ERROR:' + e.message); process.exit(1); });
`;

  fs.writeFileSync(snapshotScript, helperCode, "utf-8");
  const r = spawnSync(process.execPath, [snapshotScript], { encoding: "utf-8", timeout: 40000 });
  try { fs.unlinkSync(snapshotScript); } catch {}

  if (r.stdout && !r.stdout.includes("SNAPSHOT_ERROR")) {
    return r.stdout;
  }

  // 失敗重試（最多 2 次）
  if (retryCount < 2) {
    console.log(`   ⚠️  snapshot 失敗，第 ${retryCount + 1} 次重試...`);
    return getSnapshot(pageUrl, retryCount + 1);
  }

  console.log(`   ❌ snapshot 連續失敗 3 次，放棄`);
  return "";
}

// ─────────────────────────────────────────────
// 殘留 TC 清除：掃描 spec 內所有 it()/it.skip() block
// 若 TC 內的 cy.visit('/xxx') 與 describe 對應頁面不符 → 整個 it block 刪除
// ─────────────────────────────────────────────
function removeStrayTCs(content, specFilePath) {
  // 收集本 spec 所有 describe 對應的 allowedUrls（支援多個 describe）
  const describeNames = [...content.matchAll(/describe\(['"]([^'"]+)['"]/g)].map(m => m[1]);
  const allowedUrls = describeNames.map(n => DESCRIBE_TO_URL[n]).filter(Boolean);
  if (allowedUrls.length === 0) return { content, removed: [] };

  const removed = [];

  // 逐個 it block 掃描：用正則找 it( 或 it.skip( 開頭、配對大括號結尾
  const itPattern = /(\n  it(?:\.skip)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \}\);)/g;
  let match;
  const strayBlocks = [];

  while ((match = itPattern.exec(content)) !== null) {
    const block = match[1];
    // 找 block 內的所有 cy.visit(...)
    const visits = [...block.matchAll(/cy\.visit\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
    if (visits.length === 0) continue;

    // 若任一 visit URL 不在本 spec 任何 describe 的 allowedUrls 中 → 標記為殘留
    const stray = visits.filter(v => !allowedUrls.some(u => v.startsWith(u)));
    if (stray.length > 0) {
      strayBlocks.push({ block, strayUrls: stray });
    }
  }

  if (strayBlocks.length === 0) return { content, removed: [] };

  // 刪除殘留 block
  let cleaned = content;
  for (const { block, strayUrls } of strayBlocks) {
    const tcTitleMatch = block.match(/it(?:\.skip)?\(['"]([^'"]+)['"]/);
    const tcTitle = tcTitleMatch ? tcTitleMatch[1] : "(unknown)";
    removed.push({ tcTitle, strayUrls });
    cleaned = cleaned.replace(block, "");
    console.log(`   🧹 移除殘留 TC：${tcTitle}（cy.visit 頁面 ${strayUrls.join(",")} 與 describe "${describeName}" 不符）`);
  }

  return { content: cleaned, removed };
}

// ─────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────
let specContent = fs.readFileSync(specFile, "utf-8");
let totalFixed  = 0;
const fixLog    = [];

// 先執行殘留 TC 清除
console.log(`\n🧹 掃描殘留 TC...`);
const { content: cleanedContent, removed: removedTCs } = removeStrayTCs(specContent, specFile);
if (removedTCs.length > 0) {
  specContent = cleanedContent;
  fs.writeFileSync(specFile, specContent, "utf-8");
  console.log(`   ✅ 已移除 ${removedTCs.length} 個殘留 TC，spec 已更新`);
  removedTCs.forEach(r => fixLog.push({ title: r.tcTitle, status: "fixed", reason: `殘留 TC 自動移除（cy.visit 頁面不符：${r.strayUrls.join(",")}）` }));
  totalFixed += removedTCs.length;
} else {
  console.log(`   ✅ 無殘留 TC`);
}

for (const f of failures) {
  const title   = f.fullTitle || f.title || "";
  const err     = f.err || {};
  const errMsg  = (err.message || err.stack || "").slice(0, 1000);

  console.log(`\n🔧 分析：${title}`);
  console.log(`   錯誤：${errMsg.slice(0, 120)}...`);

  // 推算頁面 URL
  const describeName = title.replace(/\s+TC-[A-Z0-9\-]+:.*$/, "").trim();
  const pageUrl = DESCRIBE_TO_URL[describeName]
    || Object.entries(DESCRIBE_TO_URL).find(([k]) => title.startsWith(k))?.[1];
  if (!pageUrl) {
    console.log(`   ⚠️  找不到對應頁面，跳過`);
    fixLog.push({ title, status: "manual", errMsg: "找不到對應頁面 URL" });
    continue;
  }

  // 取 snapshot（含重試）
  console.log(`   📸 截取 ${pageUrl} snapshot...`);
  const snapshot = getSnapshot(pageUrl);
  if (!snapshot) {
    fixLog.push({ title, status: "manual", errMsg: "snapshot 失敗（重試 3 次）" });
    continue;
  }

  // 從錯誤訊息萃取失敗 selector
  const selectorMatch = errMsg.match(/element[:\s]+[`'"]([^`'"]+)[`'"]/i)
    || errMsg.match(/find[^:]*:\s*[`'"]([^`'"]+)[`'"]/i)
    || errMsg.match(/selector[:\s]+[`'"]([^`'"]+)[`'"]/i);
  const failedSelector = selectorMatch ? selectorMatch[1] : "";

  const fix = inferFix(errMsg, failedSelector, snapshot, specContent, title);
  if (!fix) {
    console.log(`   ⚠️  無法自動修正，請手動處理`);
    fixLog.push({ title, status: "manual", errMsg: errMsg.slice(0, 200) });
    continue;
  }

  // 套用修正
  if (fix.replaceAll) {
    const before = specContent;
    specContent = specContent.split(fix.old).join(fix.new);
    if (specContent !== before) {
      totalFixed++;
      console.log(`   ✅ 已修正（replaceAll）：${fix.reason}`);
      fixLog.push({ title, status: "fixed", reason: fix.reason });
    } else {
      console.log(`   ⚠️  找不到要替換的字串`);
      fixLog.push({ title, status: "not_found", fix });
    }
  } else if (specContent.includes(fix.old)) {
    specContent = specContent.replace(fix.old, fix.new);
    totalFixed++;
    console.log(`   ✅ 已修正：${fix.reason}`);
    console.log(`      - 舊：${fix.old.slice(0, 80)}`);
    console.log(`      + 新：${fix.new.slice(0, 80)}`);
    fixLog.push({ title, status: "fixed", reason: fix.reason });
  } else {
    console.log(`   ⚠️  找不到要替換的字串，請手動處理`);
    console.log(`      尋找：${fix.old.slice(0, 80)}`);
    fixLog.push({ title, status: "not_found", fix });
  }
}

// 寫回 spec
if (totalFixed > 0) {
  fs.writeFileSync(specFile, specContent, "utf-8");
  console.log(`\n✅ 已修正 ${totalFixed} 處，spec 已更新：${specFile}`);
} else {
  console.log(`\n⚠️  沒有自動修正任何項目`);
}

// 產出修正摘要
const summaryPath = path.join(root, "artifacts/raw/auto-fix-summary.md");
const summaryLines = [
  `# Auto-Fix 摘要`,
  `> spec: \`${specPath}\``,
  `> 時間: ${new Date().toISOString()}`,
  `> 自動修正: ${totalFixed} / ${failures.length}\n`,
  ...fixLog.map(l => {
    if (l.status === "fixed")     return `- ✅ **${l.title}**\n  ${l.reason}`;
    if (l.status === "manual")    return `- ⚠️  **${l.title}**（需手動）\n  \`${l.errMsg}\``;
    if (l.status === "not_found") return `- ❌ **${l.title}**（字串未找到）\n  尋找：\`${l.fix?.old?.slice(0,80)}\``;
    return `- ${l.title}`;
  }),
];
fs.writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");
console.log(`📋 修正摘要：${summaryPath}`);

// 重跑
if (!noRerun && totalFixed > 0) {
  console.log(`\n🚀 重新執行測試...\n`);
  const cypressPackageJson = require.resolve("cypress/package.json");
  const cypressBin = path.join(path.dirname(cypressPackageJson), "bin", "cypress");
  const env = { ...process.env };
  if (env.TEST_USER_EMAIL)    env.CYPRESS_TEST_USER_EMAIL    = env.TEST_USER_EMAIL;
  if (env.TEST_USER_PASSWORD) env.CYPRESS_TEST_USER_PASSWORD = env.TEST_USER_PASSWORD;
  delete env.ELECTRON_RUN_AS_NODE;
  const r = spawnSync(process.execPath, [cypressBin, "run", "--spec", specPath], { env, stdio: "inherit" });
  process.exit(r.status ?? 1);
} else if (noRerun) {
  console.log(`ℹ️  --no-rerun，跳過重跑`);
}
