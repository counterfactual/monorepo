import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther } from "ethers/constants";

import { SetStateCommitment } from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine";
import { StateChannel } from "../../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { makeNetworkContext } from "./make-network-context";
import { getRandomHDNodes } from "./random-signing-keys";

// To be honest, 30000 is an arbitrary large number that has never failed
// to reach the done() call in the test case, not intelligently chosen
const JEST_TEST_WAIT_TIME = 30000;

// The AppRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

let networkId: number;
let wallet: Wallet;
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  [{}, wallet, networkId] = await connectToGanache();

  network = makeNetworkContext(networkId);

  appRegistry = new Contract(network.AppRegistry, AppRegistry.abi, wallet);
});

/**
 * @summary Setup a StateChannel then set state on ETH Free Balance
 */
describe("set state on free balance", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("should have the correct nonce", async done => {
    const xkeys = getRandomHDNodes(2);

    const multisigOwnerKeys = xkeysToSortedKthSigningKeys(
      xkeys.map(x => x.extendedKey),
      0
    );

    const stateChannel = StateChannel.setupChannel(
      network.ETHBucket,
      AddressZero,
      xkeys.map(x => x.neuter().extendedKey)
    ).setFreeBalance(AssetType.ETH, {
      [multisigOwnerKeys[0].address]: WeiPerEther,
      [multisigOwnerKeys[1].address]: WeiPerEther
    });

    const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

    const setStateCommitment = new SetStateCommitment(
      network,
      freeBalanceETH.identity,
      freeBalanceETH.hashOfLatestState,
      freeBalanceETH.nonce,
      freeBalanceETH.timeout
    );

    const setStateTx = setStateCommitment.transaction([
      multisigOwnerKeys[0].signDigest(setStateCommitment.hashToSign()),
      multisigOwnerKeys[1].signDigest(setStateCommitment.hashToSign())
    ]);

    await wallet.sendTransaction({
      ...setStateTx,
      gasLimit: SETSTATE_COMMITMENT_GAS
    });

    const contractAppState = await appRegistry.appChallenges(
      freeBalanceETH.identityHash
    );

    expect(contractAppState.nonce).toBeEq(setStateCommitment.appLocalNonce);

    done();
  });
});
