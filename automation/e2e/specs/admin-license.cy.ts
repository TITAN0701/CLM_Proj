// TC-F14: 授權管理
// Selectors derived from snapshot-10-admin-license.yml

describe('授權管理', () => {
  it('TC-F14-01: 授權狀態顯示', () => {
    cy.visit('/admin/license');
    cy.contains('h2', '授權管理').should('be.visible');
    cy.contains(/有效|到期|Development mode|尚未啟用/).should('be.visible');
    cy.contains('h3', '方案與配額').should('be.visible');
    cy.screenshot('TC-F14-01 授權狀態', { capture: 'fullPage', log: false });
  });

  it.skip('TC-F14-02: 啟用授權碼 [SDET TODO] 需準備有效授權碼 fixture', () => {
    cy.visit('/admin/license');
    cy.get('input[placeholder="請貼上潤新資訊產品授權金鑰"]').type('LICENSE-KEY-XXXX');
    cy.contains('button', '啟用授權').click();
  });
});
