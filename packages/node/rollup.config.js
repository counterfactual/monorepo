import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import nodeBuiltins from "rollup-plugin-node-builtins";
import nodeGlobals from "rollup-plugin-node-globals";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import replace from "rollup-plugin-re";

import pkg from "./package.json";

const globals = {
  "@counterfactual/cf.js": "cfjs",
  eventemitter3: "EventEmitter",
  "ethers/constants": "ethers.constants",
  "ethers/errors": "ethers.errors",
  "ethers/utils": "ethers.utils",
  "ethers/wallet": "ethers.wallet",
  firebase: "firebase",
  events: "EventEmitter",
  uuid: "uuid"
};

const bundledDependencies = new Set([
  "@counterfactual/types",
  "@ebryn/jsonapi-ts",
  "jsonwebtoken",
  "koa-body",
  "koa-compose",
  "safe-buffer",
  "crypto",
  "ecdsa-sig-formatter",
  "path",
  "raw-body",
  "zlib",
  "qs",
  "formidable",
  "typescript-memoize",
  "p-queue",
  "setprototypeof",
  "iconv-lite"
]);

const external = [
  ...Object.keys(pkg.dependencies || {}).filter(dependency => {
    return !bundledDependencies.has(dependency);
  }),
  ...Object.keys(pkg.peerDependencies || {}).filter(dependency => {
    return !bundledDependencies.has(dependency);
  })
];

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: "cjs",
        globals: globals
      },
      {
        file: pkg.iife,
        sourcemap: true,
        name: "window",
        format: "iife",
        extend: true,
        globals: globals
      }
    ],
    external: external,
    plugins: [
      // HACK: removes formidable's attempt to overwrite `require`
      replace({
        patterns: [
          {
            // regexp match with resolved path
            match: /formidable(\/|\\)lib/, 
            // string or regexp
            test: 'if (global.GENTLY) require = GENTLY.hijack(require);', 
            // string or function to replaced with
            replace: '',
          }
        ]
      }),
      commonjs({
        namedExports: {
          "../../node_modules/typescript-memoize/dist/memoize-decorator.js": [
            "Memoize"
          ]
        }
      }),
      nodeGlobals(),
      nodeBuiltins(),
      json({ compact: true }),
      nodeResolve({
        only: [...bundledDependencies]
      }),
      typescript(),
    ]
  }
];
