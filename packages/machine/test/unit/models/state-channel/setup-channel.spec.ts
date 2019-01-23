import { generateRandomNetworkContext } from "@counterfactual/machine/test/mocks";
import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { AppInstance, StateChannel } from "../../../../src/models";

describe("StateChannel::setupChannel", () => {
  const multisigAddress = getAddress(hexlify(randomBytes(20)));
  const multisigOwners = [
    getAddress(hexlify(randomBytes(20))),
    getAddress(hexlify(randomBytes(20)))
  ];

  let sc: StateChannel;

  const networkContext = generateRandomNetworkContext();

  beforeAll(() => {
    sc = StateChannel.setupChannel(
      networkContext.ETHBucket,
      multisigAddress,
      multisigOwners
    );
  });

  it("should not alter any of the base properties", () => {
    expect(sc.multisigAddress).toBe(multisigAddress);
    expect(sc.multisigOwners).toBe(multisigOwners);
  });

  it("should have bumped the sequence number", () => {
    expect(sc.numInstalledApps).toBe(1);
  });

  describe("the installed ETH Free Balance", () => {
    let fb: AppInstance;

    beforeAll(() => {
      fb = sc.getFreeBalanceFor(AssetType.ETH);
    });

    it("should exist", () => {
      expect(fb).not.toBe(undefined);
    });

    it("should be owned by the multisig", () => {
      expect(fb.multisigAddress).toBe(multisigAddress);
    });

    it("should not be a virtual app", () => {
      expect(fb.isVirtualApp).toBe(false);
    });

    it("should have nonce 0 to start", () => {
      expect(fb.nonce).toBe(0);
    });

    it("should have a default timeout defined by the hard-coded assumption", () => {
      // See HARD_CODED_ASSUMPTIONS in state-channel.ts
      expect(fb.timeout).toBe(10);
    });

    it("should use the default timeout for the initial timeout", () => {
      expect(fb.timeout).toBe(fb.defaultTimeout);
    });

    it("should use the multisig owners as the signing keys", () => {
      expect(fb.signingKeys).toEqual(sc.multisigOwners);
    });

    it("should use the ETHBucketApp as the app target", () => {
      expect(fb.appInterface.addr).toBe(networkContext.ETHBucket);
      expect(fb.appInterface.actionEncoding).toBe(undefined);
    });

    it("should have seqNo of 0 (b/c it is the first ever app)", () => {
      expect(fb.appSeqNo).toBe(0);
    });

    it("should set the signingKeys as the multisigOwners", () => {
      const { alice, bob } = fb.state as ETHBucketAppState;
      expect(alice).toBe(sc.multisigOwners[0]);
      expect(bob).toBe(sc.multisigOwners[1]);
    });

    it("should have 0 balances for Alice and Bob", () => {
      const { aliceBalance, bobBalance } = fb.state as ETHBucketAppState;
      expect(aliceBalance).toEqual(Zero);
      expect(bobBalance).toEqual(Zero);
    });
  });
});
