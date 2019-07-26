const rootConfig = require("../../jest.config");

module.exports = Object.assign(
  rootConfig,
  {
    "globalSetup": "<rootDir>/test/global-setup.jest.ts",
    "globalTeardown": "<rootDir>/test/global-teardown.jest.ts",
    "testEnvironment": "<rootDir>/test/node-test-environment.jest.js",
  }
);
