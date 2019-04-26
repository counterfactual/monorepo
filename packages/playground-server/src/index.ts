import { Node as NodeTypes } from "@counterfactual/types";
import { Meta, OperationResponse } from "@ebryn/jsonapi-ts";
import { Log, LogLevel } from "logepi";

import mountApi from "./api";
import { detectDBAndSchema } from "./db";
import { NodeWrapper, serviceFactoryPromise } from "./node";

const BANNED_MNEMONICS = new Set([
  "science amused table oyster text message core mirror patch bubble provide industry",
  "impulse exile artwork when toss canal entire electric protect custom adult erupt"
]);

Log.setOutputLevel((process.env.API_LOG_LEVEL as LogLevel) || LogLevel.INFO);

const API_TIMEOUT = 5 * 60 * 1000;

(async () => {
  const nodeMnemonic = process.env.NODE_MNEMONIC;
  if (!nodeMnemonic) {
    console.error(
      "\nError: No mnemonic specified in the NODE_MNEMONIC env var. Please set one.\n"
    );
    process.exit(1);
  }

  if (BANNED_MNEMONICS.has(nodeMnemonic!)) {
    console.error(
      "Old shared NODE_MNEMONIC found; exiting. See https://github.com/counterfactual/monorepo/pull/1064/files for more information."
    );
    process.exit(1);
  }

  await detectDBAndSchema();

  await NodeWrapper.createNodeSingleton(
    process.env.ETHEREUM_NETWORK || "kovan",
    process.env.NODE_MNEMONIC
  );

  const node = NodeWrapper.getInstance();

  node.on(
    NodeTypes.MethodName.CREATE_CHANNEL,
    ({ meta, operations }: { meta: Meta; operations: OperationResponse[] }) => {
      console.log(meta);
      console.log(operations);
    }
  );

  node.emit(NodeTypes.MethodName.CREATE_CHANNEL, {
    meta: {
      requestId: new Date().valueOf().toString()
    },
    operations: [
      {
        op: "add",
        ref: {
          type: "channel"
        },
        data: {
          type: "channel",
          attributes: {
            owners: [
              "xpub6BjsJbb2RFzCva36ZHFVF5qBtWLAxzfADBzzrrryj4PBYm2Je2inWKQXqyBenhf1vJU5owmuoqqgwyuekbtxrsaonQrZpiyXJXff9gYXJHU",
              "xpub6CXbcJ9zRBosLeKTmcKWyqynwV8xmXpEP4Dh3UGq4M6b32ykwp5gtpsLtBNwk7ptBEmKARfGXWrNQAaT66ARRZ3wLmaDPC5VjtKWhYKZk3A"
            ]
          },
          relationships: {}
        }
      }
    ]
  });
  console.log("Emitted createChannel");

  const api = mountApi();
  const port = process.env.PORT || 9000;

  const server = await api.listen(port);
  server.setTimeout(API_TIMEOUT);

  Log.info("API is now ready", { tags: { port } });
})();

process.on("SIGINT", async () => {
  console.log("Shutting down playground-server...");
  const serviceFactory = await serviceFactoryPromise;
  await serviceFactory.closeServiceConnections();
});

export * from "./types";
