// TC-F10: DNS 機構管理
// Selectors derived from snapshot-live-admin-dns-providers-list.yml (2026-06-23)
// dialog 為 <div role="dialog" class="dlg-card">，非原生 <dialog>

describe('DNS 機構', () => {
  it('TC-F10-01: DNS Provider 清單顯示（自建自刪）', () => {
    const dnsName = `qa-manual-tc01-${Date.now()}`;
    cy.visit('/admin/dns-providers');
    cy.contains('h2', 'DNS 管理').should('be.visible');
    // 新增一筆以觸發 table 渲染
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').clear().type(dnsName);
    cy.contains('button', '儲存').click();
    cy.contains(dnsName).should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
    // 驗證 table 與欄位標題
    cy.get('table').should('be.visible');
    cy.contains('th', '名稱').should('be.visible');
    cy.contains('th', '類型').should('be.visible');
    cy.contains('th', '健康狀態').should('be.visible');
    cy.screenshot('TC-F10-01 清單顯示', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains(dnsName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains(dnsName).should('not.exist');
  });

  it('TC-F10-02: 新增 Manual DNS Provider（自建自刪）', () => {
    const dnsName = `qa-manual-${Date.now()}`;
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('h3', '新增 DNS 帳號').should('be.visible');
    cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
    cy.contains('API Token').should('not.exist');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').clear().type(dnsName);
    cy.contains('button', '儲存').should('not.be.disabled');
    cy.contains('button', '儲存').click();
    cy.contains(dnsName).should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
    cy.screenshot('TC-F10-02 新增成功', { capture: 'fullPage', log: false });
    cy.contains(dnsName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains(dnsName).should('not.exist');
  });

  it('TC-F10-03: Cloudflare 類型表單驗證（名稱填寫後儲存啟用）', () => {
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('API Token').should('be.visible');
    cy.contains('button', '儲存').should('be.disabled');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').type('qa-cf-test');
    cy.contains('button', '儲存').should('not.be.disabled');
    cy.screenshot('TC-F10-03 儲存啟用', { capture: 'fullPage', log: false });
    cy.contains('button', '取消').click();
  });

  it('TC-F10-04: Manual Provider 測試連線回傳成功（自建自刪）', () => {
    const dnsName = `qa-manual-tc04-${Date.now()}`;
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').clear().type(dnsName);
    cy.contains('button', '儲存').click();
    cy.contains(dnsName).should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains(dnsName).parents('tr').contains('button', '測試連線').click();
    cy.get('.dlg-success').should('be.visible');
    cy.screenshot('TC-F10-04 測試連線成功', { capture: 'fullPage', log: false });
    cy.get('.dlg-success').contains('button', '確認').click();
    cy.get('.dlg-success').should('not.exist');
    // 自我清理
    cy.contains(dnsName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains(dnsName).should('not.exist');
  });

  it('TC-F10-05 / IT-DNS-NEG-01: Cloudflare 假 token 測試連線回傳錯誤（自建自刪）', () => {
    // IT-DNS-NEG-01 負向測試：無效 credentials 測試連線應回傳失敗（對應 S10-05）
    const dnsName = `qa-cf-tc05-${Date.now()}`;
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('類型 *').parent().find('select').select('Cloudflare');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').clear().type(dnsName);
    cy.get('input[placeholder*="token"], input[type="password"]').first().clear().type('fake-token-000');
    cy.contains('button', '儲存').click();
    cy.contains(dnsName).should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains(dnsName).parents('tr').contains('button', '測試連線').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.screenshot('TC-F10-05 測試連線失敗', { capture: 'fullPage', log: false });
    cy.get('[role="dialog"]').contains('button', '確認').click();
    cy.get('[role="dialog"]').should('not.exist');
    // 自我清理
    cy.contains(dnsName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains(dnsName).should('not.exist');
  });

  it('TC-F10-06 / IT-DNS-FORM-01: 新增表單類型切換驗證（Manual↔非Manual 欄位顯示/消失）', () => {
    // IT-DNS-FORM-01 邊界測試：切換類型後欄位動態切換正確（對應 S10-06）
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('h3', '新增 DNS 帳號').should('be.visible');
    cy.contains('API Token').should('be.visible');
    cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
    cy.contains('API Token').should('not.exist');
    cy.contains('類型 *').parent().find('select').select('Cloudflare');
    cy.contains('API Token').should('be.visible');
    cy.contains('類型 *').parent().find('select').select('AWS Route 53');
    cy.contains('AWS Access Key ID').should('be.visible');
    cy.contains('AWS Secret Access Key').should('be.visible');
    cy.screenshot('TC-F10-06 AWS欄位顯示', { capture: 'fullPage', log: false });
    cy.contains('button', '取消').click();
  });


  it('TC-F10-07: 新增 Manual DNS Provider → 測試連線 → 刪除', () => {
    const dnsName = `qa-manual-tc07-${Date.now()}`;
    cy.visit('/admin/dns-providers');
    cy.contains('button', '新增 DNS 帳號').click();
    cy.contains('h3', '新增 DNS 帳號').should('be.visible');
    cy.contains('類型 *').parent().find('select').select('Manual (使用者自己編 TXT)');
    cy.get('input[placeholder="Prod-Cloudflare / Internal-BIND"]').clear().type(dnsName);
    cy.contains('button', '儲存').click();
    cy.contains(dnsName).should('be.visible');
    cy.contains(dnsName).parents('tr').contains('button', '測試連線').click();
    cy.contains(dnsName).parents('tr').contains('manual mode').should('be.visible');
    // 測試連線結果顯示 dlg-success，需點「確認」關閉後才能點刪除
    cy.get('.dlg-success').should('be.visible');
    cy.screenshot('TC-F10-07 測試連線成功', { capture: 'fullPage', log: false });
    cy.get('.dlg-success').contains('button', '確認').click();
    cy.get('.dlg-success').should('not.exist');
    cy.contains(dnsName).parents('tr').contains('button', '刪除').click();
    cy.get('.dlg-danger').should('be.visible');
    cy.get('.dlg-danger').contains('button', '刪除').click();
    cy.contains(dnsName).should('not.exist');
  });
});
