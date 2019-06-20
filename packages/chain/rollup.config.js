import json from "rollup-plugin-json";
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: "cjs"
      }
    ],
    external: Object.keys(pkg.devDependencies),
    plugins: [
      json({ compact: true }),
      typescript()
    ]
  }
];
