module.exports = {
  "coverageDirectory": "jest-coverage",
  "coveragePathIgnorePatterns": [
    "test"
  ],
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
