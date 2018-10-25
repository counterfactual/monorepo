import typescript from "rollup-plugin-typescript2";

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
    })
  ]
};
