import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import ETHBucket from "@counterfactual/contracts/build/ETHBucket.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import MultiSend from "@counterfactual/contracts/build/MultiSend.json";
import NonceRegistry from "@counterfactual/contracts/build/NonceRegistry.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { Interface, keccak256, parseEther } from "ethers/utils";
import { BuildArtifact } from "truffle";

import { InstallCommitment, SetStateCommitment } from "../../src/ethereum";
import { AppInstance, StateChannel } from "../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getSortedRandomSigningKeys } from "./random-signing-keys";

// To be honest, 30000 is an arbitrary large number that has never failed
// to reach the done() call in the test case, not intelligently chosen
const JEST_TEST_WAIT_TIME = 30000;

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// The AppRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

// Also we can't estimate the install commitment gas b/c it uses
// delegatecall for the conditional transaction
const INSTALL_COMMITMENT_GAS = 6e9;

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
    { contractName: "MultiSend", ...MultiSend },
    { contractName: "NonceRegistry", ...NonceRegistry },
    { contractName: "StateChannelTransaction", ...StateChannelTransaction }
  ];

  network = {
    // Fetches the values from build artifacts of the contracts needed
    // for this test and sets the ones we don't care about to 0x0
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
 * @summary Set up a StateChannel and then install a new AppInstance into it.
 *
 * @description We re-use the ETHBucket App (which is the app ETH Free Balance uses)
 * as the test app being installed. We then set the values to [1, 1] in that app
 * and trigger the InstallCommitment on-chain to resolve that app and verify
 * the balances have been updated on-chain.
 */
describe("Scenario: install AppInstance, set state, put on-chain", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("returns the funds the app had locked up", async done => {
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

      const appInstance = new AppInstance(
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        freeBalanceETH.defaultTimeout, // Re-use ETH FreeBalance timeout
        freeBalanceETH.appInterface, // Re-use the ETHBucket App
        {
          assetType: AssetType.ETH,
          limit: parseEther("2"),
          token: AddressZero
        },
        false,
        stateChannel.numInstalledApps + 1,
        stateChannel.rootNonceValue,
        state,
        0,
        freeBalanceETH.timeout // Re-use ETH FreeBalance timeout
      );

      stateChannel = stateChannel.installApp(
        appInstance,
        WeiPerEther,
        WeiPerEther
      );
      freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

      const setStateCommitment = new SetStateCommitment(
        network,
        appInstance.identity,
        keccak256(appInstance.encodedLatestState),
        appInstance.nonce + 1,
        appInstance.timeout
      );

      await wallet.sendTransaction({
        ...setStateCommitment.transaction([
          signingKeys[0].signDigest(setStateCommitment.hashToSign()),
          signingKeys[1].signDigest(setStateCommitment.hashToSign())
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      for (const _ of Array(appInstance.timeout)) {
        await provider.send("evm_mine", []);
      }

      await appRegistry.functions.setResolution(
        appInstance.identity,
        appInstance.encodedLatestState,
        appInstance.encodedTerms
      );

      const installCommitment = new InstallCommitment(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        appInstance.identity,
        appInstance.terms,
        freeBalanceETH.identity,
        freeBalanceETH.terms,
        freeBalanceETH.hashOfLatestState,
        freeBalanceETH.nonce,
        freeBalanceETH.timeout,
        appInstance.appSeqNo,
        stateChannel.rootNonceValue
      );

      const installTx = installCommitment.transaction([
        signingKeys[0].signDigest(installCommitment.hashToSign()),
        signingKeys[1].signDigest(installCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({ to: proxy, value: WeiPerEther.mul(2) });

      await wallet.sendTransaction({
        ...installTx,
        gasLimit: INSTALL_COMMITMENT_GAS
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
