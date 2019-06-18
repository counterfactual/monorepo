import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const external = [
  ...Object.keys(pkg.dependencies || {})
];

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      sourcemap: true,
      format: "cjs"
    }
  ],
  external: external,
  plugins: [
    typescript()
  ]
};
