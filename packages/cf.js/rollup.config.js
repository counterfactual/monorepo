import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";

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
    typescript(),
  ]
};
