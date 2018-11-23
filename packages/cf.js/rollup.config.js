import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs"
    },
    {
      file: pkg.iife,
      name: "cfjs",
      format: "iife"
    }
  ],
  plugins: [
    typescript(),
    json({
      include: [
        // FIXME: these shouldn't be required
        "../contracts/build/contracts/ETHBalanceRefundApp.json",
        "../contracts/build/contracts/AppInstance.json"
      ]
    })
  ]
};
