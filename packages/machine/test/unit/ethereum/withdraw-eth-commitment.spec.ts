import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { WithdrawETHCommitment } from "../../../src/ethereum";
import { Transaction } from "../../../src/ethereum/types";

/**
 * This test suite decodes a constructed SetState Commitment transaction object
 * to the specifications defined by Counterfactual as can be found here:
 * TODO: Write specs
 */
describe("Withdraw ETH Commitment", () => {
  let commitment: WithdrawETHCommitment;
  let tx: Transaction;

  const multisigAddress = getAddress(hexlify(randomBytes(20)));
  const multisigOwners = [
    getAddress(hexlify(randomBytes(20))),
    getAddress(hexlify(randomBytes(20)))
  ];
  const to = getAddress(hexlify(randomBytes(20)));
  const value = bigNumberify(Math.round(10000 * Math.random()));

  beforeAll(() => {
    commitment = new WithdrawETHCommitment(
      multisigAddress,
      multisigOwners,
      to,
      value
    );
    tx = commitment.getTransactionDetails();
  });

  it("should be to the receiver", () => {
    expect(tx.to).toBe(to);
  });

  it("should have the value being sent", () => {
    expect(tx.value).toEqual(value);
  });
});
