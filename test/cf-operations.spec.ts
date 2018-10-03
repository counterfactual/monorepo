import { HIGH_GAS_LIMIT } from "@counterfactual/test-utils";
import * as ethers from "ethers";
import * as abi from "../src/abi";
import {
  CfAppInterface,
  CfFreeBalance,
  CfStateChannel,
  Terms
} from "../src/middleware/cf-operation/types";
import {
  ActionName,
  ClientActionMessage,
  InstallData,
  PeerBalance
} from "../src/types";
import { ResponseStatus } from "../src/vm";
import { sleep } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_ADDRESS,
  MULTISIG_PRIVATE_KEY
} from "./environment";
import { TestWallet } from "./wallet/wallet";

import Multisig from "../contracts/build/contracts/MinimumViableMultisig.json";
import Registry from "../contracts/build/contracts/Registry.json";
import StateChannel from "../contracts/build/contracts/StateChannel.json";

export async function mineOneBlock(provider: ethers.providers.JsonRpcProvider) {
  return provider.send("evm_mine", []);
}

export async function mineBlocks(
  num: number,
  provider: ethers.providers.JsonRpcProvider
) {
  for (let i = 0; i < num; i++) {
    await mineOneBlock(provider);
  }
}

describe("Setup Protocol", async () => {
  jest.setTimeout(30000);

  /**
   * The following happens in this test:
   * 1. Two users set up a state channel between them
   * 2. Both users deposit money into the channel
   * 3. One user unilaterally closes the channel by deploying commitments made during setup and deposit
   * 4. The test checks whether everyone got back the money they deposited into the channel
   */
  it("should have the correct funds on chain", async () => {
    const depositAmount = ethers.utils.parseEther("0.0005");

    const walletA = new TestWallet();
    walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
    const walletB = new TestWallet();
    walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);
    const network = walletA.network;

    const masterWallet = new TestWallet();
    masterWallet.setUser(MULTISIG_ADDRESS, MULTISIG_PRIVATE_KEY);
    const ethersWalletA = walletA.currentUser.ethersWallet;
    const ethersWalletB = walletB.currentUser.ethersWallet;
    const ethersMasterWallet = masterWallet.currentUser.ethersWallet;

    const startBalanceA = await ethersWalletA.getBalance();
    const startBalanceB = await ethersWalletB.getBalance();

    walletA.currentUser.io.peer = walletB;
    walletB.currentUser.io.peer = walletA;

    const peerBalances = PeerBalance.balances(
      ethersWalletA.address,
      ethers.utils.bigNumberify(0),
      ethersWalletB.address,
      ethers.utils.bigNumberify(0)
    );
    const signingKeys = [
      peerBalances.peerA.address,
      peerBalances.peerB.address
    ];

    // STEP 1 -- DEPLOY MULTISIG :)
    const registry = await new ethers.Contract(
      network.Registry,
      Registry.abi,
      masterWallet.currentUser.ethersWallet
    );

    // TODO: Truffle migrate does not auto-link the bytecode in the build folder,
    //       so we have to do it manually. Will fix later of course :)
    Multisig.bytecode = Multisig.bytecode.replace(
      /__Signatures_+/g,
      network.Signatures.substr(2)
    );
    const multisig = await new ethers.Contract(
      "",
      Multisig.abi,
      masterWallet.currentUser.ethersWallet
    ).deploy(Multisig.bytecode);

    await multisig.functions.setup(signingKeys);

    // STEP 2 -- GENERATE COMMITMENTS
    await setup(multisig.address, walletA, walletB);

    // STEP 3 -- FUND THE MULTISIG
    const {
      cfAddr: balanceRefundAppId,
      txFeeA: depositTxFeeA,
      txFeeB: depositTxFeeB
    } = await makeDeposits(multisig.address, walletA, walletB, depositAmount);

    // STEP 4 -- DEPLOY SIGNED COMMITMENT TO SET FREE BALANCE
    StateChannel.bytecode = StateChannel.bytecode.replace(
      /__Signatures_+/g,
      network.Signatures.substr(2)
    );
    StateChannel.bytecode = StateChannel.bytecode.replace(
      /__StaticCall_+/g,
      network.StaticCall.substr(2)
    );
    const app = CfFreeBalance.contractInterface(network);
    const terms = CfFreeBalance.terms();
    const initcode = new ethers.Interface(
      StateChannel.abi
    ).deployFunction.encode(StateChannel.bytecode, [
      multisig.address,
      signingKeys,
      app.hash(),
      terms.hash(),
      // FIXME: Don't hard-code the timeout, make it dependant on some
      // function(blockchain) to in the future check for congestion... :)
      100
    ]);
    await registry.functions.deploy(initcode, 0, HIGH_GAS_LIMIT);
    const uninstallTx = walletA.currentUser.store.getTransaction(
      balanceRefundAppId,
      ActionName.UNINSTALL
    );
    await ethersMasterWallet.sendTransaction({
      to: uninstallTx.to,
      value: `0x${uninstallTx.value.toString(16)}`,
      data: uninstallTx.data,
      ...HIGH_GAS_LIMIT
    });

    // STEP 5 -- WAIT FOR CHANNEL TO FINALIZE
    await mineBlocks(
      200,
      ethersMasterWallet.provider as ethers.providers.JsonRpcProvider
    );

    // STEP 6 -- RESOLVE STATE CHANNEL
    const cfFreeBalance = walletA.currentUser.vm.cfState.freeBalanceFromMultisigAddress(
      multisig.address
    );
    const values = [
      cfFreeBalance.alice,
      cfFreeBalance.bob,
      cfFreeBalance.aliceBalance,
      cfFreeBalance.bobBalance
    ];
    const freeBalanceFinalState = abi.encode(
      ["address", "address", "uint256", "uint256"],
      values
    );
    const cfStateChannel = new CfStateChannel(
      network,
      multisig.address,
      signingKeys,
      app,
      terms,
      100,
      0
    );
    const channelCfAddr = cfStateChannel.cfAddress();
    const channelAddr = await registry.functions.resolver(channelCfAddr);
    const stateChannel = new ethers.Contract(
      channelAddr,
      StateChannel.abi,
      masterWallet.currentUser.ethersWallet
    );
    const appData = [
      app.address,
      app.applyAction,
      app.resolve,
      app.getTurnTaker,
      app.isStateTerminal
    ];
    const termsData = abi.encode(
      ["bytes1", "uint8", "uint256", "address"],
      ["0x19", terms.assetType, terms.limit, terms.token]
    );
    await stateChannel.functions.setResolution(
      appData,
      freeBalanceFinalState,
      termsData
    );

    // STEP 7 -- DEPLOY SETUP COMMITMENT TO WITHDRAW FROM FREE BALANCE
    const setupTx = walletA.currentUser.store.getTransaction(
      multisig.address,
      ActionName.SETUP
    );
    await masterWallet.currentUser.ethersWallet.sendTransaction({
      to: setupTx.to,
      value: `0x${setupTx.value.toString(16)}`,
      data: setupTx.data
    });

    // STEP 8 -- CONFIRM EXPECTED BALANCES
    const endBalanceA = await ethersWalletA.getBalance();
    const endBalanceB = await ethersWalletB.getBalance();
    expect(endBalanceA.sub(startBalanceA).toNumber()).toEqual(
      depositTxFeeA.toNumber()
    );
    expect(endBalanceB.sub(startBalanceB).toNumber()).toEqual(
      depositTxFeeB.toNumber()
    );
  });
});

async function setup(
  multisigAddr: string,
  walletA: TestWallet,
  walletB: TestWallet
) {
  validatePresetup(walletA, walletB);
  const msg = setupStartMsg(
    multisigAddr,
    walletA.currentUser.address,
    walletB.currentUser.address
  );
  const response = await walletA.runProtocol(msg);
  expect(response.status).toEqual(ResponseStatus.COMPLETED);
  validateSetup(multisigAddr, walletA, walletB);
}

function validatePresetup(walletA: TestWallet, walletB: TestWallet) {
  expect(walletA.currentUser.vm.cfState.channelStates).toEqual({});
  expect(walletB.currentUser.vm.cfState.channelStates).toEqual({});
}

function setupStartMsg(
  multisigAddress: string,
  from: string,
  to: string
): ClientActionMessage {
  return {
    requestId: "0",
    appId: "",
    action: ActionName.SETUP,
    data: {},
    multisigAddress,
    toAddress: to,
    fromAddress: from,
    stateChannel: undefined,
    seq: 0,
    signature: undefined
  };
}

function validateSetup(
  multisigAddr: string,
  walletA: TestWallet,
  walletB: TestWallet
) {
  validateNoAppsAndFreeBalance(
    multisigAddr,
    walletA,
    walletB,
    ethers.utils.bigNumberify(0),
    ethers.utils.bigNumberify(0)
  );
  validateNoAppsAndFreeBalance(
    multisigAddr,
    walletB,
    walletA,
    ethers.utils.bigNumberify(0),
    ethers.utils.bigNumberify(0)
  );
}

/**
 * Validates the correctness of walletAs free balance *not* walletBs.
 */
function validateNoAppsAndFreeBalance(
  multisigAddr: string,
  walletA: TestWallet,
  walletB: TestWallet,
  amountA: ethers.BigNumber,
  amountB: ethers.BigNumber
) {
  // todo: add nonce and uniqueId params and check them
  const state = walletA.currentUser.vm.cfState;

  let peerA = walletA.currentUser.address;
  let peerB = walletB.currentUser.address;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel = walletA.currentUser.vm.cfState.channelStates[multisigAddr];
  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(walletB.currentUser.address);
  expect(channel.me).toEqual(walletA.currentUser.address);
  expect(channel.multisigAddress).toEqual(multisigAddr);
  expect(channel.appChannels).toEqual({});
  expect(channel.freeBalance.alice).toEqual(peerA);
  expect(channel.freeBalance.bob).toEqual(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(
    amountA.toNumber()
  );
  expect(channel.freeBalance.bobBalance.toNumber()).toEqual(amountB.toNumber());
}

async function makeDeposits(
  multisigAddr: string,
  walletA: TestWallet,
  walletB: TestWallet,
  depositAmount: ethers.BigNumber
): Promise<{
  cfAddr: string;
  txFeeA: ethers.BigNumber;
  txFeeB: ethers.BigNumber;
}> {
  const { txFee: txFeeA } = await deposit(
    multisigAddr,
    walletA, // depositor
    walletB, // counterparty
    depositAmount, // amountToDeposit
    ethers.utils.bigNumberify(0) // counterpartyBalance
  );
  const { cfAddr, txFee: txFeeB } = await deposit(
    multisigAddr,
    walletB, // depositor
    walletA, // counterparty
    depositAmount, // amountToDeposit
    depositAmount // counterpartyBalance
  );
  return { cfAddr, txFeeA, txFeeB };
}

async function deposit(
  multisigAddr: string,
  depositor: TestWallet,
  counterparty: TestWallet,
  amountToDeposit: ethers.BigNumber,
  counterpartyBalance: ethers.BigNumber
): Promise<{ cfAddr: string; txFee: ethers.BigNumber }> {
  const cfAddr = await installBalanceRefund(
    multisigAddr,
    depositor,
    counterparty,
    counterpartyBalance
  );
  const txFee = await depositOnChain(multisigAddr, depositor, amountToDeposit);
  await uninstallBalanceRefund(
    multisigAddr,
    cfAddr,
    depositor,
    counterparty,
    amountToDeposit,
    counterpartyBalance
  );
  return { cfAddr, txFee };
}

async function installBalanceRefund(
  multisigAddr: string,
  depositor: TestWallet,
  counterparty: TestWallet,
  threshold: ethers.BigNumber
) {
  const msg = startInstallBalanceRefundMsg(
    multisigAddr,
    depositor.currentUser.address,
    counterparty.currentUser.address,
    threshold
  );
  const response = await depositor.runProtocol(msg);
  expect(response.status).toEqual(ResponseStatus.COMPLETED);
  // since the machine is async, we need to wait for walletB to finish up its
  // side of the protocol before inspecting it's state
  await sleep(50);
  // check B's client
  validateInstalledBalanceRefund(multisigAddr, counterparty, threshold);
  // check A's client and return the newly created cf address
  return validateInstalledBalanceRefund(multisigAddr, depositor, threshold);
}

function startInstallBalanceRefundMsg(
  multisigAddr: string,
  from: string,
  to: string,
  threshold: ethers.BigNumber
): ClientActionMessage {
  let peerA = from;
  let peerB = to;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
  }
  const terms = new Terms(
    0,
    ethers.utils.bigNumberify(10),
    ethers.constants.AddressZero
  ); // todo

  const app = new CfAppInterface(
    "0x0",
    "0x00000000",
    "0x00000000",
    "0x00000000",
    "0x00000000",
    ""
  ); // todo
  const timeout = 100;
  const installData: InstallData = {
    peerA: new PeerBalance(peerA, 0),
    peerB: new PeerBalance(peerB, 0),
    keyA: peerA,
    keyB: peerB,
    encodedAppState: "0x1234",
    terms,
    app,
    timeout
  };
  return {
    requestId: "1",
    appId: "",
    action: ActionName.INSTALL,
    data: installData,
    multisigAddress: multisigAddr,
    toAddress: to,
    fromAddress: from,
    seq: 0
  };
}

function validateInstalledBalanceRefund(
  multisigAddr: string,
  wallet: TestWallet,
  amount: ethers.BigNumber
) {
  const stateChannel =
    wallet.currentUser.vm.cfState.channelStates[multisigAddr];
  const appChannels = stateChannel.appChannels;
  const cfAddrs = Object.keys(appChannels);
  expect(cfAddrs.length).toEqual(1);

  const cfAddr = cfAddrs[0];

  expect(appChannels[cfAddr].peerA.balance.toNumber()).toEqual(0);
  expect(appChannels[cfAddr].peerA.address).toEqual(
    stateChannel.freeBalance.alice
  );
  expect(appChannels[cfAddr].peerA.balance.toNumber()).toEqual(0);

  expect(appChannels[cfAddr].peerB.balance.toNumber()).toEqual(0);
  expect(appChannels[cfAddr].peerB.address).toEqual(
    stateChannel.freeBalance.bob
  );
  expect(appChannels[cfAddr].peerB.balance.toNumber()).toEqual(0);

  return cfAddr;
}

async function depositOnChain(
  multisigAddress: string,
  wallet: TestWallet,
  value: ethers.BigNumber
): Promise<ethers.BigNumber> {
  const { ethersWallet } = wallet.currentUser;
  const balanceBefore = await ethersWallet.getBalance();
  await ethersWallet.sendTransaction({
    to: multisigAddress,
    value
  });
  const balanceAfter = await ethersWallet.getBalance();
  // Calculate transaction fee
  return balanceAfter.sub(balanceBefore).add(value);
}

async function uninstallBalanceRefund(
  multisigAddr: string,
  cfAddr: string,
  walletA: TestWallet,
  walletB: TestWallet,
  amountA: ethers.BigNumber,
  amountB: ethers.BigNumber
) {
  const msg = startUninstallBalanceRefundMsg(
    multisigAddr,
    cfAddr,
    walletA.currentUser.address,
    walletB.currentUser.address,
    amountA
  );
  const response = await walletA.runProtocol(msg);
  expect(response.status).toEqual(ResponseStatus.COMPLETED);
  // validate walletA
  validateUninstalledAndFreeBalance(
    multisigAddr,
    cfAddr,
    walletA,
    walletB,
    amountA,
    amountB
  );
  // validate walletB
  validateUninstalledAndFreeBalance(
    multisigAddr,
    cfAddr,
    walletB,
    walletA,
    amountB,
    amountA
  );
}

/**
 * Validates the correctness of walletA's free balance *not* walletB's.
 */
function validateUninstalledAndFreeBalance(
  multisigAddr: string,
  cfAddr: string,
  walletA: TestWallet,
  walletB: TestWallet,
  amountA: ethers.BigNumber,
  amountB: ethers.BigNumber
) {
  // todo: add nonce and uniqueId params and check them
  const state = walletA.currentUser.vm.cfState;

  let peerA = walletA.currentUser.address;
  let peerB = walletB.currentUser.address;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel = walletA.currentUser.vm.cfState.channelStates[multisigAddr];
  const app = channel.appChannels[cfAddr];

  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(walletB.currentUser.address);
  expect(channel.me).toEqual(walletA.currentUser.address);
  expect(channel.multisigAddress).toEqual(multisigAddr);
  expect(channel.freeBalance.alice).toEqual(peerA);
  expect(channel.freeBalance.bob).toEqual(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(
    amountA.toNumber()
  );
  expect(channel.freeBalance.bobBalance.toNumber()).toEqual(amountB.toNumber());

  expect(app.dependencyNonce.nonceValue).toEqual(2);
}

function startUninstallBalanceRefundMsg(
  multisigAddr: string,
  appId: string,
  from: string,
  to: string,
  amount: ethers.BigNumber
): ClientActionMessage {
  const uninstallData = {
    peerAmounts: [new PeerBalance(from, amount), new PeerBalance(to, 0)]
  };
  return {
    requestId: "2",
    appId,
    action: ActionName.UNINSTALL,
    data: uninstallData,
    multisigAddress: multisigAddr,
    fromAddress: from,
    toAddress: to,
    stateChannel: undefined,
    seq: 0,
    signature: undefined
  };
}
