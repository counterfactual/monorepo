import { AddressZero } from "ethers/constants";
import { Provider } from "ethers/providers";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import FirebaseServer from "firebase-server";
import { instance, mock } from "ts-mockito";

import { IStoreService, Node, NodeConfig } from "../../src";
import mockMessagingService from "../services/mock-messaging-service";

import TestFirebaseServiceFactory from "./services/firebase-service";
import { EMPTY_NETWORK } from "./utils";

describe("Node can use storage service", () => {
  let firebaseServer: FirebaseServer;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;
  let mockProvider: Provider;
  let provider;

  beforeAll(async () => {
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
    mockProvider = mock(Provider);
    provider = instance(mockProvider);

    node = await Node.create(
      mockMessagingService,
      storeService,
      EMPTY_NETWORK,
      nodeConfig,
      provider
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("can save multiple channels under respective multisig indeces and query for all channels", async () => {
    const channelA = { owners: [node.publicIdentifier, AddressZero] };
    const channelB = {
      owners: [getAddress(hexlify(randomBytes(20))), AddressZero]
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
    const channelA = { owners: [node.publicIdentifier, AddressZero] };
    const channelB = {
      owners: [getAddress(hexlify(randomBytes(20))), AddressZero]
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
