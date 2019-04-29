import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { Interface, keccak256, parseEther } from "ethers/utils";

import { InstallCommitment, SetStateCommitment } from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { makeNetworkContext } from "./make-network-context";
import { getRandomHDNodes } from "./random-signing-keys";

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

  network = makeNetworkContext(networkId);

  appRegistry = new Contract(network.AppRegistry, AppRegistry.abi, wallet);
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
    const xkeys = getRandomHDNodes(2);

    const multisigOwnerKeys = xkeysToSortedKthSigningKeys(
      xkeys.map(x => x.extendedKey),
      0
    );

    const proxyFactory = new Contract(
      network.ProxyFactory,
      ProxyFactory.abi,
      wallet
    );

    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      let stateChannel = StateChannel.setupChannel(
        network.ETHBucket,
        proxyAddress,
        xkeys.map(x => x.neuter().extendedKey),
        1
      ).setFreeBalance(AssetType.ETH, {
        [multisigOwnerKeys[0].address]: WeiPerEther,
        [multisigOwnerKeys[1].address]: WeiPerEther
      });

      const uniqueAppSigningKeys = xkeysToSortedKthSigningKeys(
        xkeys.map(x => x.extendedKey),
        stateChannel.numInstalledApps
      );

      let freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);
      const state = freeBalanceETH.state;

      // todo(xuanji): don't reuse state
      const appInstance = new AppInstance(
        stateChannel.multisigAddress,
        uniqueAppSigningKeys.map(x => x.address),
        freeBalanceETH.defaultTimeout, // Re-use ETH FreeBalance timeout
        freeBalanceETH.appInterface, // Re-use the ETHBucket App
        {
          assetType: AssetType.ETH,
          limit: parseEther("2"),
          token: AddressZero
        },
        false,
        stateChannel.numInstalledApps,
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
          uniqueAppSigningKeys[0].signDigest(setStateCommitment.hashToSign()),
          uniqueAppSigningKeys[1].signDigest(setStateCommitment.hashToSign())
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
        multisigOwnerKeys[0].signDigest(installCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(installCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({
        to: proxyAddress,
        value: WeiPerEther.mul(2)
      });

      await wallet.sendTransaction({
        ...installTx,
        gasLimit: INSTALL_COMMITMENT_GAS
      });

      expect(await provider.getBalance(proxyAddress)).toBeEq(Zero);
      expect(await provider.getBalance(multisigOwnerKeys[0].address)).toBeEq(
        WeiPerEther
      );
      expect(await provider.getBalance(multisigOwnerKeys[1].address)).toBeEq(
        WeiPerEther
      );

      done();
    });

    await proxyFactory.functions.createProxy(
      network.MinimumViableMultisig,
      new Interface(MinimumViableMultisig.abi).functions.setup.encode([
        multisigOwnerKeys.map(x => x.address)
      ]),
      { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
    );
  });
});
