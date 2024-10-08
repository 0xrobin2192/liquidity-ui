it('Dashboard - Not Connected', () => {
  cy.viewport(1200, 900);
  cy.visit('/#/dashboard');

  cy.contains('h2', 'Dashboard').should('exist');

  cy.contains('[data-cy="connect wallet button"]', 'Connect Wallet').should('exist');
  cy.contains(
    '[data-status="info"]',
    'Please connect your wallet to open, manage or view positions.'
  ).should('exist');
  cy.get('[data-cy="stats box"][data-title="Available to Lock"]').should('exist');
  cy.get('[data-cy="stats box"][data-title="Total Locked"]').should('exist');
  cy.get('[data-cy="stats box"][data-title="Total Debt"]').should('exist');

  cy.contains('h2', 'Positions').should('exist');
  cy.contains('p', 'Please connect wallet to view active positions').should('exist');
});
