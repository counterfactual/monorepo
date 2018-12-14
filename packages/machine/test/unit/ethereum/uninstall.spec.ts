import { ethers } from "ethers";

import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import MultiSend from "@counterfactual/contracts/build/contracts/MultiSend.json";
import NonceRegistry from "@counterfactual/contracts/build/contracts/NonceRegistry.json";
import { AppIdentity, ETHBucketAppState } from "@counterfactual/types";

import { OpUninstall } from "../../../src/middleware/protocol-operation";
import { MultisigInput } from "../../../src/middleware/protocol-operation/types";
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
  SigningKey,
  Interface,
  bigNumberify,
  hexlify,
  randomBytes,
  getAddress,
  defaultAbiCoder
} = ethers.utils;

import { WeiPerEther, HashZero, Zero, One } from "ethers/constants";

/**
 * This test suite decodes a constructed OpUninstall transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/07-uninstall-protocol#commitments
 */
describe("OpUninstall", () => {
  let operation: OpUninstall;
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

  const oldApp = {
    uniqueAppCounter: 3
  };

  beforeAll(() => {
    operation = new OpUninstall(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners.map(x => x.address),
      freeBalance.appIdentity,
      freeBalance.terms,
      keccak256(encodeFreeBalanceState(freeBalance.updatedState)),
      freeBalance.currentLocalNonce + 1,
      freeBalance.defaultTimeout,
      keccak256(solidityPack(["uint256"], [oldApp.uniqueAppCounter]))
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

    describe("the transaction to update the dependency nonce", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[1];
      });

      it("should be to the NonceRegistry", () => {
        expect(to).toBe(networkContext.NonceRegistry);
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
          iface = new Interface(NonceRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setNonce method", () => {
          expect(calldata.name).toBe(iface.functions.setNonce.signature);
        });

        it("should build set the nonce to 1 (uninstalled)", () => {
          const [timeout, salt, nonceValue] = calldata.args;

          expect(timeout).toEqual(Zero);
          expect(salt).toEqual(
            keccak256(
              defaultAbiCoder.encode(["uint256"], [oldApp.uniqueAppCounter])
            )
          );
          expect(nonceValue).toEqual(One);
        });
      });
    });
  });
});
