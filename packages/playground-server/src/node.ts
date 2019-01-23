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
export async function createNodeSingleton(privateKey?: string): Promise<Node> {
  return node || (await createNode(privateKey));
}

export async function createNode(privateKey?: string): Promise<Node> {
  const store = serviceFactory.createStoreService(generateUUID());

  if (privateKey) {
    await store.set([{ key: "PRIVATE_KEY", value: privateKey }]);
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
      ETHVirtualAppAgreement: AddressZero
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
  return node.address;
}

export async function createMultisigFor(
  userAddress: string
): Promise<NodeTypes.CreateMultisigResult> {
  if (!node) {
    node = await createNodeSingleton();
  }

  const multisigResponse = await node.call(
    NodeTypes.MethodName.CREATE_MULTISIG,
    {
      params: {
        owners: [node.address, userAddress]
      },
      type: NodeTypes.MethodName.CREATE_MULTISIG,
      requestId: generateUUID()
    }
  );

  return multisigResponse.result as NodeTypes.CreateMultisigResult;
}
