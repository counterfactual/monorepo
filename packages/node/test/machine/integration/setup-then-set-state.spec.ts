import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import {
  coinTransferInterpreterParamsStateEncoding,
  NetworkContext
} from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { defaultAbiCoder, Interface, keccak256 } from "ethers/utils";

import { SetStateCommitment, SetupCommitment } from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine";
import { StateChannel } from "../../../src/models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/models/free-balance";
import { createFreeBalanceStateWithFundedTokenAmounts } from "../../integration/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getRandomHDNodes } from "./random-signing-keys";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// Similarly, the SetupCommitment is a `delegatecall`, so we estimate
const SETUP_COMMITMENT_GAS = 6e9;

// The ChallengeRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

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
 * @summary Setup a StateChannel then set state on ETH Free Balance
 */
describe("Scenario: Setup, set state on free balance, go on chain", () => {
  it("should distribute funds in ETH free balance when put on chain", async done => {
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

    proxyFactory.once("ProxyCreation", async proxy => {
      const stateChannel = StateChannel.setupChannel(
        network.FreeBalanceApp,
        proxy,
        xkeys.map(x => x.neuter().extendedKey),
        1
      ).setFreeBalance(
        createFreeBalanceStateWithFundedTokenAmounts(
          multisigOwnerKeys.map<string>(key => key.address),
          WeiPerEther,
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS]
        )
      );

      const freeBalance = stateChannel.freeBalance;

      const setStateCommitment = new SetStateCommitment(
        network,
        freeBalance.identity,
        keccak256(freeBalance.encodedLatestState),
        freeBalance.versionNumber,
        freeBalance.timeout
      );

      const setStateTx = setStateCommitment.getSignedTransaction([
        multisigOwnerKeys[0].signDigest(setStateCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(setStateCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({
        ...setStateTx,
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      // tslint:disable-next-line:prefer-array-literal
      for (const _ of Array(freeBalance.timeout)) {
        await provider.send("evm_mine", []);
      }

      await appRegistry.functions.setOutcome(
        freeBalance.identity,
        freeBalance.encodedLatestState
      );

      const setupCommitment = new SetupCommitment(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        stateChannel.freeBalance.identity,
        defaultAbiCoder.encode(
          [coinTransferInterpreterParamsStateEncoding],
          [stateChannel.freeBalance.coinTransferInterpreterParams]
        )
      );

      const setupTx = setupCommitment.getSignedTransaction([
        multisigOwnerKeys[0].signDigest(setupCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(setupCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({ to: proxy, value: WeiPerEther.mul(2) });

      await wallet.sendTransaction({
        ...setupTx,
        gasLimit: SETUP_COMMITMENT_GAS
      });

      expect(await provider.getBalance(proxy)).toBeEq(Zero);

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
