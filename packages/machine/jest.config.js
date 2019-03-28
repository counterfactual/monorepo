// TODO: I'm guessing some of the below options are set to the default
//       values of Jest configs. Haven't spent the time to make this config
//       more minimal and not redundant but ought to do that at some point.

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
  "testURL": "http://localhost/",
  "extraGlobals": ["Math"]
}
