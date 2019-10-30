import { OutcomeType } from "@counterfactual/types";
import { Two, Zero } from "ethers/constants";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../../src/constants";
import { toBeEq } from "../bignumber-jest-matcher";

import { Participant, TestRunner } from "./test-runner";

expect.extend({ toBeEq });

export enum TestFundingType {
  ETH = "ETH",
  ERC20 = "ERC20",
  SPLIT = "SPLIT"
}

async function runDirectInstallUninstallTest(
  outcomeType: OutcomeType,
  testFundingType: TestFundingType
) {
  const tr = new TestRunner();
  await tr.connectToGanache();

  await tr.setup();
  await tr.unsafeFund();

  if (testFundingType === TestFundingType.SPLIT) {
    await tr.installSplitDeposits(
      outcomeType,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      TestRunner.TEST_TOKEN_ADDRESS
    );
    tr.assertFB(Participant.A, CONVENTION_FOR_ETH_TOKEN_ADDRESS, Zero);
    tr.assertFB(Participant.B, TestRunner.TEST_TOKEN_ADDRESS, Zero);

    await tr.uninstall();
    tr.assertFB(Participant.A, CONVENTION_FOR_ETH_TOKEN_ADDRESS, Two);
    tr.assertFB(Participant.B, TestRunner.TEST_TOKEN_ADDRESS, Zero);
  } else {
    const tokenAddress = {
      [TestFundingType.ETH]: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      [TestFundingType.ERC20]: TestRunner.TEST_TOKEN_ADDRESS
    }[testFundingType];

    await tr.installEqualDeposits(outcomeType, tokenAddress);
    tr.assertFB(Participant.A, tokenAddress, Zero);
    tr.assertFB(Participant.B, tokenAddress, Zero);
    await tr.uninstall();
    tr.assertFB(Participant.A, tokenAddress, Two);
    tr.assertFB(Participant.B, tokenAddress, Zero);
  }
}

describe("Install-then-uninstall in a direct channel", () => {
  for (const outcomeType of [
    OutcomeType.TWO_PARTY_FIXED_OUTCOME,
    OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER,
    OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER
  ]) {
    for (const testFundingType of [
      TestFundingType.ETH,
      TestFundingType.ERC20,
      TestFundingType.SPLIT
    ]) {
      if (
        testFundingType === TestFundingType.SPLIT &&
        outcomeType !== OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER
      ) {
        continue;
      }

      it(`${outcomeType}/${testFundingType}`, async () => {
        await runDirectInstallUninstallTest(outcomeType, testFundingType);
      });
    }
  }
});

describe("Install-then-uninstall of a virtual app", () => {
  for (const outcomeType of [
    OutcomeType.TWO_PARTY_FIXED_OUTCOME,
    OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER
  ]) {
    for (const tokenAddress of [
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      TestRunner.TEST_TOKEN_ADDRESS
    ]) {
      it(`${outcomeType}/${tokenAddress}`, async () => {
        const tr = new TestRunner();
        await tr.connectToGanache();

        await tr.setup();
        await tr.unsafeFund();

        await tr.installVirtualEqualDeposits(outcomeType, tokenAddress);

        tr.assertFB(Participant.A, tokenAddress, Zero);
        tr.assertFB(Participant.C, tokenAddress, Zero);

        await tr.uninstallVirtual();

        tr.assertFB(Participant.A, tokenAddress, Two);
        tr.assertFB(Participant.C, tokenAddress, Zero);
      });
    }
  }
});
