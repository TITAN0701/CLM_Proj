// TC-F09: CA 機構管理
// Selectors derived from /admin/providers snapshot (2026-06-22)
// Route: /admin/providers (NOT /admin/ca-providers)

describe('CA 機構管理', () => {
  beforeEach(() => {
    cy.visit('/admin/providers');
    cy.contains('h2', 'CA機構管理').should('be.visible');
  });

  it('TC-F09-01: CA 機構列表正確顯示', () => {
    cy.get('table').should('be.visible');
    cy.get('table tbody tr').its('length').should('be.gte', 1);
    cy.contains('letsencrypt').should('be.visible');
    cy.contains('RXCA').should('be.visible');
    cy.contains('TWCA').should('be.visible');
    cy.contains('button', '新增 CA 機構').should('be.visible');
  });

  it('TC-F09-02 / IT-CA-NEG-01: 新增 CA 機構表單開啟與取消 → 清單無新增', () => {
    // IT-CA-NEG-01 負向測試：點取消後清單列數不變（對應 S09-02）
    cy.get('table tbody tr').its('length').then((before) => {
      cy.contains('button', '新增 CA 機構').click();
      cy.contains('h3', '新增 CA 機構').should('be.visible');
      cy.get('input[placeholder="letsencrypt / twca / zerossl"]').should('be.visible');
      cy.get('input[placeholder="https://acme-v02.api.letsencrypt.org/directory"]').should('be.visible');
      cy.get('input[placeholder="letsencrypt / twca / zerossl"]').type(`qa-cancel-${Date.now()}`);
      cy.screenshot('IT-CA-NEG-01 取消前', { capture: 'fullPage', log: false });
      cy.contains('button', '取消').click();
      cy.contains('h3', '新增 CA 機構').should('not.exist');
      cy.get('table tbody tr').its('length').should('eq', before);
    });
  });

  it('TC-F09-03: 編輯 CA 機構表單開啟與取消', () => {
    cy.get('table tbody tr').first().contains('button', '編輯').click();
    cy.contains('button', '儲存').should('be.visible');
    cy.contains('button', '取消').click();
    cy.contains('button', '儲存').should('not.exist');
  });

  it('TC-F09-04: 新增 CA 機構並驗證列表 會實際寫入資料，需隔離環境', () => {
    const caName = `qa-test-${Date.now()}`;
    cy.contains('button', '新增 CA 機構').click();
    cy.contains('h3', '新增 CA 機構').should('be.visible');
    cy.get('input[placeholder="letsencrypt / twca / zerossl"]').clear().type(caName);
    cy.get('input[placeholder="Let\'s Encrypt Production"]').clear().type('QA Test CA');
    cy.get('input[placeholder="https://acme-v02.api.letsencrypt.org/directory"]')
      .clear().type('https://acme-staging-v02.api.letsencrypt.org/directory');
    cy.contains('button', '儲存').click();
    cy.contains('code', caName).should('be.visible');
    // 清理：刪除剛新增的 CA
    cy.contains('code', caName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('code', caName).should('not.exist');
  });

  it('TC-F09-05: 新增後刪除 CA 機構（完整流程）', () => {
    const caName = `qa-del-${Date.now()}`;
    cy.contains('button', '新增 CA 機構').click();
    cy.get('input[placeholder="letsencrypt / twca / zerossl"]').clear().type(caName);
    cy.get('input[placeholder="Let\'s Encrypt Production"]').clear().type('QA Delete Test');
    cy.get('input[placeholder="https://acme-v02.api.letsencrypt.org/directory"]')
      .clear().type('https://acme-staging-v02.api.letsencrypt.org/directory');
    cy.contains('button', '儲存').click();
    cy.contains('code', caName).should('be.visible');
    cy.contains('code', caName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('code', caName).should('not.exist');
  });

});
