import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";
import Multisig from "../helpers/multisig";

const CommitRevealApp = artifacts.require("CommitRevealApp");

const web3 = (global as any).web3;
const { provider, unlockedAccount: masterAccount } = Utils.setupTestEnv(web3);

const [A, B] = [
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

function computeStateHash(
  appStateHash: string,
  nonce: number,
  timeout: number
) {
  return ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, timeout, appStateHash]
  );
}

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

function encode(encoding: string, state: any) {
  return ethers.utils.defaultAbiCoder.encode([encoding], [state]);
}

function keccak256Struct(encoding: string, struct: any) {
  const bytes = ethers.utils.defaultAbiCoder.encode([encoding], [struct]);
  return ethers.utils.solidityKeccak256(["bytes"], [bytes]);
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

describe("CommitRevealApp", async () => {
  const StateChannel = artifacts.require("StateChannel");
  const ConditionalTransfer = artifacts.require("ConditionalTransfer");
  const StaticCall = artifacts.require("StaticCall");
  const NonceRegistry = artifacts.require("NonceRegistry");
  const Registry = artifacts.require("Registry");
  const Signatures = artifacts.require("Signatures");
  const Transfer = artifacts.require("Transfer");

  let app;

  const appEncoding =
    "tuple(address addr, bytes4 reduce, bytes4 resolve, bytes4 turnTaker, bytes4 isStateFinal)";

  const appStateEncoding =
    "tuple(address[2] playerAddrs, uint256 stage, uint256 maximum, " +
    "uint256 guessedNumber, bytes32 commitHash, uint256 winner)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  beforeEach(async () => {
    CommitRevealApp.link("StaticCall", StaticCall.address);

    StateChannel.link("Signatures", Signatures.address);
    StateChannel.link("StaticCall", StaticCall.address);
    StateChannel.link("Transfer", Transfer.address);
  });

  it("should complete a full lifecycle", async function() {
    this.timeout(4000);

    const startBalanceA = await A.getBalance();
    const startBalanceB = await B.getBalance();
    // 1. Deploy & fund multisig
    const multisig = new Multisig([A.address, B.address]);
    await multisig.deploy(masterAccount);
    await masterAccount.sendTransaction({
      to: multisig.address,
      value: Utils.UNIT_ETH.mul(2)
    });

    const terms = {
      assetType: AssetType.ETH,
      limit: Utils.UNIT_ETH.mul(2),
      token: Utils.zeroAddress
    };
    // 2. Deploy CommitRevealApp app
    const appContract = await Utils.deployContract(
      CommitRevealApp,
      masterAccount
    );
    app = {
      addr: appContract.address,
      reduce: appContract.interface.functions.reduce.sighash,
      resolve: appContract.interface.functions.resolve.sighash,
      turnTaker: appContract.interface.functions.getTurnTaker.sighash,
      isStateFinal: appContract.interface.functions.isStateFinal.sighash
    };

    // 3. Deploy StateChannel
    const args = [
      multisig.address,
      [A.address, B.address],
      keccak256Struct(appEncoding, app),
      keccak256Struct(termsEncoding, terms),
      10
    ];
    const {
      cfAddr,
      contract: stateChannel
    } = await Utils.deployContractViaRegistry(
      StateChannel,
      masterAccount,
      args
    );

    // 4. Call setState(claimFinal=true) on StateChannel with a final state
    const appSalt =
      "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";
    const chosenNumber = 5;

    const commitHash = computeCommitHash(appSalt, chosenNumber);

    const finalAppState = {
      playerAddrs: [A.address, B.address],
      stage: Stage.DONE,
      maximum: 10,
      guessedNumber: 1,
      commitHash,
      winner: Player.CHOOSING
    };

    const appNonce = 5;
    const timeout = 0;
    const appStateHash = keccak256Struct(appStateEncoding, finalAppState);
    const stateHash = computeStateHash(appStateHash, appNonce, 0);
    const signatures = Utils.signMessageBytes(stateHash, [A, B]);
    await stateChannel.functions.setState(
      appStateHash,
      appNonce,
      timeout,
      signatures,
      Utils.highGasLimit
    );
    // 5. Call setResolution() on StateChannel
    await stateChannel.functions.setResolution(
      app,
      encode(appStateEncoding, finalAppState),
      encode(termsEncoding, terms)
    );

    const channelNonce = 1;
    const nonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    // 6. Call setNonce on NonceRegistry with some salt and nonce
    const nonceRegistry: ethers.Contract = await Utils.getDeployedContract(
      NonceRegistry,
      masterAccount
    );
    await multisig.execCall(
      nonceRegistry,
      "setNonce",
      [nonceSalt, channelNonce],
      [A, B]
    );
    await multisig.execCall(
      nonceRegistry,
      "finalizeNonce",
      [nonceSalt],
      [A, B]
    );

    const nonceKey = computeNonceRegistryKey(multisig.address, nonceSalt);
    (await nonceRegistry.functions.isFinalized(
      nonceKey,
      channelNonce
    )).should.be.equal(true);
    // // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
    const conditionalTransfer: ethers.Contract = await Utils.getDeployedContract(
      ConditionalTransfer,
      masterAccount
    );
    const registry: ethers.Contract = await Utils.getDeployedContract(
      Registry,
      masterAccount
    );
    await multisig.execDelegatecall(
      conditionalTransfer,
      "executeStateChannelConditionalTransfer",
      [
        registry.address,
        nonceRegistry.address,
        nonceKey,
        channelNonce,
        cfAddr,
        terms
      ],
      [A, B]
    );
    // 8. Verify balance of A and B
    (await A.getBalance())
      .sub(startBalanceA)
      .should.be.bignumber.eq(Utils.UNIT_ETH.mul(2));
    (await B.getBalance()).should.be.bignumber.eq(startBalanceB);
  });
});
