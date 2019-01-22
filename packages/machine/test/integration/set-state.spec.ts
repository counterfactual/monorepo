import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { WaffleLegacyOutput } from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther } from "ethers/constants";

import { SetStateCommitment } from "../../src/ethereum";
import { StateChannel } from "../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getSortedRandomSigningKeys } from "./random-signing-keys";

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

  const relevantArtifacts = [
    { contractName: "AppRegistry", ...AppRegistry },
    { contractName: "ETHBucket", ...ETHBucket },
    { contractName: "StateChannelTransaction", ...StateChannelTransaction }
  ];

  network = {
    // Fetches the values from build artifacts of the contracts needed
    // for this test and sets the ones we don't care about to 0x0
    ETHBalanceRefund: AddressZero,
    ...relevantArtifacts.reduce(
      (accumulator: { [x: string]: string }, artifact: WaffleLegacyOutput) => ({
        ...accumulator,
        [artifact.contractName as string]: artifact.networks![networkId].address
      }),
      {}
    )
  } as NetworkContext;

  appRegistry = new Contract(
    (AppRegistry as WaffleLegacyOutput).networks![networkId].address,
    AppRegistry.abi,
    wallet
  );
});

/**
 * @summary Setup a StateChannel then set state on ETH Free Balance
 */
describe("Test", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("test", async done => {
    const signingKeys = getSortedRandomSigningKeys(2);

    const users = signingKeys.map(x => x.address);

    const stateChannel = StateChannel.setupChannel(
      network.ETHBucket,
      AddressZero,
      users
    ).setFreeBalance(AssetType.ETH, {
      [users[0]]: WeiPerEther,
      [users[1]]: WeiPerEther
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
      signingKeys[0].signDigest(setStateCommitment.hashToSign()),
      signingKeys[1].signDigest(setStateCommitment.hashToSign())
    ]);

    await wallet.sendTransaction({
      ...setStateTx,
      gasLimit: SETSTATE_COMMITMENT_GAS
    });

    const contractAppState = await appRegistry.appStates(
      freeBalanceETH.identityHash
    );

    expect(contractAppState.nonce).toBeEq(setStateCommitment.appLocalNonce);

    done();
  });
});
