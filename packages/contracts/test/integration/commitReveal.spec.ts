import * as ethers from "ethers";

import {
  App,
  computeStateHash,
  deployContract,
  deployContractViaRegistry,
  getDeployedContract,
  HIGH_GAS_LIMIT,
  setupTestEnv,
  signMessageBytes,
  SolidityStructType,
  TransferTerms,
  UNIT_ETH,
  ZERO_ADDRESS
} from "@counterfactual/test-utils";
import Multisig from "../helpers/multisig";

const CommitRevealApp = artifacts.require("CommitRevealApp");

const web3 = (global as any).web3;
const { provider, unlockedAccount: masterAccount } = setupTestEnv(web3);

const [alice, bob] = [
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27",
    provider
  ),
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd",
    provider
  )
];

function computeCommitHash(appSalt: string, chosenNumber: number) {
  return ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [appSalt, chosenNumber]
  );
}

function computeNonceRegistryKey(multisigAddress: string, nonceSalt: string) {
  return ethers.utils.solidityKeccak256(
    ["address", "bytes32"],
    [multisigAddress, nonceSalt]
  );
}

enum AssetType {
  ETH,
  ERC20
}

enum Stage {
  SETTING_MAX,
  CHOOSING,
  GUESSING,
  REVEALING,
  DONE
}

enum Player {
  CHOOSING = 0,
  GUESSING = 1
}

describe("CommitReveal", async () => {
  const StateChannel = artifacts.require("StateChannel");
  const ConditionalTransfer = artifacts.require("ConditionalTransfer");
  const StaticCall = artifacts.require("StaticCall");
  const NonceRegistry = artifacts.require("NonceRegistry");
  const Registry = artifacts.require("Registry");
  const Signatures = artifacts.require("Signatures");
  const Transfer = artifacts.require("Transfer");

  beforeEach(async () => {
    CommitRevealApp.link("StaticCall", StaticCall.address);

    StateChannel.link("Signatures", Signatures.address);
    StateChannel.link("StaticCall", StaticCall.address);
    StateChannel.link("Transfer", Transfer.address);
  });

  it("should complete a full lifecycle", async function() {
    this.timeout(4000);

    const startBalanceA = await alice.getBalance();
    const startBalanceB = await bob.getBalance();

    // 1. Deploy & fund multisig
    const multisig = new Multisig([alice.address, bob.address]);
    await multisig.deploy(masterAccount);
    await masterAccount.sendTransaction({
      to: multisig.address,
      value: UNIT_ETH.mul(2)
    });

    const terms = TransferTerms.new({
      assetType: AssetType.ETH,
      limit: UNIT_ETH.mul(2),
      token: ZERO_ADDRESS
    });
    // 2. Deploy CommitRevealApp app
    const appContract = await deployContract(CommitRevealApp, masterAccount);
    const app = App.new({
      addr: appContract.address,
      applyAction: appContract.interface.functions.applyAction.sighash,
      resolve: appContract.interface.functions.resolve.sighash,
      turnTaker: appContract.interface.functions.getTurnTaker.sighash,
      isStateFinal: appContract.interface.functions.isStateFinal.sighash
    });

    // 3. Deploy StateChannel
    const { cfAddr, contract: stateChannel } = await deployContractViaRegistry(
      StateChannel,
      masterAccount,
      [
        multisig.address,
        [alice.address, bob.address],
        app.keccak256(),
        terms.keccak256(),
        10
      ]
    );

    // 4. Call setState(claimFinal=true) on StateChannel with a final state
    const appSalt =
      "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";
    const chosenNumber = 5;

    const commitHash = computeCommitHash(appSalt, chosenNumber);

    const AppState = new SolidityStructType(`
      address[2] playerAddrs;
      uint256 stage;
      uint256 maximum;
      uint256 guessedNumber;
      bytes32 commitHash;
      uint256 winner;
    `);

    const appState = AppState.new({
      playerAddrs: [alice.address, bob.address],
      stage: Stage.DONE,
      maximum: 10,
      guessedNumber: 1,
      commitHash,
      winner: Player.CHOOSING
    });

    const appNonce = 5;
    const timeout = 0;
    const appStateHash = appState.keccak256();
    const stateHash = computeStateHash(multisig.owners, appState, appNonce, 0);
    const signatures = signMessageBytes(stateHash, [alice, bob]);
    await stateChannel.functions.setState(
      appStateHash,
      appNonce,
      timeout,
      signatures,
      HIGH_GAS_LIMIT
    );
    // 5. Call setResolution() on StateChannel
    await stateChannel.functions.setResolution(
      app.asObject(),
      appState.encodeBytes(),
      terms.encodeBytes()
    );

    const channelNonce = 1;
    const channelNonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    // 6. Call setNonce on NonceRegistry with some salt and nonce
    const nonceRegistry: ethers.Contract = await getDeployedContract(
      NonceRegistry,
      masterAccount
    );
    await multisig.execCall(
      nonceRegistry,
      "setNonce",
      [channelNonceSalt, channelNonce],
      [alice, bob]
    );

    await multisig.execCall(
      nonceRegistry,
      "finalizeNonce",
      [channelNonceSalt],
      [alice, bob]
    );

    const channelNonceKey = computeNonceRegistryKey(
      multisig.address,
      channelNonceSalt
    );
    (await nonceRegistry.functions.isFinalized(
      channelNonceKey,
      channelNonce
    )).should.be.equal(true);
    // // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
    const conditionalTransfer: ethers.Contract = await getDeployedContract(
      ConditionalTransfer,
      masterAccount
    );
    const registry: ethers.Contract = await getDeployedContract(
      Registry,
      masterAccount
    );
    await multisig.execDelegatecall(
      conditionalTransfer,
      "executeStateChannelConditionalTransfer",
      [
        registry.address,
        nonceRegistry.address,
        channelNonceKey,
        channelNonce,
        cfAddr,
        terms.asObject()
      ],
      [alice, bob]
    );

    // 8. Verify balance of A and B
    const endBalanceA = await alice.getBalance();
    const endBalanceB = await bob.getBalance();

    endBalanceA.sub(startBalanceA).should.be.bignumber.eq(UNIT_ETH.mul(2));
    endBalanceB.should.be.bignumber.eq(startBalanceB);
  });
});
