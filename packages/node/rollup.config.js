import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

const globals = {
  "@counterfactual/cf.js": "cfjs",
  eventemitter3: "EventEmitter",
  "ethers": "ethers",
  "ethers/constants": "ethers.constants",
  "ethers/errors": "ethers.errors",
  "ethers/providers": "ethers.providers",
  "ethers/utils": "ethers.utils",
  "ethers/utils/hdnode": "ethers.utils.HDNode",
  "ethers/wallet": "ethers.wallet",
  firebase: "firebase",
  "firebase/app": "firebase.app",
  events: "EventEmitter",
  loglevel: "log",
  uuid: "uuid"
};

const bundledDependencies = new Set([
  "@counterfactual/firebase-client",
  "@counterfactual/cf-funding-protocol-contracts",
  "@counterfactual/cf-adjudicator-contracts",
  "@counterfactual/types",
  "typescript-memoize",
  "p-queue",
  "rpc-server"
]);

const external = [
  ...Object.keys(pkg.dependencies || {}).filter(dependency => {
    return !bundledDependencies.has(dependency);
  }),
  ...Object.keys(pkg.peerDependencies || {}).filter(dependency => {
    return !bundledDependencies.has(dependency);
  })
];

const onwarn = warning => {
  // Silence circular dependency warnings specifically for reasonable
  // circular dependencies
  // Rationale: The current implementation requires the `src/api.ts` to setup
  // the mapping between method & event names to controllers. Each controller
  // refers to the `RequestHandler` to access certain resources. The
  // `RequestHandler` refers to the `src/api.ts` file to lookup the method & event
  // mapping so it knows how to route the call.
  // The more elegnat solution, instead of overlooking this circular dependency,
  // is to refactor how calls are routed to controllers, specifically the
  // behavior around `mapPublicApiMethods` and `mapEventHandlers`
  const circularDependencyWarnings = new Set([
    "Circular dependency: src/api.ts -> src/methods/index.ts -> src/methods/app-instance/get-app-instance/controller.ts -> src/request-handler.ts -> src/api.ts"
  ]);

  if (circularDependencyWarnings.has(warning.message) ||
    (
      // It's expected that the ethers package is an external dependency
      // meaning its import technically is unresolved at rollup time
      warning.code === "UNRESOLVED_IMPORT" &&
      warning.message.includes("ethers")
    )
  ) {
    return;
  }

  console.warn(`(!) ${warning.message}`)
}

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
      commonjs({
        namedExports: {
          "../../node_modules/typescript-memoize/dist/memoize-decorator.js": [
            "Memoize"
          ]
        }
      }),
      json({ compact: true }),
      nodeResolve({
        only: [...bundledDependencies]
      }),
      typescript(),
    ],
    onwarn
  }
];
