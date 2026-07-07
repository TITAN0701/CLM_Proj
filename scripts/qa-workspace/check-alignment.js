/**
 * check-alignment.js
 * 驗證所有 Google Sheets / xlsx 分頁的 header 與資料欄數是否一致。
 * 執行：node scripts/qa-workspace/check-alignment.js
 *
 * 輸出：
 *   ✅ 分頁名：N 筆，欄數 M — 對齊
 *   ❌ 分頁名：第 R 列欄數 A，預期 M — 不對齊 [sample]
 *   ⚠️  分頁名：loader 執行失敗 [error]
 */

const { SHEET_DEFINITIONS, validateAlignment } = require('../shared/sheet-definitions');

function main() {
  console.log('\n📋 Sheet Alignment Check\n' + '─'.repeat(50));

  const issues = validateAlignment();

  // 彙整每頁是否有問題
  const issueSheets = new Set(issues.map(i => i.sheet));

  for (const def of SHEET_DEFINITIONS) {
    let rows;
    try { rows = def.loader(); } catch (e) {
      console.log(`⚠️  ${def.name}：loader 執行失敗 → ${e.message}`);
      continue;
    }

    const sheetIssues = issues.filter(i => i.sheet === def.name);
    if (sheetIssues.length === 0) {
      console.log(`✅ ${def.name.padEnd(22)}${rows.length} 筆，欄數 ${def.headers.length} — 對齊`);
    } else {
      for (const iss of sheetIssues) {
        if (iss.type === 'col_mismatch') {
          console.log(`❌ ${def.name.padEnd(22)}第 ${iss.row} 列欄數 ${iss.actual}，預期 ${iss.expected} — 不對齊  ${iss.sample}`);
        }
      }
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (issues.length === 0) {
    console.log('✅ 所有分頁對齊，無問題。\n');
  } else {
    console.log(`❌ 發現 ${issues.length} 個對齊問題，請修正 scripts/shared/sheet-definitions.js 或對應的 loader。\n`);
    process.exitCode = 1;
  }
}

main();
