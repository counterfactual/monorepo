import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";
const globals = {
  ethers: "ethers",
  lodash: "_",
  testUtils: "test-utils"
};

export default {
  input: "index.ts",
  output: [
    {
      file: pkg.main,
      sourcemap: true,
      format: "cjs",
      globals: globals
    },
    {
      file: pkg.module,
      sourcemap: true,
      format: "es",
      globals: globals
    },
    {
      file: pkg.iife,
      format: "iife",
      sourcemap: true,
      name: "counterfactualWallet",
      globals: globals
    }
  ],
  external: ["@counterfactual/machine", "ethers"],
  plugins: [
    json({
      include: ["../contracts/build/contracts/*", "../contracts/networks/*"],
      preferConst: true
    }),
    typescript({
      typescript: require("typescript")
    })
  ]
};
