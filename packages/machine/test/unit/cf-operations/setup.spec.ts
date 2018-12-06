import { ethers } from "ethers";

import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AppIdentity, ETHBucketAppState } from "@counterfactual/types";

import { OpSetup } from "../../../src/middleware/protocol-operation";
import { MultisigInput } from "../../../src/middleware/protocol-operation/types";
import { appIdentityToHash } from "../../../src/utils";

import {
  freeBalanceTerms,
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../../src/free-balance-helpers";

const {
  keccak256,
  SigningKey,
  getAddress,
  hexlify,
  solidityPack,
  randomBytes,
  Interface
} = ethers.utils;

const { Zero } = ethers.constants;

/**
 * This test suite decodes a constructed OpSetup transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/04-setup-protocol#commitments
 *
 * TODO: This test suite _only_ covers the conditional transaction from the specs
 *       above. This is because the root nonce setNonce transaction has not been
 *       implemented in OpSetuptup yet.
 */
describe("OpSetup", () => {
  let operation: OpSetup;
  let generatedTx: MultisigInput;

  // Test network context
  const networkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  // Test state channel values
  const stateChannel = {
    multisigAddress: getAddress(hexlify(randomBytes(20))),
    multisigOwners: [
      new SigningKey(hexlify(randomBytes(32))),
      new SigningKey(hexlify(randomBytes(32)))
    ]
  };

  // Test free balance values
  const freeBalance = {
    defaultTimeout: 100,

    appIdentity: {
      owner: stateChannel.multisigAddress,
      signingKeys: stateChannel.multisigOwners.map(x => x.address),
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    } as AppIdentity,

    terms: freeBalanceTerms,

    initialState: {
      alice: stateChannel.multisigOwners[0].address,
      bob: stateChannel.multisigOwners[1].address,
      aliceBalance: Zero,
      bobBalance: Zero
    } as ETHBucketAppState
  };

  beforeAll(() => {
    operation = new OpSetup(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners.map(x => x.address),
      freeBalance.appIdentity,
      freeBalance.terms
    );
    generatedTx = operation.multisigInput();
  });

  it("should be to StateChannelTransaction", () => {
    expect(generatedTx.to).toBe(networkContext.StateChannelTransaction);
  });

  it("should have no value", () => {
    expect(generatedTx.val).toBe(0);
  });

  describe("the calldata", () => {
    const iface = new Interface(StateChannelTransaction.abi);
    let desc: ethers.utils.TransactionDescription;

    beforeAll(() => {
      const { data } = generatedTx;
      desc = iface.parseTransaction({ data });
    });

    it("should be to the executeAppConditionalTransaction method", () => {
      expect(desc.name).toBe(
        iface.functions.executeAppConditionalTransaction.signature
      );
    });

    it("should contain expected arguments", () => {
      const [
        appRegistry,
        nonceRegistry,
        uninstallKey,
        appCfAddress,
        [assetType, limit, token]
      ] = desc.args;

      const expectedUninstallKey = keccak256(
        solidityPack(
          ["address", "uint256", "bytes32"],
          [
            stateChannel.multisigAddress,
            0,
            keccak256(solidityPack(["uint256"], [0]))
          ]
        )
      );

      expect(appRegistry).toBe(networkContext.AppRegistry);
      expect(nonceRegistry).toEqual(networkContext.NonceRegistry);
      expect(uninstallKey).toBe(expectedUninstallKey);
      expect(appCfAddress).toBe(appIdentityToHash(freeBalance.appIdentity));
      expect(assetType).toBe(freeBalance.terms.assetType);
      expect(limit).toEqual(freeBalance.terms.limit);
      expect(token).toBe(freeBalance.terms.token);
    });
  });
});
