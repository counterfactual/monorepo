module.exports = {
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
