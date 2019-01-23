import typescript from "rollup-plugin-typescript2";
import nodeResolve from "rollup-plugin-node-resolve";

import pkg from "./package.json";

const bundledDependencies = new Set([
  "@counterfactual/types",
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
    typescript(),
  ]
};
