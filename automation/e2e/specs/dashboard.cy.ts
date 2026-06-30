// TC-F01: 儀表板
// Selectors derived from snapshot-01-dashboard.yml

describe('儀表板', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.contains('h2', '儀表板').should('be.visible');
  });

  it('TC-F01-01: 儀表板統計卡正確顯示', () => {
    cy.contains('h3', '現役憑證').should('be.visible');
    cy.contains('h3', '進行中').should('be.visible');
    cy.contains('h3', '30 天內到期').should('be.visible');
    cy.contains('h3', '7 天內到期').should('be.visible');
    cy.contains('h3', '已過期').should('be.visible');
    cy.contains('h3', '帳號數').should('be.visible');
    cy.contains('h3', '依狀態').should('be.visible');
    cy.contains('h3', '依 CA').should('be.visible');
  });

  it('TC-F01-02: 統計卡點擊跳轉至篩選列表', () => {
    // 統計卡是 generic div，用 parent() 找可點擊的容器
    cy.contains('h3', '現役憑證').parent().click();
    cy.url().should('include', '/certs');
  });

  it('TC-F01-03: 快速操作連結導向正確頁面', () => {
    cy.contains('a', '新申請憑證').should('have.attr', 'href', '/certs/new');
    cy.contains('a', '新申請憑證').click();
    cy.url().should('include', '/certs/new');
  });

  it('TC-F01-04: 重新整理更新資料時間', () => {
    cy.contains('資料時間').invoke('text').as('beforeTime');
    cy.contains('button', '重新整理').click();
    cy.contains('資料時間').invoke('text').should('not.be.empty');
  });
});
