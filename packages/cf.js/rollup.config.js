import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      exports: "named",
    },
    {
      file: pkg.iife,
      name: "window.cf",
      format: "iife",
      exports: "named",
      globals: {
        "@counterfactual/types": "commonTypes",
        "ethers/utils": "ethers.utils",
        "ethers/constants": "ethers.constants"
      }
    }
  ],
  plugins: [
    typescript(),
    json({
      include: [
        // FIXME: these shouldn't be required
        "../contracts/build/contracts/ETHBalanceRefundApp.json"
      ]
    })
  ]
};
