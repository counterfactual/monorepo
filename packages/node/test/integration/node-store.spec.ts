import dotenv from "dotenv";
import { ethers } from "ethers";
import FirebaseServer from "firebase-server";

import { IStoreService, Node, NodeConfig } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";
import { MOCK_MESSAGING_SERVICE } from "../mock-services/mock-messaging-service";

import TestFirebaseServiceFactory from "./services/firebase-service";

dotenv.config();

describe("Node can use storage service", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;

  beforeAll(() => {
    const firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };
    node = new Node(
      A_PRIVATE_KEY,
      MOCK_MESSAGING_SERVICE,
      storeService,
      nodeConfig
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("can save multiple channels under respective multisig indeces and query for all channels", async () => {
    const channelA = { owners: [node.address, ethers.constants.AddressZero] };
    const channelB = {
      owners: [
        new ethers.Wallet(B_PRIVATE_KEY).address,
        ethers.constants.AddressZero
      ]
    };
    await storeService.set([{ key: "multisigAddress/0x111", value: channelA }]);
    await storeService.set([{ key: "multisigAddress/0x222", value: channelB }]);
    expect(await storeService.get("multisigAddress")).toEqual({
      "0x111": {
        ...channelA
      },
      "0x222": {
        ...channelB
      }
    });
  });

  it("can save multiple channels under respective multisig indeces in one call and query for all channels", async () => {
    const channelA = { owners: [node.address, ethers.constants.AddressZero] };
    const channelB = {
      owners: [
        new ethers.Wallet(B_PRIVATE_KEY).address,
        ethers.constants.AddressZero
      ]
    };
    await storeService.set([
      { key: "multisigAddress/0x111", value: channelA },
      { key: "multisigAddress/0x222", value: channelB }
    ]);
    expect(await storeService.get("multisigAddress")).toEqual({
      "0x111": {
        ...channelA
      },
      "0x222": {
        ...channelB
      }
    });
  });
});
