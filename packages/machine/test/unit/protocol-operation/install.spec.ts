import { ethers } from "ethers";

import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import MultiSend from "@counterfactual/contracts/build/contracts/MultiSend.json";
import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import {
  AppIdentity,
  AppInterface,
  ETHBucketAppState,
  Terms
} from "@counterfactual/types";

import { OpInstall } from "../../../src/middleware/protocol-operation";
import { MultisigInput } from "../../../src/middleware/protocol-operation/types";
import { appIdentityToHash } from "../../../src/utils/app-identity";
import { APP_INTERFACE, TERMS } from "../../../src/utils/encodings";
import { decodeMultisendCalldata } from "../../../src/utils/multisend-decoder";

import {
  encodeFreeBalanceState,
  freeBalanceTerms,
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../../src/utils/free-balance";

const {
  keccak256,
  solidityPack,
  defaultAbiCoder,
  SigningKey,
  Interface,
  bigNumberify,
  hexlify,
  randomBytes,
  getAddress
} = ethers.utils;

import { AddressZero, WeiPerEther, HashZero, Zero } from "ethers/constants";

/**
 * This test suite decodes a constructed OpInstall transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/05-install-protocol#commitments
 */
describe("OpInstall", () => {
  let operation: OpInstall;
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
    ],
    appInstallationNonce: 1
  };

  // Test free balance values
  const freeBalance = {
    uniqueAppNonceWithinStateChannel: 0,

    currentLocalNonce: 10,

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

    updatedState: {
      alice: stateChannel.multisigOwners[0].address,
      bob: stateChannel.multisigOwners[1].address,
      aliceBalance: WeiPerEther.div(2),
      bobBalance: WeiPerEther.div(2)
    } as ETHBucketAppState
  };

  // Test app-values
  const newApp = {
    owner: stateChannel.multisigAddress,

    signingKeys: stateChannel.multisigOwners.map(x => x.address),

    interface: {
      addr: AddressZero,
      getTurnTaker: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      applyAction: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4))
    } as AppInterface,

    terms: {
      assetType: 0,
      limit: bigNumberify(10),
      token: AddressZero
    } as Terms,

    defaultTimeout: 100,

    appIdentity: {} as AppIdentity
  };

  newApp.appIdentity = {
    defaultTimeout: newApp.defaultTimeout,
    owner: newApp.owner,
    signingKeys: newApp.signingKeys,
    appInterfaceHash: keccak256(
      defaultAbiCoder.encode([APP_INTERFACE], [newApp.interface])
    ),
    termsHash: keccak256(defaultAbiCoder.encode([TERMS], [newApp.terms]))
  };

  beforeAll(() => {
    operation = new OpInstall(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners.map(x => x.address),
      newApp.appIdentity,
      newApp.terms,
      freeBalance.appIdentity,
      freeBalance.terms,
      keccak256(encodeFreeBalanceState(freeBalance.updatedState)),
      freeBalance.currentLocalNonce + 1,
      freeBalance.defaultTimeout,
      keccak256(
        solidityPack(["uint256"], [stateChannel.appInstallationNonce + 1])
      )
    );
    generatedTx = operation.multisigInput();
  });

  it("should be to MultiSend", () => {
    expect(generatedTx.to).toBe(networkContext.MultiSend);
  });

  it("should have no value", () => {
    expect(generatedTx.val).toBe(0);
  });

  describe("the calldata of the multisend transaction", () => {
    let transactions: [number, string, number, string][];

    beforeAll(() => {
      const { data } = generatedTx;
      const desc = new Interface(MultiSend.abi).parseTransaction({ data });
      transactions = decodeMultisendCalldata(desc.args[0]);
    });

    it("should contain two transactions", () => {
      expect(transactions.length).toBe(2);
    });

    describe("the transaction to update the free balance", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[0];
      });

      it("should be to the AppRegistry", () => {
        expect(to).toBe(networkContext.AppRegistry);
      });

      it("should be of value 0", () => {
        expect(val).toEqual(Zero);
      });

      it("should be a Call", () => {
        expect(op).toBe(0);
      });

      describe("the calldata", () => {
        let iface: ethers.utils.Interface;
        let calldata: ethers.utils.TransactionDescription;

        beforeAll(() => {
          iface = new Interface(AppRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setState method", () => {
          expect(calldata.name).toBe(iface.functions.setState.signature);
        });

        it("should build the expected AppIdentity argument", () => {
          const [
            [owner, signingKeys, appInterfaceHash, termsHash, defaultTimeout]
          ] = calldata.args;

          const expected = freeBalance.appIdentity;

          expect(owner).toBe(expected.owner);
          expect(signingKeys).toEqual(expected.signingKeys);
          expect(appInterfaceHash).toBe(expected.appInterfaceHash);
          expect(termsHash).toBe(expected.termsHash);
          expect(defaultTimeout).toEqual(bigNumberify(expected.defaultTimeout));
        });

        it("should build the expected SignedStateHashUpdate argument", () => {
          const [, [stateHash, nonce, timeout, signatures]] = calldata.args;

          // TODO: Should be based on the app being installed not hardcoded
          const expectedStateHash = keccak256(
            encodeFreeBalanceState(freeBalance.updatedState)
          );

          expect(stateHash).toBe(expectedStateHash);
          expect(nonce).toEqual(
            bigNumberify(freeBalance.currentLocalNonce + 1)
          );
          expect(timeout).toEqual(bigNumberify(freeBalance.defaultTimeout));
          expect(signatures).toBe(HashZero);
        });
      });
    });

    describe("the transaction to execute the conditional transaction", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[1];
      });

      it("should be to the StateChannelTransaction", () => {
        expect(to).toBe(networkContext.StateChannelTransaction);
      });

      it("should be of value 0", () => {
        expect(val).toEqual(Zero);
      });

      it("should be a DelegateCall", () => {
        expect(op).toBe(1);
      });

      describe("the calldata", () => {
        let iface: ethers.utils.Interface;
        let calldata: ethers.utils.TransactionDescription;

        beforeAll(() => {
          iface = new Interface(StateChannelTransaction.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the executeAppConditionalTransaction method", () => {
          expect(calldata.name).toBe(
            iface.functions.executeAppConditionalTransaction.signature
          );
        });

        it("should have correctly constructed arguments", () => {
          const [
            appRegistryAddress,
            nonceRegistryAddress,
            uninstallKey,
            appCfAddress,
            terms
          ] = calldata.args;

          // The unique "key" in the NonceRegistry is computed to be:
          // hash(<stateChannel.multisigAddress address>, <timeout = 0>, hash(<app nonce>))
          // where <app nonce> is 0 since FreeBalance is assumed to be the
          // firstmost intalled app in the channel.
          const expectedUninstallKey = keccak256(
            solidityPack(
              ["address", "uint256", "bytes32"],
              [
                stateChannel.multisigAddress,
                0,
                keccak256(
                  solidityPack(
                    ["uint256"],
                    // In this case, we expect the <app nonce> variable to be
                    // 1 since this newly installed app is the only app installed
                    // after the ETH FreeBalance was installed.
                    [stateChannel.appInstallationNonce + 1]
                  )
                )
              ]
            )
          );

          expect(appRegistryAddress).toBe(networkContext.AppRegistry);
          expect(nonceRegistryAddress).toBe(networkContext.NonceRegistry);
          expect(uninstallKey).toBe(expectedUninstallKey);
          expect(appCfAddress).toBe(appIdentityToHash(newApp.appIdentity));
          expect(terms[0]).toBe(newApp.terms.assetType);
          expect(terms[1]).toEqual(newApp.terms.limit);
          expect(terms[2]).toBe(newApp.terms.token);
        });
      });
    });
  });
});
