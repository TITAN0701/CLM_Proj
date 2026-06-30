// Custom Cypress commands for RXCLM
// Login selectors derived from snapshot-00-login.yml:
//   Email: input[type="text"] (first textbox, no placeholder/id)
//   Password: input[type="password"]
//   Submit: button "登入"
//   Dev quick-fill list: listitem containing "admin@local"

Cypress.Commands.add('loginAsAdmin', () => {
  cy.session(
    'adminSession',
    () => {
      cy.visit('/login');
      cy.get('input[type="password"]', { timeout: 15000 }).should('be.visible');
      const email = Cypress.env('TEST_USER_EMAIL') || 'admin@local';
      const password = Cypress.env('TEST_USER_PASSWORD') || 'testtest';
      cy.get('input').eq(0).clear().type(email);
      cy.get('input[type="password"]').clear().type(password);
      cy.contains('button', '登入').click();
      cy.url().should('include', '/dashboard');
    },
    { cacheAcrossSpecs: true }
  );
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
    }
  }
}
