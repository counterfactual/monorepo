import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const globals = {
  "@counterfactual/cf.js": "cfjs",
  "eventemitter3": "EventEmitter",
  "ethers/constants": "ethers.constants",
  "ethers/utils": "ethers.utils",
  "ethers/wallet": "ethers.wallet",
  "firebase": "firebase",
  "uuid": "uuid"
}

const external = [
  ...(Object.keys(pkg.dependencies || {})).filter(dependency => {
    return (dependency !== "@counterfactual/types");
  }),
  ...Object.keys(pkg.peerDependencies || {})
];

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
    sourceMap: true,
    external: external,
    plugins: [
      nodeResolve({
        only: ["@counterfactual/types"]
      }),
      typescript({
        tsconfig: "tsconfig.rollup.json"
      })
    ]
  }
];
