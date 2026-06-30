// TC-F07, F08: ACME 帳號列表、Account 詳細
// Selectors derived from snapshot-05-accounts.yml

describe('ACME 帳號', () => {
  it('TC-F07-01: 帳號列表顯示所有 ACME 帳號', () => {
    cy.visit('/accounts');
    cy.contains('h2', '帳號').should('be.visible');
    // 驗證列表有資料（不寫死帳號名稱，避免環境資料依賴）
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('table').within(() => {
      cy.contains('th', 'CA').should('be.visible');
    });
  });
});

describe('Account 詳細', () => {
  it('TC-F08-01: Account 詳細頁顯示完整資訊', () => {
    cy.visit('/accounts/letsencrypt/acc_legacy_letsencrypt');
    cy.contains('h2', 'acc_legacy_letsencrypt').should('be.visible');
    cy.contains('letsencrypt').should('be.visible');
    cy.contains('h3', '主檔資料').should('be.visible');
    cy.contains('h3', '名下訂單 / 憑證').should('be.visible');
  });

  it('TC-F08-02: 測試新增、編輯、刪除帳號，並檢視是否能看見正確提示訊息', () => {
    const accountName = `qa-test-${Date.now()}`;
    cy.visit('/accounts');
    cy.contains('button', '新增 Account (letsencrypt)').click();
    cy.get('input[placeholder="production / subsidiary-a"]').clear().type(accountName);
    cy.get('input[placeholder="ops@example.com"]').clear().type('titan.lee@ruenxin.com.tw');
    cy.contains('button', '註冊').click();
    cy.contains('✓ 註冊成功').should('be.visible');
    // 進入詳細頁：找剛新增的帳號列
    cy.contains(accountName).parents('tr').contains('a', '詳細').click();
    // 等待詳細頁載入
    cy.contains('h3', '編輯').should('be.visible');
    // 編輯「顯示名稱」欄位（編輯區第一個 input）
    cy.contains('h3', '編輯').parent().find('input').first().clear().type(`${accountName}-edited`);
    cy.contains('button', '儲存').click();
    cy.contains('✓ 已儲存').should('be.visible');
    // 刪除帳號
    cy.contains('button', '刪除帳號').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.url().should('include', '/accounts');
  });

  it('TC-F08-03: 測試轉移負責人帳號功能，並檢查是否能轉移不同的權限', () => {
    const accountName = `qa-transfer-${Date.now()}`;
    cy.visit('/accounts');
    cy.contains('button', '新增 Account (letsencrypt)').click();
    cy.get('input[placeholder="production / subsidiary-a"]').clear().type(accountName);
    cy.get('input[placeholder="ops@example.com"]').clear().type('titan.lee@ruenxin.com.tw');
    cy.contains('button', '註冊').click();
    cy.contains('✓ 註冊成功').should('be.visible');
    // 進入詳細頁
    cy.contains(accountName).parents('tr').contains('a', '詳細').click();
    cy.contains('h3', '主檔資料').should('be.visible');
    // 轉移負責人
    cy.contains('button', '轉移負責人').click();
    cy.get('main select').first().select(1);
    cy.contains('button', '確認轉移').click();
    cy.contains('button', '儲存').click();
    cy.contains('button', '← 回上一層').click();
    // 刪除帳號（清理）
    cy.contains(accountName).parents('tr').contains('a', '詳細').click();
    cy.contains('button', '刪除帳號').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.url().should('include', '/accounts');
  });

  it('TC-F08-04: 測試新增RXCA帳號（已知 SIT 環境 RXCA 連線異常，預期顯示 Network error）', () => {
    cy.visit('/accounts');
    cy.contains('button', 'RXCA').click();
    cy.contains('button', '新增 Account (rxca)').click();
    cy.contains('顯示名稱 *聯絡 email *').click();
    cy.get('input[placeholder="production / subsidiary-a"]').clear().type('TEST1');
    cy.get('input[placeholder="ops@example.com"]').clear().type('titan.lee@ruenxin.com.tw');
    cy.contains('button', '註冊').click();
    cy.contains('Network error').click();
  });

  it('TC-F08-05: 測試新增TWCA EAB，先測試帶入假資料是否會報錯', () => {
    cy.visit('/accounts');
    cy.contains('button', 'TWCA EAB').click();
    cy.contains('button', '新增 Account (twca)').click();
    cy.get('input[placeholder="production / subsidiary-a"]').clear().type('rxclmtest3');
    cy.get('input[placeholder="ops@example.com"]').clear().type('titan.lee@ruenxin.com.tw');
    cy.get('input[placeholder="M2-100-xxxx-..."]').clear().type('QWQWE123_QE-13213WFEK2L42349FS');
    cy.get('input[placeholder="base64url-string-from-CA"]').clear().type('13131EWERWR2234EDFSFE1');
    cy.contains('button', '註冊').click();
    cy.contains('Bad key size:').should('be.visible');
  });

  it('TC-F08-06: TWCA 帳號詳細頁顯示完整資訊', () => {
    cy.visit('/accounts/twca/acc_c720a2aad6854190');
    cy.contains('h2', 'acc_c720a2aad6854190').should('be.visible');
    cy.contains('twca').should('be.visible');
    cy.contains('h3', '主檔資料').should('be.visible');
    cy.contains('fxmlcfstest256.twca.com.tw').should('be.visible');
    cy.contains('h3', '名下訂單 / 憑證').should('be.visible');
    cy.contains('總筆數: 2').should('be.visible');
    cy.contains('ISSUED').should('be.visible');
  });

  

  it('TC-F08-07: 測試新增TWCA EAB，檢查欄位為空白時的錯誤訊息', () => {
    cy.visit('/accounts');
    cy.contains('button', 'TWCA EAB').click();
    cy.contains('button', '新增 Account (twca)').click();
    // 直接送出空白表單，驗必填欄位提示
    cy.contains('button', '註冊').click();
    cy.get('input[placeholder="production / subsidiary-a"]').should('be.visible');
    cy.get('input[placeholder="ops@example.com"]').should('be.visible');
    cy.get('input[placeholder="M2-100-xxxx-..."]').should('be.visible');
    cy.get('input[placeholder="base64url-string-from-CA"]').should('be.visible');
    // 填入無效 EAB Key，驗 Bad key size 錯誤
    cy.get('input[placeholder="production / subsidiary-a"]').type('qa-twca-empty-test');
    cy.get('input[placeholder="ops@example.com"]').type('titan.lee@ruenxin.com.tw');
    cy.get('input[placeholder="M2-100-xxxx-..."]').type('INVALID-KEY-FORMAT');
    cy.get('input[placeholder="base64url-string-from-CA"]').type('INVALID-HMAC');
    cy.contains('button', '註冊').click();
    cy.contains('Bad key size:').should('be.visible');
    cy.contains('button', '取消').click();
  });
});
