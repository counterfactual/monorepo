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
      name: "cfjs",
      format: "iife",
      exports: "named",
      globals: {
        ethers: "ethers",
        cuid: "cuid",
        eventemitter3: "EventEmitter"
      }
    }
  ],
  plugins: [
    typescript(),
    json({
      include: [
        // FIXME: these shouldn't be required
        "../apps/build/ETHBalanceRefundApp.json"
      ]
    })
  ]
};
