import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { NetworkContext } from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import {
  defaultAbiCoder,
  Interface,
  keccak256,
  parseEther
} from "ethers/utils";

import { InstallCommitment, SetStateCommitment } from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getRandomHDNodes } from "./random-signing-keys";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// The ChallengeRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

// Also we can't estimate the install commitment gas b/c it uses
// delegatecall for the conditional transaction
const INSTALL_COMMITMENT_GAS = 6e9;

let provider: JsonRpcProvider;
let wallet: Wallet;
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  [provider, wallet, {}] = await connectToGanache();

  network = global["networkContext"];

  appRegistry = new Contract(
    network.ChallengeRegistry,
    ChallengeRegistry.abi,
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
      ).setFreeBalance({
        [multisigOwnerKeys[0].address]: WeiPerEther,
        [multisigOwnerKeys[1].address]: WeiPerEther
      });

      const uniqueAppSigningKeys = xkeysToSortedKthSigningKeys(
        xkeys.map(x => x.extendedKey),
        stateChannel.numInstalledApps
      );

      let freeBalanceETH = stateChannel.freeBalance;
      const state = freeBalanceETH.state;

      // todo(xuanji): don't reuse state
      // todo(xuanji): use createAppInstance
      const appInstance = new AppInstance(
        stateChannel.multisigAddress,
        uniqueAppSigningKeys.map(x => x.address),
        freeBalanceETH.defaultTimeout, // Re-use ETH FreeBalance timeout
        freeBalanceETH.appInterface, // Re-use the ETHBucket App
        false,
        stateChannel.numInstalledApps,
        stateChannel.rootNonceValue,
        state,
        0,
        freeBalanceETH.timeout, // Re-use ETH FreeBalance timeout
        undefined,
        {
          limit: Zero
        }
      );

      stateChannel = stateChannel.installApp(appInstance, {
        [multisigOwnerKeys[0].address]: WeiPerEther,
        [multisigOwnerKeys[1].address]: WeiPerEther
      });

      freeBalanceETH = stateChannel.freeBalance;

      const setStateCommitment = new SetStateCommitment(
        network,
        appInstance.identity,
        keccak256(appInstance.encodedLatestState),
        appInstance.versionNumber + 1,
        appInstance.timeout
      );

      await wallet.sendTransaction({
        ...setStateCommitment.transaction([
          uniqueAppSigningKeys[0].signDigest(setStateCommitment.hashToSign()),
          uniqueAppSigningKeys[1].signDigest(setStateCommitment.hashToSign())
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      // tslint:disable-next-line:prefer-array-literal
      for (const _ of Array(appInstance.timeout)) {
        await provider.send("evm_mine", []);
      }

      await appRegistry.functions.setOutcome(
        appInstance.identity,
        appInstance.encodedLatestState
      );

      const installCommitment = new InstallCommitment(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        appInstance.identity,
        freeBalanceETH.identity,
        freeBalanceETH.hashOfLatestState,
        freeBalanceETH.versionNumber,
        freeBalanceETH.timeout,
        appInstance.appSeqNo,
        stateChannel.rootNonceValue,
        network.ETHInterpreter,
        defaultAbiCoder.encode(
          ["uint256"],
          [freeBalanceETH.coinTransferInterpreterParams!.limit]
        )
      );

      const installTx = installCommitment.transaction([
        multisigOwnerKeys[0].signDigest(installCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(installCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({
        to: proxyAddress,
        value: parseEther("2")
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
