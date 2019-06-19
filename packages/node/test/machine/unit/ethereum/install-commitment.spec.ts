import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AddressZero, HashZero, WeiPerEther, Zero } from "ethers/constants";
import {
  bigNumberify,
  getAddress,
  hexlify,
  Interface,
  randomBytes,
  TransactionDescription
} from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { InstallCommitment } from "../../../../src/ethereum";
import { MultisigTransaction } from "../../../../src/ethereum/types";
import { appIdentityToHash } from "../../../../src/ethereum/utils/app-identity";
import { decodeMultisendCalldata } from "../../../../src/ethereum/utils/multisend-decoder";
import { StateChannel } from "../../../../src/models";
import { createAppInstance } from "../../../unit/utils";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed OpInstall transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/05-install-protocol#commitments
 */
describe("InstallCommitment", () => {
  let tx: MultisigTransaction;

  // Test network context
  const networkContext = generateRandomNetworkContext();

  // General interaction testing values
  const interaction = {
    sender: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
    receiver: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
  };

  // State channel testing values
  let stateChannel = StateChannel.setupChannel(
    networkContext.ETHBucket,
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver]
  );

  // Set the state to some test values
  stateChannel = stateChannel.incrementETHFreeBalance({
    [stateChannel.multisigOwners[0]]: WeiPerEther,
    [stateChannel.multisigOwners[1]]: WeiPerEther
  });

  const freeBalanceETH = stateChannel.freeBalance;

  const appInstance = createAppInstance(stateChannel);

  beforeAll(() => {
    tx = new InstallCommitment(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      appInstance.identity,
      freeBalanceETH.identity,
      freeBalanceETH.hashOfLatestState,
      freeBalanceETH.nonce,
      freeBalanceETH.timeout,
      appInstance.appSeqNo,
      stateChannel.rootNonceValue,
      AddressZero,
      HashZero
    ).getTransactionDetails();
  });

  it("should be to the MultiSend contract", () => {
    expect(tx.to).toBe(networkContext.MultiSend);
  });

  it("should have no value", () => {
    expect(tx.value).toBe(0);
  });

  describe("the calldata of the multisend transaction", () => {
    let transactions: [number, string, number, string][];

    beforeAll(() => {
      const { data } = tx;
      const desc = new Interface(MultiSend.abi).parseTransaction({ data });
      transactions = decodeMultisendCalldata(desc.args[0]);
    });

    it("should contain two transactions", () => {
      expect(transactions.length).toBe(2);
    });

    describe("the transaction to set the free balance state", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[0];
      });

      it("should be to the ChallengeRegistry", () => {
        expect(to).toBe(networkContext.ChallengeRegistry);
      });

      it("should be of value 0", () => {
        expect(val).toEqual(Zero);
      });

      it("should be a Call", () => {
        expect(op).toBe(0);
      });

      describe("the calldata", () => {
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(ChallengeRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setState method", () => {
          expect(calldata.sighash).toBe(iface.functions.setState.sighash);
        });

        it("should build the expected AppIdentity argument", () => {
          const [
            [owner, signingKeys, appDefinition, defaultTimeout]
          ] = calldata.args;
          const expected = freeBalanceETH.identity;
          expect(owner).toBe(expected.owner);
          expect(signingKeys).toEqual(expected.signingKeys);
          expect(appDefinition).toBe(expected.appDefinition);
          expect(defaultTimeout).toEqual(bigNumberify(expected.defaultTimeout));
        });

        it("should build the expected SignedStateHashUpdate argument", () => {
          const [, [stateHash, nonce, timeout, signatures]] = calldata.args;
          expect(stateHash).toBe(freeBalanceETH.hashOfLatestState);
          expect(nonce).toEqual(bigNumberify(freeBalanceETH.nonce));
          expect(timeout).toEqual(bigNumberify(freeBalanceETH.timeout));
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
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(StateChannelTransaction.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the executeEffectOfInterpretedAppOutcome method", () => {
          expect(calldata.sighash).toBe(
            iface.functions.executeEffectOfInterpretedAppOutcome.sighash
          );
        });

        it("should have correctly constructed arguments", () => {
          const [
            appRegistryAddress,
            rootNonceRegistry,
            uninstallKeyRegistry,
            uninstallKey,
            rootNonceValue,
            appIdentityHash,
            {},
            {}
          ] = calldata.args;
          expect(appRegistryAddress).toBe(networkContext.ChallengeRegistry);
          expect(rootNonceRegistry).toEqual(networkContext.RootNonceRegistry);
          expect(uninstallKeyRegistry).toEqual(
            networkContext.UninstallKeyRegistry
          );
          expect(uninstallKey).toBe(appInstance.uninstallKey);
          expect(appIdentityHash).toBe(appIdentityToHash(appInstance.identity));
          expect(rootNonceValue).toEqual(
            bigNumberify(appInstance.rootNonceValue)
          );
        });
      });
    });
  });
});
