import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import ResolveToPay5WeiApp from "@counterfactual/contracts/build/ResolveToPay5WeiApp.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber, Interface, parseEther } from "ethers/utils";

import { SetStateCommitment } from "../../../src/ethereum";
import { ETHVirtualAppAgreementCommitment } from "../../../src/ethereum/eth-virtual-app-agreement-commitment";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { makeNetworkContext } from "./make-network-context";
import { getRandomHDNodes } from "./random-signing-keys";

const JEST_TEST_WAIT_TIME = 10000;

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

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

  network = makeNetworkContext(networkId);

  appRegistry = new Contract(network.AppRegistry, AppRegistry.abi, wallet);
});

describe("Scenario: install virtual AppInstance, put on-chain", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("returns the funds the app had locked up", async done => {
    const xkeys = getRandomHDNodes(2);

    const multisigOwnerKeys = xkeysToSortedKthSigningKeys(
      xkeys.map(x => x.extendedKey),
      0
    );

    const resolveToPay5WeiAppDefinition = await new ContractFactory(
      ResolveToPay5WeiApp.abi,
      ResolveToPay5WeiApp.bytecode,
      wallet
    ).deploy();

    const proxyFactory = new Contract(
      network.ProxyFactory,
      ProxyFactory.abi,
      wallet
    );

    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      const stateChannel = StateChannel.setupChannel(
        network.ETHBucket,
        proxyAddress,
        xkeys.map(x => x.neuter().extendedKey)
      ).setFreeBalance(AssetType.ETH, {
        [multisigOwnerKeys[0].address]: parseEther("20"),
        [multisigOwnerKeys[1].address]: parseEther("20")
      });

      const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

      // target app instance
      const targetAppInstance = new AppInstance(
        stateChannel.multisigAddress, // ok
        // TODO: will not be ok when passed to installApp; need k-th signing keys
        stateChannel.multisigOwners, // ok
        0, // default timeout
        {
          // appInterface
          addr: resolveToPay5WeiAppDefinition.address,
          stateEncoding: "",
          actionEncoding: undefined
        },
        {
          // target app instances do not have a useful terms
          assetType: AssetType.ETH,
          limit: new BigNumber(0),
          token: AddressZero
        },
        true, // virtual
        0, // app sequence number
        0, // root nonce
        {}, // latest state
        1, // latest nonce
        0 // latest timeout
      );

      const beneficiaries = [
        Wallet.createRandom().address,
        Wallet.createRandom().address
      ];

      const commitment = new ETHVirtualAppAgreementCommitment(
        network, // network
        proxyAddress, // multisigAddress
        multisigOwnerKeys.map(x => x.address), // signing
        targetAppInstance.identityHash, // target
        freeBalanceETH.identity, // fb AI
        freeBalanceETH.terms, // fb terms
        freeBalanceETH.hashOfLatestState, // fb state hash
        freeBalanceETH.nonce, // fb nonce
        freeBalanceETH.timeout, // fb timeout
        0, // dependency nonce
        0, // root nonce
        new BigNumber(0), // expiry
        new BigNumber(10), // 10 wei
        beneficiaries, // beneficiaries
        HashZero
      );

      const setStateCommitment = new SetStateCommitment(
        network,
        targetAppInstance.identity,
        targetAppInstance.hashOfLatestState,
        targetAppInstance.nonce,
        targetAppInstance.timeout
      );

      const setStateTx = setStateCommitment.transaction([
        // TODO: Replace with k-th signing keys later
        multisigOwnerKeys[0].signDigest(setStateCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(setStateCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({
        ...setStateTx,
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      await appRegistry.functions.setResolution(
        targetAppInstance.identity,
        targetAppInstance.encodedLatestState,
        targetAppInstance.encodedTerms
      );

      await wallet.sendTransaction({
        to: proxyAddress,
        value: parseEther("10")
      });

      await wallet.sendTransaction({
        ...commitment.transaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      expect(await provider.getBalance(beneficiaries[0])).toBeEq(5);
      expect(await provider.getBalance(beneficiaries[1])).toBeEq(5);

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
