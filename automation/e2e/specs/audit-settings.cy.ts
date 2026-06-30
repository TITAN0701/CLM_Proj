// TC-F18, F19: 稽核紀錄、系統設定
// Selectors derived from snapshot-14-admin-settings.yml, snapshot-15-audit.yml

describe('稽核紀錄', () => {
  beforeEach(() => {
    cy.visit('/audit');
    cy.contains('h2', '稽核紀錄').should('be.visible');
  });

  it('TC-F18-01: 稽核紀錄顯示操作歷史', () => {
    cy.get('table').should('be.visible');
    cy.get('table tbody tr').its('length').should('be.gte', 1);
  });

  it('TC-F18-02: 稽核紀錄 Excel 匯出', () => {
    cy.contains('a', '下載 Excel').should('be.visible')
      .and('have.attr', 'href', '/api/v1/audit/export.xlsx');
  });

});

describe('稽核紀錄 — 權限控制', () => {
});

describe('系統設定', () => {
  it('TC-F19-01: 系統設定頁面顯示', () => {
    cy.visit('/admin/settings');
    cy.contains('h2', '系統設定').should('be.visible');
    cy.contains('button', '一般設定').should('be.visible');
    cy.contains('button', 'Email / SMTP 設定').should('be.visible');
    cy.get('table').should('be.visible');
  });

  it.skip('TC-F19-02: 修改設定值 [SDET TODO] 確認 key-value 設定欄位 selector 與儲存按鈕', () => {
    cy.visit('/admin/settings');
    cy.contains('button', '編輯').first().click();
    cy.contains('button', '儲存').click();
  });

  it.skip('TC-F19-03: SMTP 配置設定 [SDET TODO] 確認 SMTP 表單欄位 selector', () => {
    cy.visit('/admin/settings');
    cy.contains('Mail').parent().within(() => {
      cy.get('input[type="text"]').first().clear().type('smtp.test.com');
    });
  });
});
