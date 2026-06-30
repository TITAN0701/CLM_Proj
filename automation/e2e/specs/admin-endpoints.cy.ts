// TC-F13: Endpoint 管理
// Selectors derived from live snapshot (2026-06-23)
// 新增表單為 inline form（h3 "新增 Endpoint" + 儲存/取消），非 dialog
// 刪除確認為 <div role="dialog">

describe('Endpoint 管理', () => {
  it('TC-F13-01: Endpoint 清單顯示', () => {
    cy.visit('/admin/endpoints');
    cy.contains('h2', 'Endpoint管理').should('be.visible');
    cy.get('table').should('be.visible');
    cy.contains('th', 'Name').should('be.visible');
    cy.contains('th', 'Type').should('be.visible');
    cy.contains('th', 'Group').should('be.visible');
    cy.screenshot('TC-F13-01 Endpoint清單', { capture: 'fullPage', log: false });
  });

  it('TC-F13-02: 新增 local Endpoint（自建自刪）', () => {
    const name = `qa-local-${Date.now()}`;
    cy.visit('/admin/endpoints');
    cy.contains('button', '新增 Endpoint').click();
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.get('input[placeholder="web-prod-01 / f5-banking-vip"]').clear().type(name);
    cy.get('select').eq(1).select('本機檔案 (demo)');
    cy.screenshot('TC-F13-02 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 Endpoint').should('not.exist');
    cy.contains('td', name).should('be.visible');
    cy.screenshot('TC-F13-02 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', name).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', name).should('not.exist');
  });

  it('TC-F13-03: 新增 webhook Endpoint（自建自刪）', () => {
    const name = `qa-webhook-${Date.now()}`;
    cy.visit('/admin/endpoints');
    cy.contains('button', '新增 Endpoint').click();
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.get('input[placeholder="web-prod-01 / f5-banking-vip"]').clear().type(name);
    cy.get('select').eq(1).select('通用 Webhook');
    cy.screenshot('TC-F13-03 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 Endpoint').should('not.exist');
    cy.contains('td', name).should('be.visible');
    cy.screenshot('TC-F13-03 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', name).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', name).should('not.exist');
  });

  it('TC-F13-04: 新增 SSH Endpoint（自建自刪）', () => {
    const name = `qa-ssh-${Date.now()}`;
    cy.visit('/admin/endpoints');
    cy.contains('button', '新增 Endpoint').click();
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.get('input[placeholder="web-prod-01 / f5-banking-vip"]').clear().type(name);
    cy.get('select').eq(1).select('通用 SSH (自訂路徑)');
    cy.screenshot('TC-F13-04 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 Endpoint').should('not.exist');
    cy.contains('td', name).should('be.visible');
    cy.screenshot('TC-F13-04 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', name).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', name).should('not.exist');
  });

  it('TC-F13-05: 新增 F5 Endpoint（自建自刪）', () => {
    const name = `qa-f5-${Date.now()}`;
    cy.visit('/admin/endpoints');
    cy.contains('button', '新增 Endpoint').click();
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.get('input[placeholder="web-prod-01 / f5-banking-vip"]').clear().type(name);
    cy.get('select').eq(1).select('F5 BIG-IP');
    cy.screenshot('TC-F13-05 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 Endpoint').should('not.exist');
    cy.contains('td', name).should('be.visible');
    cy.screenshot('TC-F13-05 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', name).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', name).should('not.exist');
  });

  it('IT-DP-NEG-02: 新增 webhook Endpoint 填無效 URL → 前端驗證阻擋', () => {
    // 邊界測試：URL 欄位填入非 URL 格式，儲存應被前端擋下或顯示格式錯誤
    // ⚠️  BUG：前端未驗證 URL 格式，直接新增成功（2026-06-25 確認）
    // TC 保持 fail，以下自我清理確保測試資料不殘留
    const name = `qa-invalid-url-${Date.now()}`;
    cy.visit('/admin/endpoints');
    cy.contains('button', '新增 Endpoint').click();
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.get('input[placeholder="web-prod-01 / f5-banking-vip"]').clear().type(name);
    cy.get('select').eq(1).select('通用 Webhook');
    cy.get('input[placeholder*="https://customer"]').first().clear().type('not-a-valid-url');
    cy.screenshot('IT-DP-NEG-02 無效URL輸入', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    // 預期：表單仍在（前端阻擋）→ 實際：表單關閉跳回列表（Bug）
    // 自我清理：若新增成功，找到並刪除測試資料
    cy.url().then(url => {
      if (url.includes('/admin/endpoints')) {
        cy.contains('td', name).then($el => {
          if ($el.length) {
            cy.contains('td', name).parents('tr').contains('button', '刪除').click();
            cy.get('[role="dialog"]').contains('button', '刪除').click();
          }
        });
      }
    });
    // assert 預期行為（此 assert 應 fail，直到前端補上 URL 格式驗證）
    cy.contains('h3', '新增 Endpoint').should('be.visible');
    cy.screenshot('IT-DP-NEG-02 驗證阻擋確認', { capture: 'fullPage', log: false });
  });

});
