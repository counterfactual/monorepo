import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import NonceRegistry from "@counterfactual/contracts/build/NonceRegistry.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { Interface, keccak256 } from "ethers/utils";
import { BuildArtifact } from "truffle";

import { SetStateCommitment, SetupCommitment } from "../../src/ethereum";
import { StateChannel } from "../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getSortedRandomSigningKeys } from "./random-signing-keys";

// To be honest, 30000 is an arbitrary large number that has never failed
// to reach the done() call in the test case, not intelligently chosen
const JEST_TEST_WAIT_TIME = 30000;

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// Similarly, the SetupCommitment is a `delegatecall`, so we estimate
const SETUP_COMMITMENT_GAS = 6e9;

// The AppRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

let networkId: number;
let provider: JsonRpcProvider;
let wallet: Wallet;
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  [provider, wallet, networkId] = await connectToGanache();

  const relevantArtifacts: BuildArtifact[] = [
    { contractName: "AppRegistry", ...AppRegistry },
    { contractName: "ETHBucket", ...ETHBucket },
    { contractName: "NonceRegistry", ...NonceRegistry },
    { contractName: "StateChannelTransaction", ...StateChannelTransaction }
  ];

  network = {
    // Fetches the values from build artifacts of the contracts needed
    // for this test and sets the ones we don't care about to 0x0
    ETHBalanceRefund: AddressZero,
    ...relevantArtifacts.reduce(
      (accumulator: { [x: string]: string }, artifact: BuildArtifact) => ({
        ...accumulator,
        [artifact.contractName!]: artifact.networks![networkId].address
      }),
      {}
    )
  } as NetworkContext;

  appRegistry = new Contract(
    (AppRegistry as BuildArtifact).networks![networkId].address,
    AppRegistry.abi,
    wallet
  );
});

/**
 * @summary Setup a StateChannel then set state on ETH Free Balance
 */
describe("Scenario: Setup, set state on free balance, go on chain", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("should distribute funds in ETH free balance when put on chain", async done => {
    const signingKeys = getSortedRandomSigningKeys(2);

    const users = signingKeys.map(x => x.address);

    const proxyFactory = new Contract(
      (ProxyFactory as BuildArtifact).networks![networkId].address,
      ProxyFactory.abi,
      wallet
    );

    proxyFactory.on("ProxyCreation", async proxy => {
      let stateChannel = new StateChannel(proxy, users).setupChannel(network);
      let freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

      const state = {
        alice: stateChannel.multisigOwners[0],
        bob: stateChannel.multisigOwners[1],
        aliceBalance: WeiPerEther,
        bobBalance: WeiPerEther
      };

      stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
      freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

      const setStateCommitment = new SetStateCommitment(
        network,
        freeBalanceETH.identity,
        keccak256(freeBalanceETH.encodedLatestState),
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

      for (const _ of Array(freeBalanceETH.timeout)) {
        await provider.send("evm_mine", []);
      }

      await appRegistry.functions.setResolution(
        freeBalanceETH.identity,
        freeBalanceETH.encodedLatestState,
        freeBalanceETH.encodedTerms
      );

      const setupCommitment = new SetupCommitment(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        stateChannel.getFreeBalanceFor(AssetType.ETH).identity,
        stateChannel.getFreeBalanceFor(AssetType.ETH).terms
      );

      const setupTx = setupCommitment.transaction([
        signingKeys[0].signDigest(setupCommitment.hashToSign()),
        signingKeys[1].signDigest(setupCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({ to: proxy, value: WeiPerEther.mul(2) });

      await wallet.sendTransaction({
        ...setupTx,
        gasLimit: SETUP_COMMITMENT_GAS
      });

      expect(await provider.getBalance(proxy)).toBeEq(Zero);
      expect(await provider.getBalance(users[0])).toBeEq(WeiPerEther);
      expect(await provider.getBalance(users[1])).toBeEq(WeiPerEther);

      done();
    });

    await proxyFactory.functions.createProxy(
      (MinimumViableMultisig as BuildArtifact).networks![networkId].address,
      new Interface(MinimumViableMultisig.abi).functions.setup.encode([users]),
      { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
    );
  });
});
