import {
  DepositConfirmationMessage,
  FirebaseServiceFactory,
  IMessagingService,
  IStoreService,
  MNEMONIC_PATH,
  Node
} from "@counterfactual/node";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import FirebaseServer from "firebase-server";
import { Log } from "logepi";
import { v4 as generateUUID } from "uuid";

import { bindMultisigToUser } from "./db";

const firebaseConfigurationKeys = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  databaseURL: "FIREBASE_DATABASE_URL",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID"
};

export class LocalFirebaseServiceFactory extends FirebaseServiceFactory {
  firebaseServer: FirebaseServer;
  constructor(private readonly host: string, private readonly port: string) {
    super({
      databaseURL: `ws://${host}:${port}`,
      projectId: "projectId",
      apiKey: "",
      authDomain: "",
      storageBucket: "",
      messagingSenderId: ""
    });

    this.firebaseServer = new FirebaseServer(this.port, this.host);
  }

  async closeServiceConnections() {
    await this.firebaseServer.close();
  }
}

const devAndTestingEnvironments = new Set(["development", "test"]);

export let serviceFactory: FirebaseServiceFactory;

console.log(`Using Firebase configuration for ${process.env.NODE_ENV}`);
if (!devAndTestingEnvironments.has(process.env.NODE_ENV!)) {
  confirmFirebaseConfigurationEnvVars();
  serviceFactory = new FirebaseServiceFactory({
    apiKey: process.env[firebaseConfigurationKeys.apiKey]!,
    authDomain: process.env[firebaseConfigurationKeys.authDomain]!,
    databaseURL: process.env[firebaseConfigurationKeys.databaseURL]!,
    projectId: process.env[firebaseConfigurationKeys.projectId]!,
    storageBucket: process.env[firebaseConfigurationKeys.storageBucket]!,
    messagingSenderId: process.env[firebaseConfigurationKeys.messagingSenderId]!
  });
} else {
  confirmLocalFirebaseConfigurationEnvVars();
  serviceFactory = new LocalFirebaseServiceFactory(
    process.env.FIREBASE_SERVER_HOST!,
    process.env.FIREBASE_SERVER_PORT!
  );
}

export default class NodeWrapper {
  private static node: Node;
  public static depositRetryCount = 0;

  public static depositsMade: Map<string, boolean>;
  public static getInstance() {
    if (!NodeWrapper.node) {
      throw new Error(
        "Node hasn't been instantiated yet. Call NodeWrapper.createNode() first."
      );
    }

    return NodeWrapper.node;
  }

  public static getNodeAddress() {
    if (!NodeWrapper.node) {
      throw new Error(
        "Node hasn't been instantiated yet. Call NodeWrapper.createNode() first."
      );
    }

    return NodeWrapper.node.publicIdentifier;
  }

  public static async createNodeSingleton(
    networkOrNetworkContext: string | NetworkContext,
    mnemonic?: string,
    provider?: JsonRpcProvider,
    storeService?: IStoreService,
    messagingService?: IMessagingService
  ): Promise<Node> {
    if (NodeWrapper.node) {
      return NodeWrapper.node;
    }

    const store =
      storeService ||
      serviceFactory.createStoreService(
        `${process.env.STORE_PREFIX}-pg-server-store`
      );

    NodeWrapper.node = await NodeWrapper.createNode(
      networkOrNetworkContext,
      provider,
      mnemonic,
      store,
      messagingService
    );

    NodeWrapper.node.on(
      NodeTypes.EventName.DEPOSIT_CONFIRMED,
      onDepositConfirmed.bind(this)
    );

    NodeWrapper.node.on(
      NodeTypes.EventName.CREATE_CHANNEL,
      onMultisigDeployed.bind(this)
    );

    Log.info("Node singleton instance ready", {
      tags: { ethAddress: NodeWrapper.node["signer"]["address"] }
    });

    return NodeWrapper.node;
  }

  public static async createNode(
    networkOrNetworkContext: string | NetworkContext,
    provider?: JsonRpcProvider,
    mnemonic?: string,
    storeService?: IStoreService,
    messagingService?: IMessagingService
  ): Promise<Node> {
    const store =
      storeService || serviceFactory.createStoreService(generateUUID());

    const messaging =
      messagingService || serviceFactory.createMessagingService("messaging");

    if (mnemonic) {
      await store.set([{ key: MNEMONIC_PATH, value: mnemonic }]);
    }

    if (!provider && typeof networkOrNetworkContext !== "string") {
      throw Error("cannot pass empty provider without network");
    }

    const node = await Node.create(
      messaging,
      store,
      {
        STORE_KEY_PREFIX: "store"
      },
      provider ||
        new JsonRpcProvider(
          `https://${networkOrNetworkContext}.infura.io/metamask`
        ),
      networkOrNetworkContext
    );

    return node;
  }

  public static async createStateChannelFor(
    nodeAddress: string
  ): Promise<NodeTypes.CreateChannelTransactionResult> {
    if (!NodeWrapper.node) {
      throw new Error(
        "Node hasn't been instantiated yet. Call NodeWrapper.createNode() first."
      );
    }

    const { node } = NodeWrapper;

    const multisigResponse = await node.call(
      NodeTypes.MethodName.CREATE_CHANNEL,
      {
        params: {
          owners: [node.publicIdentifier, nodeAddress]
        } as NodeTypes.CreateChannelParams,
        type: NodeTypes.MethodName.CREATE_CHANNEL,
        requestId: generateUUID()
      }
    );

    return multisigResponse.result as NodeTypes.CreateChannelTransactionResult;
  }
}

export async function onDepositConfirmed(response: DepositConfirmationMessage) {
  if (response === undefined) {
    return;
  }

  try {
    await NodeWrapper.getInstance().call(NodeTypes.MethodName.DEPOSIT, {
      requestId: generateUUID(),
      type: NodeTypes.MethodName.DEPOSIT,
      params: response.data as NodeTypes.DepositParams
    });
  } catch (e) {
    Log.error("Failed to deposit on the server", {
      tags: { reason: e.message, stackTrace: e.stack }
    });
  }
}

export async function onMultisigDeployed(
  result: NodeTypes.CreateChannelResult
) {
  await bindMultisigToUser(
    result.counterpartyXpub, // FIXME: Not standard data flow
    result.multisigAddress
  );
}

function confirmFirebaseConfigurationEnvVars() {
  for (const key of Object.keys(firebaseConfigurationKeys)) {
    if (!process.env[firebaseConfigurationKeys[key]]) {
      throw Error(
        `Firebase ${key} is not set via env var FIREBASE_${
          firebaseConfigurationKeys[key]
        }`
      );
    }
  }
}

function confirmLocalFirebaseConfigurationEnvVars() {
  if (!process.env.FIREBASE_SERVER_HOST || !process.env.FIREBASE_SERVER_PORT) {
    throw Error(
      "Firebase server hostname and port number must be set via FIREBASE_SERVER_HOST and FIREBASE_SERVER_PORT env vars"
    );
  }
}
