import {
  FirebaseServiceFactory,
  Node,
  NodeMessage
} from "@counterfactual/node";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
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
export async function createNodeSingleton(
  privateKey?: string,
  networkContext?: NetworkContext
): Promise<Node> {
  return node || (await createNode(privateKey, networkContext));
}

export async function createNode(
  privateKey?: string,
  networkContext?: NetworkContext
): Promise<Node> {
  const store = serviceFactory.createStoreService(generateUUID());

  if (privateKey) {
    await store.set([{ key: "PRIVATE_KEY", value: privateKey }]);
  }

  let provider: BaseProvider;
  if (!process.env.ETHEREUM_NETWORK) {
    throw Error("No Ethereum network specified.");
  }

  if (process.env.ETHEREUM_NETWORK === "ganache") {
    provider = new JsonRpcProvider("http://localhost:8545");
  } else {
    provider = ethers.getDefaultProvider(process.env.ETHEREUM_NETWORK);
  }

  node = await Node.create(
    serviceFactory.createMessagingService("messaging"),
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    provider,
    process.env.ETHEREUM_NETWORK,
    networkContext
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
