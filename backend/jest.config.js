module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/services/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageReporters: ['text', 'lcov'],
  clearMocks: true
};
