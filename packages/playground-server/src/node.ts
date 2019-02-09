import {
  FirebaseServiceFactory,
  IMessagingService,
  IStoreService,
  Node
} from "@counterfactual/node";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { BaseProvider } from "ethers/providers";
import { computeAddress } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import { v4 as generateUUID } from "uuid";

const serviceFactory = new FirebaseServiceFactory({
  apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
  authDomain: "foobar-91a31.firebaseapp.com",
  databaseURL: "https://foobar-91a31.firebaseio.com",
  projectId: "foobar-91a31",
  storageBucket: "foobar-91a31.appspot.com",
  messagingSenderId: "432199632441"
});

export default class NodeWrapper {
  private static node: Node;

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
    network: string,
    networkContext?: NetworkContext,
    provider?: BaseProvider,
    mnemonic?: string,
    storeService?: IStoreService,
    messagingService?: IMessagingService
  ): Promise<Node> {
    if (NodeWrapper.node) {
      return NodeWrapper.node;
    }

    NodeWrapper.node = await NodeWrapper.createNode(
      network,
      networkContext,
      provider,
      mnemonic,
      storeService,
      messagingService
    );

    return NodeWrapper.node;
  }

  public static async createNode(
    network: string,
    networkContext?: NetworkContext,
    provider?: BaseProvider,
    mnemonic?: string,
    storeService?: IStoreService,
    messagingService?: IMessagingService
  ): Promise<Node> {
    const store =
      storeService || serviceFactory.createStoreService(generateUUID());

    const messaging =
      messagingService || serviceFactory.createMessagingService("messaging");

    if (mnemonic) {
      await store.set([{ key: "MNEMONIC", value: mnemonic }]);
    }

    console.log("creating node");
    console.log("balance: ");
    const address = computeAddress(
      fromMnemonic(mnemonic!).derivePath("m/44'/60'/0'/25446").publicKey
    );
    console.log(await provider!.getBalance(address));

    const node = await Node.create(
      messaging,
      store,
      {
        STORE_KEY_PREFIX: "store"
      },
      provider || ethers.getDefaultProvider(network),
      network,
      networkContext
    );

    return node;
  }

  public static async createStateChannelFor(
    userAddress: string
  ): Promise<NodeTypes.CreateChannelResult> {
    console.log("creating channel");
    if (!NodeWrapper.node) {
      throw new Error(
        "Node hasn't been instantiated yet. Call NodeWrapper.createNode() first."
      );
    }

    const { node } = NodeWrapper;
    console.log("using existing node: ", node.publicIdentifier);

    const multisigResponse = await node.call(
      NodeTypes.MethodName.CREATE_CHANNEL,
      {
        params: {
          owners: [node.publicIdentifier, userAddress]
        } as NodeTypes.CreateChannelParams,
        type: NodeTypes.MethodName.CREATE_CHANNEL,
        requestId: generateUUID()
      }
    );

    console.log("here");

    return multisigResponse.result as NodeTypes.CreateChannelResult;
  }
}
