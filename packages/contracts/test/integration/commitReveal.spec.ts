import * as ethers from "ethers";

import {
  AbstractContract,
  AppEncoder,
  computeNonceRegistryKey,
  computeStateHash,
  Contract,
  deployContract,
  deployContractViaRegistry,
  getDeployedContract,
  Multisig,
  setupTestEnv,
  signMessageBytes,
  StructAbiEncoder,
  TermsEncoder,
  UNIT_ETH,
  ZERO_ADDRESS
} from "@counterfactual/test-utils";

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

const { keccak256, parseEther } = ethers.utils;

function computeCommitHash(appSalt: string, chosenNumber: number) {
  return ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [appSalt, chosenNumber]
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
  const ConditionalTransfer = AbstractContract.loadBuildArtifact(
    "ConditionalTransfer"
  );
  const StaticCall = AbstractContract.loadBuildArtifact("StaticCall");
  const NonceRegistry = AbstractContract.loadBuildArtifact("NonceRegistry");
  const Registry = AbstractContract.loadBuildArtifact("Registry");
  const Signatures = AbstractContract.loadBuildArtifact("Signatures");
  const Transfer = AbstractContract.loadBuildArtifact("Transfer");

  const StateChannel = AbstractContract.loadBuildArtifact("StateChannel", {
    StaticCall,
    Signatures,
    Transfer
  });

  const CommitRevealApp: AbstractContract = AbstractContract.loadBuildArtifact(
    "CommitRevealApp",
    {
      StaticCall
    }
  );

  it("should complete a full lifecycle", async function(this: Mocha.ITestCallbackContext) {
    this.timeout(4000);

    const startBalanceA = await alice.getBalance();
    const startBalanceB = await bob.getBalance();

    // 1. Deploy & fund multisig
    const multisig = new Multisig([alice.address, bob.address]);
    await multisig.deploy(masterAccount);
    await masterAccount.sendTransaction({
      to: multisig.address,
      value: parseEther("2")
    });

    const terms = {
      assetType: AssetType.ETH,
      limit: parseEther("2"),
      token: ZERO_ADDRESS
    };
    // 2. Deploy CommitRevealApp app
    const appContract = await CommitRevealApp.deploy(masterAccount);
    const app = {
      addr: appContract.address,
      applyAction: appContract.interface.functions.applyAction.sighash,
      resolve: appContract.interface.functions.resolve.sighash,
      turnTaker: appContract.interface.functions.turnTaker.sighash,
      isStateFinal: appContract.interface.functions.isStateFinal.sighash
    };
    const registry = Registry.getDeployed(masterAccount);

    // 3. Deploy StateChannel
    const stateChannel = await StateChannel.deployViaRegistry(
      masterAccount,
      registry,
      [
        multisig.address,
        [alice.address, bob.address],
        keccak256(AppEncoder.encode(app)),
        keccak256(TermsEncoder.encode(terms)),
        10
      ]
    );

    // 4. Call setState(claimFinal=true) on StateChannel with a final state
    const appSalt =
      "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";
    const chosenNumber = 5;

    const commitHash = computeCommitHash(appSalt, chosenNumber);

    const AppStateEncoder = StructAbiEncoder.fromDefinition(`
      address[2] playerAddrs;
      uint256 stage;
      uint256 maximum;
      uint256 guessedNumber;
      bytes32 commitHash;
      uint256 winner;
    `);

    const appState = {
      playerAddrs: [alice.address, bob.address],
      stage: Stage.DONE,
      maximum: 10,
      guessedNumber: 1,
      commitHash,
      winner: Player.CHOOSING
    };

    const appNonce = 5;
    const timeout = 0;
    const appStateHash = keccak256(AppStateEncoder.encode(appState));
    const stateHash = computeStateHash(
      multisig.owners,
      appStateHash,
      appNonce,
      0
    );
    const signatures = signMessageBytes(stateHash, [alice, bob]);
    await stateChannel.functions.setState(
      appStateHash,
      appNonce,
      timeout,
      signatures
    );
    // 5. Call setResolution() on StateChannel
    await stateChannel.functions.setResolution(
      app,
      AppStateEncoder.encode(appState),
      TermsEncoder.encode(terms)
    );

    const channelNonce = 1;
    const channelNonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    // 6. Call setNonce on NonceRegistry with some salt and nonce
    const nonceRegistry = NonceRegistry.getDeployed(masterAccount);
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
    // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
    const conditionalTransfer = ConditionalTransfer.getDeployed(masterAccount);
    await multisig.execDelegatecall(
      conditionalTransfer,
      "executeStateChannelConditionalTransfer",
      [
        registry.address,
        nonceRegistry.address,
        channelNonceKey,
        channelNonce,
        stateChannel.cfAddress,
        terms
      ],
      [alice, bob]
    );

    // 8. Verify balance of A and B
    const endBalanceA = await alice.getBalance();
    const endBalanceB = await bob.getBalance();

    endBalanceA.sub(startBalanceA).should.be.bignumber.eq(parseEther("2"));
    endBalanceB.should.be.bignumber.eq(startBalanceB);
  });
});
