import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/expected-build-artifacts/ChallengeRegistry.json";
import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/DolphinCoin.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import {
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  NetworkContext,
  OutcomeType
} from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import {
  defaultAbiCoder,
  Interface,
  keccak256,
  parseEther
} from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/constants";
import {
  ConditionalTransaction,
  SetStateCommitment,
  SetupCommitment
} from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";
import { FreeBalanceClass } from "../../../src/models/free-balance";
import { transferERC20Tokens } from "../../integration/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import {
  extendedPrvKeyToExtendedPubKey,
  getRandomExtendedPrvKeys
} from "./random-signing-keys";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// The ChallengeRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

// Also we can't estimate the install commitment gas b/c it uses
// delegatecall for the conditional transaction
const CONDITIONAL_TX_DELEGATECALL_GAS = 6e9;

let provider: JsonRpcProvider;
let wallet: Wallet;
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  jest.setTimeout(10000);
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
 * @description We re-use the FreeBalanceApp App (which is the app ETH Free Balance uses)
 * as the test app being installed. We then set the values to [1, 1] in that app
 * and trigger the InstallCommitment on-chain to resolve that app and verify
 * the balances have been updated on-chain.
 */
describe("Scenario: install AppInstance, set state, put on-chain", () => {
  it("returns the funds the app had locked up for both ETH and ERC20 in app and free balance", async done => {
    const xprvs = getRandomExtendedPrvKeys(2);

    const multisigOwnerKeys = xkeysToSortedKthSigningKeys(xprvs, 0);

    const xpubs = xprvs.map(extendedPrvKeyToExtendedPubKey);

    const erc20TokenAddress = (global[
      "networkContext"
    ] as NetworkContextForTestSuite).DolphinCoin;

    const proxyFactory = new Contract(
      network.ProxyFactory,
      ProxyFactory.abi,
      wallet
    );

    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      let stateChannel = StateChannel.setupChannel(
        network.IdentityApp,
        proxyAddress,
        xpubs,
        1
      ).setFreeBalance(
        FreeBalanceClass.createWithFundedTokenAmounts(
          multisigOwnerKeys.map(key => key.address),
          WeiPerEther,
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS, erc20TokenAddress]
        )
      );

      const uniqueAppSigningKeys = xkeysToSortedKthSigningKeys(
        xprvs,
        stateChannel.numProposedApps
      );

      // todo(xuanji): don't reuse state
      // todo(xuanji): use createAppInstance
      const identityAppInstance = new AppInstance(
        uniqueAppSigningKeys.map(x => x.address),
        stateChannel.freeBalance.defaultTimeout, // Re-use ETH FreeBalance timeout
        {
          addr: network.IdentityApp,
          stateEncoding: "tuple(address to, uint256 amount)[][]",
          actionEncoding: undefined
        },
        false,
        stateChannel.numProposedApps,
        [
          // ETH token index
          [
            { to: multisigOwnerKeys[0].address, amount: WeiPerEther },
            { to: multisigOwnerKeys[1].address, amount: Zero }
          ],
          // ERC20 token index
          [
            { to: multisigOwnerKeys[0].address, amount: Zero },
            { to: multisigOwnerKeys[1].address, amount: WeiPerEther }
          ]
        ],
        0,
        stateChannel.freeBalance.timeout, // Re-use ETH FreeBalance timeout
        OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER,
        undefined,
        {
          // total limit of ETH and ERC20 token that can be transferred
          limit: [WeiPerEther, WeiPerEther],
          // The only assets being transferred are ETH and the ERC20 token
          tokenAddresses: [CONVENTION_FOR_ETH_TOKEN_ADDRESS, erc20TokenAddress]
        } as MultiAssetMultiPartyCoinTransferInterpreterParams,
        undefined
      );

      stateChannel = stateChannel.installApp(identityAppInstance, {
        [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
          [multisigOwnerKeys[0].address]: WeiPerEther,
          [multisigOwnerKeys[1].address]: Zero
        },
        [erc20TokenAddress]: {
          [multisigOwnerKeys[0].address]: Zero,
          [multisigOwnerKeys[1].address]: WeiPerEther
        }
      });

      const setStateCommitment = new SetStateCommitment(
        network,
        identityAppInstance.identity,
        keccak256(identityAppInstance.encodedLatestState),
        identityAppInstance.versionNumber + 1,
        identityAppInstance.timeout
      );

      await wallet.sendTransaction({
        ...setStateCommitment.getSignedTransaction([
          uniqueAppSigningKeys[0].signDigest(setStateCommitment.hashToSign()),
          uniqueAppSigningKeys[1].signDigest(setStateCommitment.hashToSign())
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      const setStateCommitmentForFreeBalance = new SetStateCommitment(
        network,
        stateChannel.freeBalance.identity,
        stateChannel.freeBalance.hashOfLatestState,
        stateChannel.freeBalance.versionNumber,
        stateChannel.freeBalance.timeout
      );

      await wallet.sendTransaction({
        ...setStateCommitmentForFreeBalance.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(
            setStateCommitmentForFreeBalance.hashToSign()
          ),
          multisigOwnerKeys[1].signDigest(
            setStateCommitmentForFreeBalance.hashToSign()
          )
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      // tslint:disable-next-line:prefer-array-literal
      for (const _ of Array(identityAppInstance.timeout)) {
        await provider.send("evm_mine", []);
      }

      await appRegistry.functions.setOutcome(
        identityAppInstance.identity,
        identityAppInstance.encodedLatestState
      );

      await appRegistry.functions.setOutcome(
        stateChannel.freeBalance.identity,
        stateChannel.freeBalance.encodedLatestState
      );

      const conditionalTransaction = new ConditionalTransaction(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        identityAppInstance.identityHash,
        stateChannel.freeBalance.identityHash,
        network.MultiAssetMultiPartyCoinTransferInterpreter,
        defaultAbiCoder.encode(
          [multiAssetMultiPartyCoinTransferInterpreterParamsEncoding],
          [
            identityAppInstance.multiAssetMultiPartyCoinTransferInterpreterParams!
          ]
        )
      );

      const multisigDelegateCallTx = conditionalTransaction.getSignedTransaction(
        [
          multisigOwnerKeys[0].signDigest(conditionalTransaction.hashToSign()),
          multisigOwnerKeys[1].signDigest(conditionalTransaction.hashToSign())
        ]
      );

      await wallet.sendTransaction({
        to: proxyAddress,
        value: parseEther("2")
      });

      await transferERC20Tokens(
        proxyAddress,
        erc20TokenAddress,
        DolphinCoin.abi,
        parseEther("2")
      );

      await wallet.sendTransaction({
        ...multisigDelegateCallTx,
        gasLimit: CONDITIONAL_TX_DELEGATECALL_GAS
      });

      expect(await provider.getBalance(proxyAddress)).toBeEq(WeiPerEther);
      expect(await provider.getBalance(multisigOwnerKeys[0].address)).toBeEq(
        WeiPerEther
      );
      expect(await provider.getBalance(multisigOwnerKeys[1].address)).toBeEq(
        Zero
      );

      const erc20Contract = new Contract(
        erc20TokenAddress,
        DolphinCoin.abi,
        new JsonRpcProvider(global["ganacheURL"])
      );

      expect(await erc20Contract.functions.balanceOf(proxyAddress)).toBeEq(
        WeiPerEther
      );
      expect(
        await erc20Contract.functions.balanceOf(multisigOwnerKeys[0].address)
      ).toBeEq(Zero);
      expect(
        await erc20Contract.functions.balanceOf(multisigOwnerKeys[1].address)
      ).toBeEq(WeiPerEther);

      const freeBalanceConditionalTransaction = new SetupCommitment(
        network,
        stateChannel.multisigAddress,
        stateChannel.multisigOwners,
        stateChannel.freeBalance.identity
      );

      const multisigDelegateCallTx2 = freeBalanceConditionalTransaction.getSignedTransaction(
        [
          multisigOwnerKeys[0].signDigest(
            freeBalanceConditionalTransaction.hashToSign()
          ),
          multisigOwnerKeys[1].signDigest(
            freeBalanceConditionalTransaction.hashToSign()
          )
        ]
      );

      await wallet.sendTransaction({
        ...multisigDelegateCallTx2,
        gasLimit: CONDITIONAL_TX_DELEGATECALL_GAS
      });

      expect(await provider.getBalance(proxyAddress)).toBeEq(Zero);
      expect(await provider.getBalance(multisigOwnerKeys[0].address)).toBeEq(
        WeiPerEther
      );
      expect(await provider.getBalance(multisigOwnerKeys[1].address)).toBeEq(
        WeiPerEther
      );

      expect(await erc20Contract.functions.balanceOf(proxyAddress)).toBeEq(
        Zero
      );
      expect(
        await erc20Contract.functions.balanceOf(multisigOwnerKeys[0].address)
      ).toBeEq(WeiPerEther);
      expect(
        await erc20Contract.functions.balanceOf(multisigOwnerKeys[1].address)
      ).toBeEq(WeiPerEther);

      done();
    });

    await proxyFactory.functions.createProxyWithNonce(
      network.MinimumViableMultisig,
      new Interface(MinimumViableMultisig.abi).functions.setup.encode([
        multisigOwnerKeys.map(x => x.address)
      ]),
      0,
      { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
    );
  });
});
