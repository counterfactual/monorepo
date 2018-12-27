import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import ETHBucket from "@counterfactual/contracts/build/contracts/ETHBucket.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import NonceRegistry from "@counterfactual/contracts/build/contracts/NonceRegistry.json";
import ProxyFactory from "@counterfactual/contracts/build/contracts/ProxyFactory.json";
import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import dotenv from "dotenv-safe";
import { Contract, Wallet } from "ethers";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import {
  BigNumber,
  hexlify,
  Interface,
  randomBytes,
  SigningKey
} from "ethers/utils";

import {
  SetStateCommitment,
  SetupCommitment
} from "../../src/middleware/protocol-operation";
import { StateChannel } from "../../src/models";

// To be honest, 30000 is an arbitrary large number that has never failed
// to reach the done() call in the test case, not intelligency chosen
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

// TODO: When we add a second use case of this custom mathcer,
//       move it and its typigns into somewhere re-usable
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeEq(expected: BigNumber): BigNumber;
    }
  }
}
expect.extend({
  toBeEq(received: BigNumber, argument: BigNumber) {
    return {
      pass: received.eq(argument),
      message: () => `expected ${received} not to be equal to ${argument}`
    };
  }
});

// TODO: This will be re-used for all integration tests, so
//       move it somewhere re-usable when we add a new test
beforeAll(async () => {
  dotenv.config();

  // Can use ! because dotenv-safe ensures value is set
  const host = process.env.DEV_GANACHE_HOST!;
  const port = process.env.DEV_GANACHE_PORT!;
  const mnemonic = process.env.DEV_GANACHE_MNEMONIC!;

  provider = new JsonRpcProvider(`http://${host}:${port}`);
  wallet = Wallet.fromMnemonic(mnemonic).connect(provider);
  networkId = (await provider.getNetwork()).chainId;
});

/**
 * This test suite tests submitting a generated Set State Commitment
 * to the blockchain and observing the result
 */
describe("Scenario - open channel, update free balance, on-chain resolution", () => {
  jest.setTimeout(JEST_TEST_WAIT_TIME);

  it("should distribute resolution returned from ETH Free Balance App", async done => {
    const relevantArtifacts = [
      AppRegistry,
      ETHBucket,
      NonceRegistry,
      StateChannelTransaction
    ];

    const network = {
      // Fetches the values from build artifacts of the contracts needed
      // for this test and sets the ones we don't care about to 0x0
      MultiSend: AddressZero,
      ETHBalanceRefund: AddressZero,
      ...relevantArtifacts.reduce(
        (accumulator, artifact) => ({
          ...accumulator,
          [artifact.contractName]: artifact.networks[networkId].address
        }),
        {}
      )
    } as NetworkContext;

    const signingKeys = [
      new SigningKey(hexlify(randomBytes(32))),
      new SigningKey(hexlify(randomBytes(32)))
    ].sort((a, b) =>
      parseInt(a.address, 16) < parseInt(b.address, 16) ? -1 : 1
    );

    const users = signingKeys.map(x => x.address);

    const proxyFactory = new Contract(
      ProxyFactory.networks[networkId].address,
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

      stateChannel = stateChannel.setState(freeBalanceETH.id, state);
      freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

      const setStateCommitment = new SetStateCommitment(
        network,
        freeBalanceETH.identity,
        freeBalanceETH.encodedLatestState,
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

      const appRegistry = new Contract(
        AppRegistry.networks[networkId].address,
        AppRegistry.abi,
        wallet
      );

      await appRegistry.functions.setResolution(
        freeBalanceETH.identity,
        freeBalanceETH.appInterface,
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
      MinimumViableMultisig.networks[networkId].address,
      new Interface(MinimumViableMultisig.abi).functions.setup.encode([users]),
      { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
    );
  });
});
