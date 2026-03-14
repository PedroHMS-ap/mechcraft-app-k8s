module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test/unit'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', {}] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/test/integration/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/app.module.ts'
  ],
  coverageThreshold: {
    'src/modules/workorders/workorders.service.ts': {
      statements: 75,
      branches: 45,
      functions: 80,
      lines: 80,
    },
    'src/modules/parts/parts.service.ts': {
      statements: 70,
      branches: 40,
      functions: 60,
      lines: 70,
    },
    'src/modules/metrics/metrics.service.ts': {
      statements: 90,
      branches: 70,
      functions: 90,
      lines: 90,
    },
  },
};
