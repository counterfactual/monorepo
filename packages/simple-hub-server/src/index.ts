// if (process.env.CI) {
//   const segfault = require("segfault-handler");
//   segfault.registerHandler("/tmp/hub-segfault.log");
// }

import { EthereumNetworkName, getNetworkEnum } from "@counterfactual/node";
import { Log, LogLevel } from "logepi";

import mountApi from "./api";
import { detectDBAndSchema } from "./db";
import { NodeWrapper, serviceFactoryPromise } from "./node";

const NO_EXTENDED_PRIVATE_KEY_MESSAGE =
  'Error: No extended private key specified in the NODE_EXTENDED_PRIVATE_KEY env var.\n\
Please set one by following the instructions in the README, \
section "Funding the Hub Account for Playground Testing".\n';

Log.setOutputLevel((process.env.API_LOG_LEVEL as LogLevel) || LogLevel.INFO);

const API_TIMEOUT = 5 * 60 * 1000;

(async () => {
  const nodeExtendedPrivateKey = process.env.NODE_EXTENDED_PRIVATE_KEY;
  if (!nodeExtendedPrivateKey) {
    console.error(NO_EXTENDED_PRIVATE_KEY_MESSAGE);
    process.exit(1);
  }

  await detectDBAndSchema();

  await NodeWrapper.createNodeSingleton(
    process.env.ETHEREUM_NETWORK
      ? getNetworkEnum(process.env.ETHEREUM_NETWORK)
      : EthereumNetworkName.Kovan,
    process.env.NODE_EXTENDED_PRIVATE_KEY
  );

  const api = mountApi();
  const port = process.env.PORT || 9000;

  const server = await api.listen(port);
  server.setTimeout(API_TIMEOUT);

  Log.info("API is now ready", {
    tags: {
      port,
      pid: process.pid,
      xpub: NodeWrapper.getInstance().publicIdentifier
    }
  });
})();

process.on("SIGINT", async () => {
  console.log("Shutting down simple-hub-server...");
  const serviceFactory = await serviceFactoryPromise;
  await serviceFactory.closeServiceConnections();
  process.exit(0);
});

export * from "./types";
