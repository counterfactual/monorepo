import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const globals = {
  firebase: "firebase",
  loglevel: "log"
};

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: "cjs"
      },
      {
        file: pkg.iife,
        sourcemap: true,
        name: "window",
        extend: true,
        format: "iife",
        globals: globals
      }
    ],
    plugins: [typescript()]
  }
];
