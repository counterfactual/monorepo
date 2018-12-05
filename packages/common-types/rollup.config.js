import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
      {
        file: pkg.iife,
        format: "iife",
        name: "window",
        extend: true
      }
    ],
    plugins: [
      typescript()
    ]
  }
];
