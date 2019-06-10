module.exports = {
  "verbose": false,
  "bail": true,
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "\\.spec.(ts?)$",
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
};
