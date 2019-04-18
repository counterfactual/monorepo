import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { WithdrawETHCommitment } from "../../../../src/machine/ethereum";
import { Transaction } from "../../../../src/machine/ethereum/types";

/**
 * This test suite decodes a constructed WithdrawETHCommitment transaction object
 * to the specifications defined here:
 * https://specs.counterfactual.com/11-withdraw-protocol
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
