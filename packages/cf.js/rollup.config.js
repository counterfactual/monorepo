import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";
const globals = {
  ethers: "ethers",
  lodash: "_"
};

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true
    },
    {
      file: pkg.module,
      format: "es",
      sourcemap: true
    },
    {
      file: pkg.iife,
      name: "ci",
      format: "iife",
      sourcemap: true,
      globals: globals
    }
  ],
  plugins: [
    typescript({
      typescript: require("typescript")
    }),
    json({
      include: [
        "../contracts/build/contracts/ETHBalanceRefundApp.json",
        "../contracts/build/contracts/AppInstance.json"
      ]
    })
  ]
};
