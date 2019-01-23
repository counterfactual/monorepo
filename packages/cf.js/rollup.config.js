import typescript from "rollup-plugin-typescript2";
import nodeResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";

import pkg from "./package.json";

const bundledDependencies = new Set([
  "@counterfactual/types",
  "eventemitter3",
]);

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      exports: "named"
    },
    {
      file: pkg.iife,
      name: "window.cf",
      format: "iife",
      exports: "named",
      globals: {
        "ethers/utils": "ethers.utils",
        "ethers/constants": "ethers.constants"
      }
    }
  ],
  plugins: [
    nodeResolve({
      only: [...bundledDependencies]
    }),
    commonjs({
      include: 'node_modules/eventemitter3/index.js',
    }),
    typescript(),
  ]
};
