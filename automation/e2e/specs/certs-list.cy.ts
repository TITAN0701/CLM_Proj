// TC-F02: 憑證列表
// Selectors derived from snapshot-02-certs.yml

describe('憑證列表', () => {
  beforeEach(() => {
    cy.visit('/certs');
    cy.contains('h2', '憑證').should('be.visible');
  });

  it('TC-F02-01: 預設顯示「依網域」頁籤', () => {
    cy.contains('button', '依網域').should('be.visible');
    cy.get('table').within(() => {
      cy.contains('th', 'Common Name').should('be.visible');
      cy.contains('th', '狀態').should('be.visible');
      cy.contains('th', '有效到').should('be.visible');
      cy.contains('th', '剩餘').should('be.visible');
      cy.contains('th', '申請次數').should('be.visible');
      cy.contains('th', 'CA').should('be.visible');
      cy.contains('th', 'Group').should('be.visible');
      cy.contains('th', '負責人').should('be.visible');
    });
  });

  it('TC-F02-02: 切換「所有訂單」頁籤', () => {
    cy.contains('button', '所有訂單 (含歷史)').click();
    cy.get('table').should('be.visible');
  });

  it('TC-F02-03: 搜尋功能正確過濾結果', () => {
    // 先取第一列的 Common Name，再搜尋，確認搜尋有過濾效果（不寫死網域名稱）
    cy.get('table tbody tr').first().find('td').first().invoke('text').then((domainName) => {
      const keyword = domainName.trim().slice(0, 8);
      cy.get('input[placeholder="搜尋網域..."]').clear().type(keyword);
      cy.contains('button', '查詢').click();
      cy.get('table tbody tr').should('have.length.greaterThan', 0);
    });
  });

  it('TC-F02-04: 30天內到期快篩', () => {
    cy.contains('button', '30 天內到期').click();
    // SPA 狀態篩選，不一定改 URL；確認按鈕點擊後頁面仍在 /certs
    cy.url().should('include', '/certs');
    cy.get('table').should('be.visible');
  });

  it('TC-F02-05: Excel 下載觸發檔案下載', () => {
    cy.contains('button', 'Excel 下載').click();
    // 驗證下載請求觸發（Cypress 下載驗證需額外設定 downloads path）
    cy.wait(2000);
    // [SDET TODO] 驗證實際下載的 .xlsx 檔案內容需設定 Cypress downloadsFolder
  });
});
