import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const globals = {
  "@counterfactual/cf.js": "cfjs",
  "eventemitter3": "EventEmitter"
}

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: "cjs",
        globals: globals
      },
      {
        file: pkg.iife,
        sourcemap: true,
        name: "window",
        format: "iife",
        extend: true,
        globals: globals
      }
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.rollup.json"
      })
    ]
  }
];
