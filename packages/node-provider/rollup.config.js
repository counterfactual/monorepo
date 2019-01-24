import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const bundledDependencies = new Set([
  "@counterfactual/types",
  "eventemitter3",
]);

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs"
      },
      {
        file: pkg.iife,
        format: "iife",
        name: "window",
        extend: true
      }
    ],
    plugins: [
      nodeResolve({
        only: [...bundledDependencies]
      }),
      commonjs({
        include: 'node_modules/eventemitter3/index.js',
      }),
      typescript()
    ]
  }
];
