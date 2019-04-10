import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
import NonceRegistry from "@counterfactual/contracts/build/NonceRegistry.json";
import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { HashZero, One, WeiPerEther, Zero } from "ethers/constants";
import {
  bigNumberify,
  defaultAbiCoder,
  getAddress,
  hexlify,
  Interface,
  keccak256,
  randomBytes,
  TransactionDescription
} from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { UninstallCommitment } from "../../../../src/machine/ethereum";
import { MultisigTransaction } from "../../../../src/machine/ethereum/types";
import { decodeMultisendCalldata } from "../../../../src/machine/ethereum/utils/multisend-decoder";
import { StateChannel } from "../../../../src/machine/models";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed Uninstall Commitment transaction object
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/07-uninstall-protocol#commitments
 */
describe("Uninstall Commitment", () => {
  let tx: MultisigTransaction;

  // Dummy network context
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
  stateChannel = stateChannel.setState(
    stateChannel.getFreeBalanceFor(AssetType.ETH).identityHash,
    {
      alice: stateChannel.multisigOwners[0],
      bob: stateChannel.multisigOwners[1],
      aliceBalance: WeiPerEther,
      bobBalance: WeiPerEther
    }
  );

  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const appBeingUninstalledSeqNo = Math.ceil(1000 * Math.random());

  beforeAll(() => {
    tx = new UninstallCommitment(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      freeBalanceETH.identity,
      freeBalanceETH.terms,
      freeBalanceETH.state as ETHBucketAppState,
      freeBalanceETH.nonce,
      freeBalanceETH.timeout,
      appBeingUninstalledSeqNo
    ).getTransactionDetails();
  });

  it("should be to MultiSend", () => {
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
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(AppRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setState method", () => {
          expect(calldata.sighash).toEqual(iface.functions.setState.sighash);
        });

        it("should build the expected AppIdentity argument", () => {
          const [
            [
              owner,
              signingKeys,
              appDefinitionAddress,
              termsHash,
              defaultTimeout
            ]
          ] = calldata.args;

          const expected = freeBalanceETH.identity;

          expect(owner).toBe(expected.owner);
          expect(signingKeys).toEqual(expected.signingKeys);
          expect(appDefinitionAddress).toBe(expected.appDefinitionAddress);
          expect(termsHash).toBe(expected.termsHash);
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
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(NonceRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setNonce method", () => {
          expect(calldata.sighash).toEqual(iface.functions.setNonce.sighash);
        });

        it("should build set the nonce to 1 (uninstalled)", () => {
          const [timeout, salt, nonceValue] = calldata.args;

          expect(timeout).toEqual(Zero);
          expect(salt).toEqual(
            keccak256(
              defaultAbiCoder.encode(["uint256"], [appBeingUninstalledSeqNo])
            )
          );
          expect(nonceValue).toEqual(One);
        });
      });
    });
  });
});
