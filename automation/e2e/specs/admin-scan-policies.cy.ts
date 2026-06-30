// TC-F16, F17: 憑證掃描、合規政策
// Selectors derived from snapshot-12-admin-scan.yml, snapshot-13-admin-policies.yml

describe('憑證掃描', () => {
  it('TC-F16-01: 掃描頁面顯示與觸發掃描', () => {
    cy.visit('/admin/scan');
    cy.contains('h2', '掃描既有憑證').should('be.visible');
    cy.contains('h3', 'Endpoint 列表').should('be.visible');
    cy.get('table').should('be.visible');
  });

  it.skip('TC-F16-02: 實際觸發掃描 [SDET TODO] 需確認有可用 Endpoint 且掃描結果 selector', () => {
    cy.visit('/admin/scan');
    cy.get('select').first().select(1);
    cy.contains('button', '掃描').click();
    cy.contains('掃描完成', { timeout: 30000 }).should('be.visible');
  });


  it.skip('IT-SC-01: 掃描觸發 → 合規政策比對 → 不合規憑證標注（跨模組）[SDET TODO] 需 Endpoint + 已設定合規政策', () => {
    // 跨模組 / 狀態核查：掃描結果 → 合規政策比對 → 不合規憑證在列表 / 違規清單顯示
    // 前提：已設定合規政策（如要求 RSA-2048），且 Endpoint 有不符政策的憑證
    cy.visit('/admin/scan');
    cy.get('table tbody tr').first().contains('button', '掃描').click();
    cy.contains('掃描完成', { timeout: 30000 }).should('be.visible');
    // 前往合規政策違規清單確認不合規憑證被標注
    cy.visit('/admin/policies');
    cy.contains('button', '違規紀錄').click();
    cy.get('table tbody tr').its('length').should('be.gte', 1);
    cy.screenshot('IT-SC-01 違規紀錄', { capture: 'fullPage', log: false });
  });
});

describe('合規政策', () => {
  it('TC-F17-01: 合規政策清單顯示', () => {
    cy.visit('/admin/policies');
    cy.contains('h2', '合規政策').should('be.visible');
    cy.contains('button', '新增政策').should('be.visible');
    cy.contains('button', '違規紀錄').should('be.visible');
  });

  it.skip('TC-F17-02: 新增合規政策 [SDET TODO] 確認新增政策表單欄位 selector', () => {
    cy.visit('/admin/policies');
    cy.contains('button', '新增政策').click();
  });

});
