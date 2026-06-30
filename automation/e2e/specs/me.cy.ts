// TC-F20: 我的帳號
// Selectors derived from snapshot-16-me.yml (re-verified live)

describe('我的帳號', () => {
  beforeEach(() => {
    cy.visit('/me');
    cy.contains('h2', '我的帳號').should('be.visible');
  });

  it('TC-F20-01: 個人資料顯示', () => {
    cy.contains('h3', '基本資料').should('be.visible');
    cy.contains('admin@local').should('be.visible');
    cy.contains('admin').should('be.visible');
    cy.contains('h3', '變更密碼').should('be.visible');
    cy.contains('h3', 'MFA').should('be.visible');
  });

  it.skip('TC-F20-02: 修改密碼成功 [SDET TODO] 執行後需還原密碼，避免影響後續測試', () => {
    cy.get('h3').contains('變更密碼').closest('div').within(() => {
      cy.get('input[type="password"]').eq(0).type('testtest');
      cy.get('input[type="password"]').eq(1).type('testtest2');
      cy.get('input[type="password"]').eq(2).type('testtest2');
    });
    cy.contains('button', '更新密碼').click();
    cy.contains('成功').should('be.visible');
    // 還原密碼
    cy.get('h3').contains('變更密碼').closest('div').within(() => {
      cy.get('input[type="password"]').eq(0).type('testtest2');
      cy.get('input[type="password"]').eq(1).type('testtest');
      cy.get('input[type="password"]').eq(2).type('testtest');
    });
    cy.contains('button', '更新密碼').click();
  });

  it('TC-F20-03 / IT-UA-NEG-01: 舊密碼錯誤時 Auth 拒絕修改（負向測試）', () => {
    // IT-UA-NEG-01 負向測試：填入錯誤舊密碼 → Auth 服務拒絕 → UI 顯示錯誤訊息
    cy.get('h3').contains('變更密碼').closest('div').within(() => {
      cy.get('input[type="password"]').eq(0).type('wrongpassword-that-is-definitely-wrong');
      cy.get('input[type="password"]').eq(1).type('NewPassword123!');
      cy.get('input[type="password"]').eq(2).type('NewPassword123!');
    });
    cy.screenshot('IT-UA-NEG-01 舊密碼錯誤輸入', { capture: 'fullPage', log: false });
    cy.contains('button', '更新密碼').click();
    // Auth 服務應拒絕並顯示錯誤訊息（舊密碼錯誤、驗證失敗等）
    cy.get('main, [role="alert"], .error, form').should('contain.text', '').then(() => {
      cy.get('body').should('satisfy', ($body) => {
        const text = $body.text();
        return text.includes('舊密碼') || text.includes('錯誤') || text.includes('失敗') || text.includes('incorrect');
      });
    });
    cy.screenshot('IT-UA-NEG-01 錯誤訊息顯示', { capture: 'fullPage', log: false });
  });
});
