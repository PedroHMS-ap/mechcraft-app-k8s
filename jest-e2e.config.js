const base = require('./jest.config.js');

module.exports = {
  ...base,
  roots: ['<rootDir>/test/integration'],
  testRegex: '.*\\.(e2e|integration)\\.spec\\.ts$',
  testPathIgnorePatterns: [],
  collectCoverageFrom: undefined,
};
