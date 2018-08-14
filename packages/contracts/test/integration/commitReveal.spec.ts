import {
  generateEthWallets,
  mineBlocks,
  setupTestEnv,
  signMessageBytes,
  UNIT_ETH,
  ZERO_ADDRESS
} from "@counterfactual/test-utils";
import * as ethers from "ethers";

import {
  abiEncodingForStruct,
  AbstractContract,
  AssetType,
  buildArtifacts,
  computeNonceRegistryKey,
  Multisig,
  StateChannel,
  TransferTerms
} from "../../utils";

const { web3 } = global as any;

const {
  Registry,
  NonceRegistry,
  ConditionalTransfer,
  StaticCall
} = buildArtifacts;

function computeCommitHash(appSalt: string, chosenNumber: number) {
  return ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [appSalt, chosenNumber]
  );
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

const { parseEther } = ethers.utils;
const CommitRevealApp = AbstractContract.loadBuildArtifact("CommitRevealApp", {
  StaticCall
});

const { provider, unlockedAccount: masterAccount } = setupTestEnv(web3);
const appStateEncoding = abiEncodingForStruct(`
  address[2] playerAddrs;
  uint256 stage;
  uint256 maximum;
  uint256 guessedNumber;
  bytes32 commitHash;
  uint256 winner;
`);

async function createMultisig(
  funder: ethers.Wallet,
  initialFunding: ethers.BigNumber,
  owners: ethers.Wallet[]
): Promise<Multisig> {
  console.log("createMultisig()");
  const multisig = new Multisig(owners.map(w => w.address));
  await multisig.deploy(funder);
  await funder.sendTransaction({
    to: multisig.address,
    value: initialFunding
  });
  return multisig;
}

async function deployApp(): Promise<ethers.Contract> {
  console.log("deployApp()");
  return CommitRevealApp.deploy(masterAccount);
}

async function deployStateChannel(
  multisig: Multisig,
  appContract: ethers.Contract,
  terms: TransferTerms
) {
  console.log("deployStateChannel()");
  const registry = Registry.getDeployed(masterAccount);
  const signers = multisig.owners; // TODO: generate new signing keys for each state channel
  const stateChannel = new StateChannel(
    signers,
    multisig,
    appContract,
    appStateEncoding,
    terms
  );
  await stateChannel.deploy(masterAccount, registry);
  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  return stateChannel;
}

async function setFinalizedChannelNonce(
  multisig: Multisig,
  channelNonce: number,
  channelNonceSalt: string,
  signers: ethers.Wallet[]
) {
  console.log("setFinalizedChannelNonce()");
  const nonceRegistry = NonceRegistry.getDeployed(masterAccount);
  await multisig.execCall(
    nonceRegistry,
    "setNonce",
    [channelNonceSalt, channelNonce],
    signers
  );
  console.log("setNonce() called");

  await mineBlocks(10);

  console.log("10 blocks mined");

  const channelNonceKey = computeNonceRegistryKey(
    multisig.address,
    channelNonceSalt
  );
  console.log("Checking if finalized");
  (await nonceRegistry.functions.isFinalized(
    channelNonceKey,
    channelNonce
  )).should.be.equal(true);
  return channelNonceKey;
}

async function executeStateChannelTransfer(
  stateChannel: StateChannel,
  multisig: Multisig,
  channelNonceKey: string,
  channelNonce: number,
  signers: ethers.Wallet[]
) {
  console.log("executeStateChannelTransfer()");

  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  const conditionalTransfer = ConditionalTransfer.getDeployed(masterAccount);
  const registry = Registry.getDeployed(masterAccount);
  const nonceRegistry = NonceRegistry.getDeployed(masterAccount);

  await multisig.execDelegatecall(
    conditionalTransfer,
    "executeStateChannelConditionalTransfer",
    [
      registry.address,
      nonceRegistry.address,
      channelNonceKey,
      channelNonce,
      stateChannel.contract.cfAddress,
      stateChannel.terms
    ],
    signers
  );
}

async function runTest() {
  // const [alice, bob] = generateEthWallets(2, provider);
  // console.log(`Alice: ${JSON.stringify(alice)}\nBob: ${JSON.stringify(bob)}`);
  // const [alice, bob] = [ // THE TEST FAILS WITH THESE KEYS
  //   new ethers.Wallet(
  //     "4eb36ec97871d96d5981e19a73d58f2b420cb1253391f6c4ceef7a12f60d8a40",
  //     provider
  //   ),
  //   new ethers.Wallet(
  //     "c0b93a3c597fc428b19749c59ca8e6f0c60c6f00076e79827cdac069dc12ac3f",
  //     provider
  //   )
  // ];
  // const [alice, bob] = [  // THE TEST PASSES WITH THESE KEYS
  //   // 0xCF1c14490775857cc0f2832AfAAc14cD6c7F4d41
  //   new ethers.Wallet(
  //     "96a87d3c35370700f4d1b1b5fda0e7be727cc0f91b87d47ac978bd0ec5b3edf8",
  //     provider
  //   ),
  //   // 0xCF2f291A2A43F23A2C0fC3Db52710FF70c2dB547
  //   new ethers.Wallet(
  //     "8eb7c558dd0c86474bb55c5276b5ac0688b895c16ec1bb402a3e59094d875fdb",
  //     provider
  //   )
  // ];

  // 1. Deploy & fund multisig
  const multisig = await createMultisig(masterAccount, parseEther("2"), [
    alice,
    bob
  ]);

  // 2. Deploy CommitRevealApp app
  const appContract = await deployApp();

  // 3. Deploy StateChannel
  const terms = {
    assetType: AssetType.ETH,
    limit: parseEther("2")
  };
  const stateChannel = await deployStateChannel(multisig, appContract, terms);

  // 4. Call setState(claimFinal=true) on StateChannel with a final state
  const numberSalt =
    "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";

  const chosenNumber = 5;

  const commitHash = computeCommitHash(numberSalt, chosenNumber);

  const appState = {
    playerAddrs: [alice.address, bob.address],
    stage: Stage.DONE,
    maximum: 10,
    guessedNumber: 1,
    winner: Player.CHOOSING,
    commitHash
  };
  console.log("setState()");
  await stateChannel.setState(appState, [alice, bob]);

  // 5. Call setResolution() on StateChannel
  console.log("setResolution()");
  await stateChannel.setResolution(appState);

  // 6. Call setNonce on NonceRegistry with some salt and nonce
  const channelNonce = 1;
  const channelNonceSalt =
    "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

  const channelNonceKey = await setFinalizedChannelNonce(
    multisig,
    channelNonce,
    channelNonceSalt,
    [alice, bob]
  );
  // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
  await executeStateChannelTransfer(
    stateChannel,
    multisig,
    channelNonceKey,
    channelNonce,
    [alice, bob]
  );

  // 8. Verify balance of A and B
  (await alice.getBalance()).should.be.bignumber.eq(parseEther("2"));
  (await bob.getBalance()).should.be.bignumber.eq(0);
}

describe("CommitReveal", async () => {
  it("should pay out to the winner", async function() {
    this.timeout(4000);

    await runTest();
  });
  it("should pay out to the winner 2", async function() {
    this.timeout(4000);

    await runTest();
  });
  it("should pay out to the winner 3", async function() {
    this.timeout(4000);

    await runTest();
  });
  it("should pay out to the winner 4", async function() {
    this.timeout(4000);

    await runTest();
  });
});
