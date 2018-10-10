import typescript from "rollup-plugin-typescript2";
import json from "rollup-plugin-json";

import pkg from "./package.json";

export default {
  input: "index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs"
    },
    {
      file: pkg.module,
      format: "es"
    }
  ],
  external: ["@counterfactual/machine", "ethers"],
  plugins: [
    json({
      include: ["contracts/build/contracts/*", "contracts/networks/*"],
      preferConst: true
    }),
    typescript({
      typescript: require("typescript")
    })
  ]
};
