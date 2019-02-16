/* global  module */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: "script",
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  },
  plugins: ["prettier"],
  extends: ["eslint:recommended", "prettier"],
  env: {
    node: true,
    es6: true
  },
  rules: {
    eqeqeq: "error",
    "block-scoped-var": "error",
    "prettier/prettier": "error",
    "no-console": "off"
  },
  globals: {}
};
