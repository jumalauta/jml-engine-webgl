import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.mjs', '**/?(*.)+(spec|test).mjs'],
  collectCoverageFrom: [
    'src/**/*.{js,mjs}',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
  restoreMocks: true
};
