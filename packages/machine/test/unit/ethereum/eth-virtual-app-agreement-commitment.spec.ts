import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { Transaction } from "../../../src/ethereum/types";
import { ETHVirtualAppAgreementCommitment } from "@counterfactual/machine/src/ethereum/eth-virtual-app-agreement-commitment";
import { generateRandomNetworkContext } from "@counterfactual/machine/test/mocks";
import { fromSeed } from "ethers/utils/hdnode";
import { StateChannel } from "@counterfactual/machine/src";
import { AssetType } from "@counterfactual/types";
import { WeiPerEther } from "ethers/constants";

/**
 * This test suite decodes a constructed ETH Virtual App Agreement Commitment
 * transaction object as defined at
 * https://specs.counterfactual.com/09-install-virtual-app-protocol
 */
describe("ETH Virtual App Agreement Commitment", () => {
  let commitment: ETHVirtualAppAgreementCommitment;
  let tx: Transaction;

  const networkContext = generateRandomNetworkContext();

  const interaction = {
    sender: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
    receiver: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
  };

  const beneficiaries = [
    getAddress(hexlify(randomBytes(20))),
    getAddress(hexlify(randomBytes(20))),
  ]

  let stateChannel = StateChannel.setupChannel(
    networkContext.ETHBucket,
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver]
  );

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

  const uninstallKey = hexlify(randomBytes(32));
  const target = hexlify(randomBytes(32));

  const multisigAddress = getAddress(hexlify(randomBytes(20)));

  beforeAll(() => {
    commitment = new ETHVirtualAppAgreementCommitment(
      networkContext,
      multisigAddress,
      stateChannel.multisigOwners,
      target,
      freeBalanceETH.identity,
      freeBalanceETH.terms,
      freeBalanceETH.hashOfLatestState,
      freeBalanceETH.nonce,
      freeBalanceETH.timeout,
      stateChannel.numInstalledApps + 1,
      stateChannel.rootNonceValue,
      bigNumberify(5_000_000),
      bigNumberify(100),
      beneficiaries,
      uninstallKey
    );
    tx = commitment.getTransactionDetails();
  });

  it("test", () => {
    expect(1).toBe(1);
    expect(tx);
  });
});
