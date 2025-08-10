export default {
  testEnvironment: 'node',
  // Only run tests from the root area; ignore nested package tests
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tool_server/'],
  collectCoverageFrom: ['src/**/*.js', '!**/node_modules/**']
};
