import { AddressZero } from "ethers/constants";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { IStoreService, Node, NodeConfig } from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import mockMessagingService from "../services/mock-messaging-service";

import { TEST_NETWORK } from "./utils";

describe("Node can use storage service", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;
  let provider: BaseProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    storeService.set([{ key: MNEMONIC_PATH, value: process.env.A_MNEMONIC }]);

    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };

    provider = new JsonRpcProvider(global["ganacheURL"]);

    node = await Node.create(
      mockMessagingService,
      storeService,
      nodeConfig,
      provider,
      TEST_NETWORK,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
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
