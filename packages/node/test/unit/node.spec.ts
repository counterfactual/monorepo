import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { fromMnemonic } from "ethers/utils/hdnode";

import { Node } from "../../src/node";
import { TestPrivateKeyGenerator } from "../integration/private-key-generator";
import { MemoryStoreService } from "../services/memory-store-service";
import mockMessagingService from "../services/mock-messaging-service";

describe("Node", () => {
  it("is defined", () => {
    expect(Node).toBeDefined();
  });

  it("can be created", async () => {
    const node = await Node.create(
      mockMessagingService,
      new MemoryStoreService(),
      { STORE_KEY_PREFIX: "./node.spec.ts-test-file" },
      new JsonRpcProvider(global["ganacheURL"]),
      global["networkContext"],
      fromMnemonic(Wallet.createRandom().mnemonic).neuter().extendedKey,
      new TestPrivateKeyGenerator().generatePrivateKey
    );

    expect(node).toBeDefined();
  });
});
