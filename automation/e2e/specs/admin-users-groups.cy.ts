// TC-F11, F12: Group 管理、User 管理
// Selectors derived from live snapshot (2026-06-23)
// 新增/編輯表單為 inline form（h3 + 儲存/取消），非 dialog
// 刪除/強登出確認為 <div role="dialog" class="dlg-danger">

describe('Group 管理', () => {
  it('TC-F11-01: Group 清單顯示', () => {
    cy.visit('/admin/groups');
    cy.contains('h2', 'Group 管理').should('be.visible');
    cy.get('table').should('be.visible');
    cy.contains('th', 'Group ID').should('be.visible');
    cy.contains('th', 'Name').should('be.visible');
    cy.contains('th', 'Display name').should('be.visible');
    cy.contains('td', 'Default group').should('be.visible');
    cy.screenshot('TC-F11-01 Group清單', { capture: 'fullPage', log: false });
  });

  it('TC-F11-02: 新增 Group（自建自刪）', () => {
    const groupName = `qa-group-${Date.now()}`;
    cy.visit('/admin/groups');
    cy.contains('button', '新增組別').click();
    cy.contains('h3', '新增組別').should('be.visible');
    cy.get('input[placeholder="ops-team / finance / subsidiary-a"]').clear().type(groupName);
    cy.screenshot('TC-F11-02 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增組別').should('not.exist');
    cy.contains('td', groupName).should('be.visible');
    cy.screenshot('TC-F11-02 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', groupName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', groupName).should('not.exist');
  });

  it('TC-F11-03: 編輯 Group Display name（自建自刪）', () => {
    const groupName = `qa-group-edit-${Date.now()}`;
    const displayName = `QA Display ${Date.now()}`;
    cy.visit('/admin/groups');
    cy.contains('button', '新增組別').click();
    cy.contains('h3', '新增組別').should('be.visible');
    cy.get('input[placeholder="ops-team / finance / subsidiary-a"]').clear().type(groupName);
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增組別').should('not.exist');
    cy.contains('td', groupName).should('be.visible');
    cy.contains('td', groupName).parents('tr').contains('button', '編輯').click();
    cy.contains('h3', '編輯').should('be.visible');
    cy.get('input[placeholder="Ops Team"]').clear().type(displayName);
    cy.screenshot('TC-F11-03 編輯表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '編輯').should('not.exist');
    cy.contains('td', displayName).should('be.visible');
    cy.screenshot('TC-F11-03 編輯成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', displayName).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', displayName).should('not.exist');
  });


});

describe('User 管理', () => {
  it('TC-F12-01: User 清單顯示與篩選欄位', () => {
    cy.visit('/admin/users');
    cy.contains('h2', 'User 管理').should('be.visible');
    cy.get('table').should('be.visible');
    cy.contains('th', 'Email').should('be.visible');
    cy.contains('th', '顯示名稱').should('be.visible');
    cy.contains('th', '角色').should('be.visible');
    cy.contains('td', 'admin@local').should('be.visible');
    cy.contains('td', 'user1@local').should('be.visible');
    cy.get('input[placeholder="搜尋..."]').should('be.visible');
    cy.contains('Role:').should('be.visible');
    cy.contains('Group:').should('be.visible');
    cy.screenshot('TC-F12-01 User清單', { capture: 'fullPage', log: false });
  });

  it('TC-F12-02: 新增 User（自建自刪）', () => {
    const userEmail = `qa-user-${Date.now()}@local`;
    cy.visit('/admin/users');
    cy.contains('button', '新增 User').click();
    cy.contains('h3', '新增 User').should('be.visible');
    cy.get('input').eq(0).clear().type(userEmail);
    cy.get('input[placeholder="≥ 8"]').clear().type('Qa123456!');
    cy.screenshot('TC-F12-02 新增表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 User').should('not.exist');
    cy.contains('td', userEmail).should('be.visible');
    cy.screenshot('TC-F12-02 新增成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', userEmail).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', userEmail).should('not.exist');
  });

  it('TC-F12-03: 搜尋 User', () => {
    cy.visit('/admin/users');
    cy.get('input[placeholder="搜尋..."]').type('user1');
    cy.contains('td', 'user1@local').should('be.visible');
    cy.contains('td', 'admin@local').should('not.exist');
    cy.screenshot('TC-F12-03 搜尋結果', { capture: 'fullPage', log: false });
  });

  it('TC-F12-04: Role 篩選', () => {
    cy.visit('/admin/users');
    cy.get('select').eq(1).select('admin');
    cy.contains('td', 'admin@local').should('be.visible');
    cy.contains('td', 'user1@local').should('be.visible');
    cy.contains('td', 'user2@local').should('not.exist');
    cy.screenshot('TC-F12-04 Role篩選', { capture: 'fullPage', log: false });
  });

  it('TC-F12-05: 編輯 User 顯示名稱（自建自刪）', () => {
    const userEmail = `qa-edit-${Date.now()}@local`;
    const displayName = `QA User ${Date.now()}`;
    cy.visit('/admin/users');
    cy.contains('button', '新增 User').click();
    cy.contains('h3', '新增 User').should('be.visible');
    cy.get('input').eq(0).clear().type(userEmail);
    cy.get('input[placeholder="≥ 8"]').clear().type('Qa123456!');
    cy.contains('button', '儲存').click();
    cy.contains('h3', '新增 User').should('not.exist');
    cy.contains('td', userEmail).should('be.visible');
    cy.contains('td', userEmail).parents('tr').contains('button', '編輯').click();
    cy.contains('h3', '編輯').should('be.visible');
    cy.get('input').eq(2).clear().type(displayName);
    cy.screenshot('TC-F12-05 編輯表單', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    cy.contains('h3', '編輯').should('not.exist');
    cy.contains('td', displayName).should('be.visible');
    cy.screenshot('TC-F12-05 編輯成功', { capture: 'fullPage', log: false });
    // 自我清理
    cy.contains('td', userEmail).parents('tr').contains('button', '刪除').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '刪除').click();
    cy.contains('td', userEmail).should('not.exist');
  });

  it('TC-F12-06: 強登出 User（確認 dialog 出現後取消）', () => {
    cy.visit('/admin/users');
    cy.contains('td', 'user1@local').parents('tr').contains('button', '強登出').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('強制登出全部 session').should('be.visible');
    cy.screenshot('TC-F12-06 強登出確認', { capture: 'fullPage', log: false });
    cy.get('[role="dialog"]').contains('button', '取消').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('IT-UA-NEG-02: 新增 User 時 email 格式無效 → 前端驗證拒絕', () => {
    // 邊界測試：非 email 格式應被前端擋下
    cy.visit('/admin/users');
    cy.contains('button', '新增 User').click();
    cy.contains('h3', '新增 User').should('be.visible');
    cy.get('input').eq(0).clear().type('not-an-email-format');
    cy.get('input[placeholder="≥ 8"]').clear().type('Qa123456!');
    cy.screenshot('IT-UA-NEG-02 無效email輸入', { capture: 'fullPage', log: false });
    cy.contains('button', '儲存').click();
    // 前端應阻擋：表單仍在（h3 存在）或顯示格式錯誤訊息
    cy.contains('h3', '新增 User').should('be.visible');
    cy.screenshot('IT-UA-NEG-02 驗證阻擋確認', { capture: 'fullPage', log: false });
    cy.contains('button', '取消').click();
  });


  it.skip('IT-UA-02: admin 強登出 User → session 失效 → 再操作跳轉登入頁（跨模組）[SDET TODO] 需雙瀏覽器或 cy.session 配合', () => {
    // 跨模組 / API驗證：強登出後該 User 的現存 session 真正失效
    // Step 1: admin 對 user1@local 執行強登出
    cy.visit('/admin/users');
    cy.contains('td', 'user1@local').parents('tr').contains('button', '強登出').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').contains('button', '強登出').click();
    cy.get('[role="dialog"]').should('not.exist');
    // Step 2: [SDET TODO] 需要在另一個瀏覽器 context 驗證 user1 session 已失效
    // 可用 cy.request 帶 user1 的 token 打任意 API，確認回傳 401
  });
});
