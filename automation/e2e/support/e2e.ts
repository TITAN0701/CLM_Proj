import "@shelex/cypress-allure-plugin";
import "./commands";

// 全域 beforeEach：所有 spec 執行前自動登入
beforeEach(() => {
  cy.loginAsAdmin();
});

// 全域 afterEach：每個 TC 結束後截圖，@shelex/cypress-allure-plugin writer 自動附加至 Allure Report
// 用 Cypress.on('fail') 暫時攔截截圖失敗，避免截圖 API timeout 中斷後續 TC
afterEach(function () {
  const title = this.currentTest?.fullTitle() ?? 'screenshot';
  let handled = false;
  const handler = (err: Error) => {
    if (!handled && err.message.includes('screenshot')) {
      handled = true;
      return false; // 靜默跳過截圖錯誤
    }
    throw err;
  };
  Cypress.on('fail', handler);
  cy.screenshot(title, {
    capture: 'fullPage',
    overwrite: true,
    log: false,
    timeout: 5000,
  }).then(() => {
    Cypress.off('fail', handler);
  }, () => {
    Cypress.off('fail', handler);
  });
});
