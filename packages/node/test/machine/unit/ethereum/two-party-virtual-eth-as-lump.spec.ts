import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
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

import { TwoPartyVirtualEthAsLumpCommitment } from "../../../../src/ethereum/two-party-virtual-eth-as-lump-commitment";
import { Transaction } from "../../../../src/ethereum/types";
import { decodeMultisendCalldata } from "../../../../src/ethereum/utils/multisend-decoder";
import { StateChannel } from "../../../../src/models";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed ETH Virtual App Agreement Commitment
 * transaction object as defined at
 * https://specs.counterfactual.com/09-install-virtual-app-protocol
 */
describe("ETH Virtual App Agreement Commitment", () => {
  let commitment: TwoPartyVirtualEthAsLumpCommitment;
  let tx: Transaction;

  const networkContext = generateRandomNetworkContext();

  const interaction = {
    sender: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
    receiver: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
  };

  const beneficiaries = [
    getAddress(hexlify(randomBytes(20))),
    getAddress(hexlify(randomBytes(20)))
  ];

  let stateChannel = StateChannel.setupChannel(
    networkContext.ETHBucket,
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver]
  );

  stateChannel = stateChannel.incrementFreeBalance(
    {
      [stateChannel.multisigOwners[0]]: WeiPerEther,
      [stateChannel.multisigOwners[1]]: WeiPerEther
    },
    AddressZero
  );

  const freeBalanceETH = stateChannel.freeBalance;

  const uninstallKey = hexlify(randomBytes(32));
  const target = hexlify(randomBytes(32));

  const multisigAddress = getAddress(hexlify(randomBytes(20)));

  beforeAll(() => {
    commitment = new TwoPartyVirtualEthAsLumpCommitment(
      networkContext,
      multisigAddress,
      stateChannel.multisigOwners,
      target,
      freeBalanceETH.identity,
      freeBalanceETH.hashOfLatestState,
      freeBalanceETH.versionNumber,
      freeBalanceETH.timeout,
      stateChannel.numInstalledApps + 1,
      bigNumberify(5_000_000),
      bigNumberify(100),
      beneficiaries,
      uninstallKey
    );
    tx = commitment.getTransactionDetails();
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
          const [
            ,
            [stateHash, versionNumber, timeout, signatures]
          ] = calldata.args;
          expect(stateHash).toBe(freeBalanceETH.hashOfLatestState);
          expect(versionNumber).toEqual(
            bigNumberify(freeBalanceETH.versionNumber)
          );
          expect(timeout).toEqual(bigNumberify(freeBalanceETH.timeout));
          expect(signatures).toBe(HashZero);
        });
      });
    });
  });
});
