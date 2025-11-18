/**
 * Test fixtures for elicitation tests
 */

export const mockPlanArgs = {
  planSummary: 'Add JWT authentication in 5 phases',
  planFilePath: 'plans/user-authentication-plan.md',
  openQuestions: [
    'Use bcrypt for password hashing? Yes / No',
    'Session expiry time? 1 hour / 24 hours / 7 days'
  ]
};

export const mockPlanArgsNoQuestions = {
  planSummary: 'Simple refactoring task',
  planFilePath: 'plans/refactoring-plan.md',
  openQuestions: []
};

export const mockPhaseArgs = {
  phaseNumber: 1,
  phaseTitle: 'User Model and Database Schema',
  summary: 'Created User model with email, password fields and validation',
  filesChanged: [
    'src/models/User.ts',
    'src/__tests__/models/User.test.ts',
    'prisma/schema.prisma'
  ],
  commitMessage: 'feat: Add User model with password hashing\n\n- Create User schema with email and password fields\n- Implement bcrypt password hashing\n- Add comprehensive tests',
  reviewStatus: 'APPROVED'
};

export const mockElicitationResult = {
  accept: (content: any) => ({
    action: 'accept',
    content
  }),
  decline: () => ({
    action: 'decline'
  }),
  cancel: () => ({
    action: 'cancel'
  })
};
