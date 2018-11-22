import builtins from "rollup-plugin-node-builtins";
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";
const globals = {
  ethers: "ethers",
  lodash: "_"
};

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
        name: "cfNode",
        format: "iife",
        globals: globals
      }
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      builtins(),
      typescript({
        typescript: require("typescript"),
        tsconfig: "tsconfig.rollup.json"
      })
    ]
  }
];
