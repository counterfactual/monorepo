module.exports = {
  "verbose": false,
  "bail": true,
  "rootDir": ".",
  "cacheDirectory": "jest-cache",
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "\\.spec.(jsx?|tsx?)$",
  "testPathIgnorePatterns": [
    "node_modules",
    "dist"
  ],
  "roots": [
    "test"
  ],
  "moduleFileExtensions": [
    "ts",
    "js",
    "json"
  ],
  "testURL": "http://localhost/"
}
