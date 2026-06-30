// TC-F15: 部署核准
// Selectors derived from snapshot-11-admin-approvals.yml

describe('部署核准', () => {
  beforeEach(() => {
    cy.visit('/admin/approvals');
    cy.contains('h2', '審核').should('be.visible');
  });

  it('TC-F15-01: 待審清單顯示三類任務', () => {
    cy.contains('button', 'DNS 綁定變更').should('be.visible');
    cy.contains('button', '憑證申請核准').should('be.visible');
    cy.contains('button', '部署核准').should('be.visible');
    cy.screenshot('TC-F15-01 待審清單', { capture: 'fullPage', log: false });
  });

  it.skip('TC-F15-02: 核准部署任務 [SDET TODO] 需要有 Pending 的部署任務才能執行', () => {
    cy.contains('button', '核准').first().click();
    cy.contains('APPROVED').should('be.visible');
  });

  it.skip('TC-F15-03: 拒絕部署任務 [SDET TODO] 需要有 Pending 的部署任務才能執行', () => {
    cy.contains('button', '拒絕').first().click();
    cy.get('textarea').type('測試拒絕原因');
    cy.contains('button', '確認').click();
    cy.contains('REJECTED').should('be.visible');
  });


  it.skip('IT-DP-01: 憑證 issued → 自動部署 → 待審清單出現（跨模組）[SDET TODO] 需 CA + Endpoint 完整配置', () => {
    // 跨模組 / 狀態核查：憑證申請 → issued → 自動部署任務產生 → 待審清單出現
    // 前提：已設定 Endpoint + 合規政策，CA 可正常 issued（SIT 環境）
    cy.visit('/admin/approvals');
    cy.contains('button', '部署核准').click();
    cy.get('table tbody tr').its('length').should('be.gte', 1);
  });
});
