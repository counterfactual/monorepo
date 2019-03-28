module.exports = {
  "bail": true,
  "coverageDirectory": "jest-coverage",
  "coveragePathIgnorePatterns": [
    "test"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  "reporters": ["jest-dot-reporter"],
  "globalSetup": "<rootDir>/test/global-setup.jest.ts",
  "globalTeardown": "<rootDir>/test/global-teardown.jest.ts",
  "testEnvironment": "<rootDir>/test/node-test-environment.jest.js",
  "moduleFileExtensions": [
    "ts",
    "js",
    "json"
  ],
  "rootDir": ".",
  "roots": [
    "test"
  ],
  "testPathIgnorePatterns": [
    "node_modules",
    "dist"
  ],
  "testRegex": "\\.spec.(jsx?|tsx?)$",
  "testURL": "http://localhost/",
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "verbose": true,
  "extraGlobals": ["Math"]
}
