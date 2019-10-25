import {
  confirmFirebaseConfigurationEnvVars,
  confirmLocalFirebaseConfigurationEnvVars,
  devAndTestingEnvironments,
  FIREBASE_CONFIGURATION_ENV_KEYS,
  FirebaseServiceFactory
} from "@counterfactual/firebase-client";
import {
  CreateChannelMessage,
  DepositConfirmationMessage,
  EthereumNetworkName,
  EXTENDED_PRIVATE_KEY_PATH,
  Node
} from "@counterfactual/node";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { formatEther } from "ethers/utils";
import FirebaseServer from "firebase-server";
import { Log } from "logepi";
import { jsonRpcDeserialize } from "rpc-server";
import { v4 as generateUUID } from "uuid";

import {
  bindMultisigToUser,
  getPlaygroundSnapshot,
  getUsernameFromMultisigAddress,
  storePlaygroundSnapshot
} from "./db";
import informSlack from "./utils";

interface IClosableFirebaseServiceFactory extends FirebaseServiceFactory {
  closeServiceConnections(): Promise<void>;
}

export class LocalFirebaseServiceFactory extends FirebaseServiceFactory
  implements IClosableFirebaseServiceFactory {
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

class StandardFirebaseServiceFactory extends FirebaseServiceFactory
  implements IClosableFirebaseServiceFactory {
  constructor(params: any) {
    super(params);
  }
  async closeServiceConnections() {}
}

class LocalPersistentFirebaseServiceFactory extends FirebaseServiceFactory
  implements IClosableFirebaseServiceFactory {
  firebaseServer: FirebaseServer;
  constructor(
    private readonly host: string,
    private readonly port: string,
    snapshot: any
  ) {
    super({
      databaseURL: `ws://${host}:${port}`,
      projectId: "projectId",
      apiKey: "",
      authDomain: "",
      storageBucket: "",
      messagingSenderId: ""
    });

    this.firebaseServer = new FirebaseServer(this.port, this.host, snapshot);
  }

  static async create(host: string, port: string) {
    const snapshot = await getPlaygroundSnapshot();

    return new LocalPersistentFirebaseServiceFactory(host, port, snapshot);
  }

  async closeServiceConnections() {
    const snapshot = await this.firebaseServer.getValue();

    await storePlaygroundSnapshot(snapshot);
    await this.firebaseServer.close();
  }
}

export let serviceFactoryPromise: Promise<IClosableFirebaseServiceFactory>;

console.log(`Using Firebase configuration for ${process.env.NODE_ENV}`);
if (!devAndTestingEnvironments.has(process.env.NODE_ENV!)) {
  confirmFirebaseConfigurationEnvVars();
  serviceFactoryPromise = Promise.resolve(
    new StandardFirebaseServiceFactory({
      apiKey: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.apiKey]!,
      authDomain: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.authDomain]!,
      databaseURL: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.databaseURL]!,
      projectId: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.projectId]!,
      storageBucket: process.env[
        FIREBASE_CONFIGURATION_ENV_KEYS.storageBucket
      ]!,
      messagingSenderId: process.env[
        FIREBASE_CONFIGURATION_ENV_KEYS.messagingSenderId
      ]!
    })
  );
} else {
  confirmLocalFirebaseConfigurationEnvVars();
  if (process.env.PLAYGROUND_PERSISTENCE_ENABLED) {
    console.log("Playground persistance is enabled");
    serviceFactoryPromise = LocalPersistentFirebaseServiceFactory.create(
      process.env.FIREBASE_SERVER_HOST!,
      process.env.FIREBASE_SERVER_PORT!
    );
  } else {
    serviceFactoryPromise = Promise.resolve(
      new LocalFirebaseServiceFactory(
        process.env.FIREBASE_SERVER_HOST!,
        process.env.FIREBASE_SERVER_PORT!
      )
    );
  }
}

export class NodeWrapper {
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
    networkOrNetworkContext: EthereumNetworkName | NetworkContext,
    extendedPrvKey?: string,
    provider?: JsonRpcProvider,
    storeService?: NodeTypes.IStoreService,
    messagingService?: NodeTypes.IMessagingService
  ): Promise<Node> {
    if (NodeWrapper.node) {
      return NodeWrapper.node;
    }

    const serviceFactory = await serviceFactoryPromise;

    if (!devAndTestingEnvironments.has(process.env.NODE_ENV!)) {
      await serviceFactory.auth(
        process.env[FIREBASE_CONFIGURATION_ENV_KEYS.authEmail]!,
        process.env[FIREBASE_CONFIGURATION_ENV_KEYS.authPassword]!
      );
    }

    const store =
      storeService ||
      serviceFactory.createStoreService(
        `${process.env.STORE_PREFIX}-pg-server-store`
      );

    NodeWrapper.node = await NodeWrapper.createNode(
      networkOrNetworkContext,
      provider,
      extendedPrvKey,
      store,
      messagingService
    );

    NodeWrapper.node.on(NodeTypes.EventName.DEPOSIT_CONFIRMED, response =>
      onDepositConfirmed(response)
    );

    NodeWrapper.node.on(NodeTypes.EventName.CREATE_CHANNEL, response =>
      onMultisigDeployed(response)
    );

    Log.info("Node singleton instance ready", {
      tags: { ethAddress: NodeWrapper.node["signer"]["address"] }
    });

    return NodeWrapper.node;
  }

  public static async createNode(
    networkOrNetworkContext: EthereumNetworkName | NetworkContext,
    provider?: JsonRpcProvider,
    extendedPrvKey?: string,
    storeService?: NodeTypes.IStoreService,
    messagingService?: NodeTypes.IMessagingService
  ): Promise<Node> {
    const serviceFactoryResolved = await serviceFactoryPromise;

    const store =
      storeService || serviceFactoryResolved.createStoreService(generateUUID());

    const messaging =
      messagingService ||
      serviceFactoryResolved.createMessagingService("messaging");

    if (extendedPrvKey) {
      await store.set([
        { path: EXTENDED_PRIVATE_KEY_PATH, value: extendedPrvKey }
      ]);
    }

    if (!provider && typeof networkOrNetworkContext !== "string") {
      throw new Error("cannot pass empty provider without network");
    }

    const node = await Node.create(
      messaging,
      store,
      networkOrNetworkContext,
      {
        STORE_KEY_PREFIX: "store"
      },
      provider ||
        new JsonRpcProvider(
          `https://${networkOrNetworkContext}.infura.io/11f02c6889494cb8b8f1919a5c536098`
        )
    );

    return node;
  }

  public static async createStateChannelFor(
    nodeAddress: string
  ): Promise<NodeTypes.DeployStateDepositHolderResult> {
    if (!NodeWrapper.node) {
      throw new Error(
        "Node hasn't been instantiated yet. Call NodeWrapper.createNode() first."
      );
    }

    const { node } = NodeWrapper;

    let { result } = await node.rpcRouter.dispatch(
      jsonRpcDeserialize({
        id: Date.now(),
        method: NodeTypes.RpcMethodName.CREATE_CHANNEL,
        params: {
          owners: [node.publicIdentifier, nodeAddress]
        },
        jsonrpc: "2.0"
      })
    );

    result = await node.rpcRouter.dispatch(
      jsonRpcDeserialize({
        id: Date.now(),
        method: NodeTypes.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER,
        params: {
          multisigAddress: result.multisigAddress
        },
        jsonrpc: "2.0"
      })
    );

    return result as NodeTypes.DeployStateDepositHolderResult;
  }
}

export async function onDepositConfirmed(response: DepositConfirmationMessage) {
  if (!response || !response.data) {
    return;
  }

  const username = await getUsernameFromMultisigAddress(
    response.data.multisigAddress
  );

  informSlack(
    `💰 *USER_DEPOSITED* (_${username}_) | User deposited ${formatEther(
      response.data.amount
    )} ETH <http://kovan.etherscan.io/address/${
      response.data.multisigAddress
    }|_(view on etherscan)_>.`
  );

  try {
    await NodeWrapper.getInstance().rpcRouter.dispatch(
      jsonRpcDeserialize({
        id: Date.now(),
        method: "chan_deposit",
        params: response.data,
        jsonrpc: "2.0"
      })
    );
  } catch (e) {
    Log.error("Failed to deposit on the server", {
      tags: { error: e }
    });
  }

  informSlack(
    `💰 *HUB_DEPOSITED* (_${username}_) | Hub deposited ${formatEther(
      response.data.amount
    )} ETH <http://kovan.etherscan.io/address/${
      response.data.multisigAddress
    }|_(view on etherscan)_>.`
  );
}

export async function onMultisigDeployed(result: CreateChannelMessage) {
  await bindMultisigToUser(
    result.data.counterpartyXpub, // FIXME: Not standard data flow
    result.data.multisigAddress
  );
}
