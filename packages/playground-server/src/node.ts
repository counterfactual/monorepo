import {
  FirebaseServiceFactory,
  Node,
  NodeMessage
} from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { AddressZero } from "ethers/constants";
import { v4 as generateUUID } from "uuid";

const { INSTALL, REJECT_INSTALL } = NodeTypes.EventName;

const serviceFactory = new FirebaseServiceFactory({
  apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
  authDomain: "foobar-91a31.firebaseapp.com",
  databaseURL: "https://foobar-91a31.firebaseio.com",
  projectId: "foobar-91a31",
  storageBucket: "foobar-91a31.appspot.com",
  messagingSenderId: "432199632441"
});

let node: Node;
export async function createNodeSingleton(mnemonic?: string): Promise<Node> {
  return node || (await createNode(mnemonic));
}

export async function createNode(mnemonic?: string): Promise<Node> {
  const store = serviceFactory.createStoreService(generateUUID());

  if (mnemonic) {
    await store.set([{ key: "MNEMONIC", value: mnemonic }]);
  }

  node = await Node.create(
    serviceFactory.createMessagingService("messaging"),
    store,
    {
      AppRegistry: AddressZero,
      ETHBalanceRefund: AddressZero,
      ETHBucket: AddressZero,
      MultiSend: AddressZero,
      NonceRegistry: AddressZero,
      StateChannelTransaction: AddressZero,
      ETHVirtualAppAgreement: AddressZero,
      MinimumViableMultisig: AddressZero,
      ProxyFactory: AddressZero
    },
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider(process.env.ETHEREUM_NETWORK || "ropsten")
  );

  node.on(INSTALL, async (msg: NodeMessage) => {
    console.log("INSTALL event:", msg);
  });

  node.on(REJECT_INSTALL, async (msg: NodeMessage) => {
    console.log("REJECT_INSTALL event:", msg);
  });

  return node;
}

export function getNodeAddress(): string {
  return node.publicIdentifier;
}

export async function createStateChannelFor(
  userAddress: string
): Promise<NodeTypes.CreateChannelResult> {
  if (!node) {
    node = await createNodeSingleton();
  }

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

  return multisigResponse.result as NodeTypes.CreateChannelResult;
}
