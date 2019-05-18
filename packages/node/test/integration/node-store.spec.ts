import { AddressZero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import {
  IStoreService,
  Node,
  NodeConfig,
  WRITE_NULL_TO_FIREBASE
} from "../../src";
import { MNEMONIC_PATH } from "../../src/signer";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import mockMessagingService from "../services/mock-messaging-service";
import { A_MNEMONIC } from "../test-constants.jest";

describe("Node can use storage service", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let storeService: IStoreService;
  let node: Node;
  let nodeConfig: NodeConfig;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
    storeService.set([{ key: MNEMONIC_PATH, value: A_MNEMONIC }]);

    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_MULTISIG_PREFIX_KEY!
    };

    provider = new JsonRpcProvider(global["ganacheURL"]);

    node = await Node.create(
      mockMessagingService,
      storeService,
      nodeConfig,
      provider,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("can save and retrieve a key-value pair", async () => {
    const key = generateUUID();
    const value = generateUUID();
    await storeService.set([{ key, value }]);
    expect(await storeService.get(key)).toBe(value);
  });

  it("rejects null entries", async () => {
    const key = generateUUID();
    const value = {
      a: "a",
      b: "b",
      c: {
        x: "x",
        y: null
      }
    };
    expect(storeService.set([{ key, value }])).rejects.toEqual(
      new Error(WRITE_NULL_TO_FIREBASE)
    );
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
