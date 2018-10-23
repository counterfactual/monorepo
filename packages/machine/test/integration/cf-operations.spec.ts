import * as ethers from "ethers";
import * as _ from "lodash";
import * as abi from "../../src/abi";
import {
  CfAppInterface,
  CfFreeBalance,
  CfStateChannel,
  Terms,
  Transaction
} from "../../src/middleware/cf-operation/types";
import {
  ActionName,
  ClientActionMessage,
  InstallData,
  NetworkContext,
  PeerBalance
} from "../../src/types";
import { ResponseStatus } from "../../src/vm";
import { mineBlocks, sleep } from "../utils/common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_PRIVATE_KEY
} from "../utils/environment";

import AppInstance from "@counterfactual/contracts/build/contracts/AppInstance.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import Registry from "@counterfactual/contracts/build/contracts/Registry.json";
import networkFile from "@counterfactual/contracts/networks/7777777.json";

import { TestResponseSink } from "./test-response-sink";

// FIXME: Remove this dependency!
const ganache = new ethers.providers.JsonRpcProvider("http://127.0.0.1:9545");

describe("Setup Protocol", async () => {
  jest.setTimeout(30000);

  let networkMap;
  let devEnvNetworkContext7777777: NetworkContext;
  beforeAll(() => {
    networkMap = _.mapValues(_.keyBy(networkFile, "contractName"), "address");
    devEnvNetworkContext7777777 = new NetworkContext(
      networkMap.Registry,
      networkMap.PaymentApp,
      networkMap.ConditionalTransaction,
      networkMap.MultiSend,
      networkMap.NonceRegistry,
      networkMap.Signatures,
      networkMap.StaticCall,
      networkMap.ETHBalanceRefundApp
    );
  });

  /**
   * The following happens in this test:
   * 1. Two users set up a state channel between them
   * 2. Both users deposit money into the channel
   * 3. One user unilaterally closes the channel by deploying commitments made during setup and deposit
   * 4. The test checks whether everyone got back the money they deposited into the channel
   */
  it("should have the correct funds on chain", async () => {
    const depositAmount = ethers.utils.parseEther("0.0005");

    const walletA = new TestResponseSink(
      A_PRIVATE_KEY,
      devEnvNetworkContext7777777
    );
    const walletB = new TestResponseSink(
      B_PRIVATE_KEY,
      devEnvNetworkContext7777777
    );

    const startingBalanceA = await ganache.getBalance(A_ADDRESS);
    const startingBalanceB = await ganache.getBalance(B_ADDRESS);

    // TODO: What is a MULTISIG_PRIVATE_KEY 🤔
    const ethersMasterWallet = new ethers.Wallet(MULTISIG_PRIVATE_KEY, ganache);

    walletA.io.peer = walletB;
    walletB.io.peer = walletA;

    const peerBalances = PeerBalance.balances(
      A_ADDRESS,
      ethers.utils.bigNumberify(0),
      B_ADDRESS,
      ethers.utils.bigNumberify(0)
    );

    const signingKeys = [
      peerBalances.peerA.address,
      peerBalances.peerB.address
    ];

    const registry = await new ethers.Contract(
      devEnvNetworkContext7777777.Registry,
      Registry.abi,
      ethersMasterWallet
    );

    // TODO: Truffle migrate does not auto-link the bytecode in the build folder,
    //       so we have to do it manually. Will fix later of course :)
    const multisig = await new ethers.ContractFactory(
      MinimumViableMultisig.abi,
      devEnvNetworkContext7777777.linkBytecode(MinimumViableMultisig.bytecode),
      ethersMasterWallet
    ).deploy();

    await multisig.functions.setup(signingKeys);

    await setup(multisig.address, walletA, walletB);

    const {
      cfAddr: balanceRefundAppId,
      txFeeA: depositTxFeeA,
      txFeeB: depositTxFeeB
    } = await makeDeposits(multisig.address, walletA, walletB, depositAmount);

    const app = CfFreeBalance.contractInterface(devEnvNetworkContext7777777);

    const terms = CfFreeBalance.terms();

    const initcode = new ethers.utils.Interface(
      AppInstance.abi
    ).deployFunction.encode(
      devEnvNetworkContext7777777.linkBytecode(AppInstance.bytecode),
      [
        multisig.address,
        signingKeys,
        app.hash(),
        terms.hash(),
        // TODO: Don't hard-code the timeout, make it dependant on some
        // function(blockchain) to in the future check for congestion... :)
        100
      ]
    );

    // TODO: Figure out how to not have to put the insanely high gasLimit here
    await registry.functions.deploy(initcode, 0, { gasLimit: 6e9 });

    const uninstallTx: Transaction = await walletA.store.getTransaction(
      balanceRefundAppId,
      ActionName.UNINSTALL
    );

    await ethersMasterWallet.sendTransaction({
      to: uninstallTx.to,
      value: `0x${uninstallTx.value.toString(16)}`,
      data: uninstallTx.data,
      gasLimit: 6e9
    });

    await mineBlocks(
      200, // FIXME: Should be 100. Please test and verify.
      ethersMasterWallet.provider as ethers.providers.JsonRpcProvider
    );

    const cfFreeBalance = walletA.vm.cfState.freeBalanceFromMultisigAddress(
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
      devEnvNetworkContext7777777,
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
      AppInstance.abi,
      ethersMasterWallet
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

    const setupTx: Transaction = await walletA.store.getTransaction(
      multisig.address,
      ActionName.SETUP
    );

    await ethersMasterWallet.sendTransaction({
      to: setupTx.to,
      value: `0x${setupTx.value.toString(16)}`,
      data: setupTx.data
    });

    const endBalanceA = await ganache.getBalance(A_ADDRESS);

    const endBalanceB = await ganache.getBalance(B_ADDRESS);

    expect(endBalanceA.sub(startingBalanceA).toNumber()).toEqual(
      depositTxFeeA.toNumber()
    );

    expect(endBalanceB.sub(startingBalanceB).toNumber()).toEqual(
      depositTxFeeB.toNumber()
    );
  });
});

async function setup(
  multisigAddr: string,
  walletA: TestResponseSink,
  walletB: TestResponseSink
) {
  validatePresetup(walletA, walletB);
  const msg = setupStartMsg(
    multisigAddr,
    walletA.signingKey.address,
    walletB.signingKey.address
  );
  const response = await walletA.runProtocol(msg);
  expect(response.status).toEqual(ResponseStatus.COMPLETED);
  validateSetup(multisigAddr, walletA, walletB);
}

function validatePresetup(
  walletA: TestResponseSink,
  walletB: TestResponseSink
) {
  expect(walletA.vm.cfState.channelStates).toEqual({});
  expect(walletB.vm.cfState.channelStates).toEqual({});
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
  walletA: TestResponseSink,
  walletB: TestResponseSink
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
  walletA: TestResponseSink,
  walletB: TestResponseSink,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  // todo: add nonce and uniqueId params and check them
  const state = walletA.vm.cfState;

  let peerA = walletA.signingKey.address;
  let peerB = walletB.signingKey.address;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel = walletA.vm.cfState.channelStates[multisigAddr];
  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(walletB.signingKey.address);
  expect(channel.me).toEqual(walletA.signingKey.address);
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
  walletA: TestResponseSink,
  walletB: TestResponseSink,
  depositAmount: ethers.utils.BigNumber
): Promise<{
  cfAddr: string;
  txFeeA: ethers.utils.BigNumber;
  txFeeB: ethers.utils.BigNumber;
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
  depositor: TestResponseSink,
  counterparty: TestResponseSink,
  amountToDeposit: ethers.utils.BigNumber,
  counterpartyBalance: ethers.utils.BigNumber
): Promise<{ cfAddr: string; txFee: ethers.utils.BigNumber }> {
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
  depositor: TestResponseSink,
  counterparty: TestResponseSink,
  threshold: ethers.utils.BigNumber
) {
  const msg = startInstallBalanceRefundMsg(
    multisigAddr,
    depositor.signingKey.address,
    counterparty.signingKey.address,
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

async function depositOnChain(
  multisigAddress: string,
  wallet: TestResponseSink,
  value: ethers.utils.BigNumber
): Promise<ethers.utils.BigNumber> {
  const address = wallet.signingKey.address;
  const balanceBefore = await ganache.getBalance(address);

  await new ethers.Wallet(
    wallet.signingKey.privateKey,
    ganache
  ).sendTransaction({
    to: multisigAddress,
    value
  });

  const balanceAfter = await ganache.getBalance(address);
  // Calculate transaction fee
  return balanceAfter.sub(balanceBefore).add(value);
}

async function uninstallBalanceRefund(
  multisigAddr: string,
  cfAddr: string,
  walletA: TestResponseSink,
  walletB: TestResponseSink,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  const msg = startUninstallBalanceRefundMsg(
    multisigAddr,
    cfAddr,
    walletA.signingKey.address,
    walletB.signingKey.address,
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

function startInstallBalanceRefundMsg(
  multisigAddr: string,
  from: string,
  to: string,
  threshold: ethers.utils.BigNumber
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
  wallet: TestResponseSink,
  amount: ethers.utils.BigNumber
) {
  const stateChannel = wallet.vm.cfState.channelStates[multisigAddr];
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

/**
 * Validates the correctness of walletA's free balance *not* walletB's.
 */
function validateUninstalledAndFreeBalance(
  multisigAddr: string,
  cfAddr: string,
  walletA: TestResponseSink,
  walletB: TestResponseSink,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  // todo: add nonce and uniqueId params and check them
  const state = walletA.vm.cfState;

  let peerA = walletA.signingKey.address;
  let peerB = walletB.signingKey.address;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel = walletA.vm.cfState.channelStates[multisigAddr];
  const app = channel.appChannels[cfAddr];

  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(walletB.signingKey.address);
  expect(channel.me).toEqual(walletA.signingKey.address);
  expect(channel.multisigAddress).toEqual(multisigAddr);
  expect(channel.freeBalance.alice).toEqual(peerA);
  expect(channel.freeBalance.bob).toEqual(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(
    amountA.toNumber()
  );
  expect(channel.freeBalance.bobBalance.toNumber()).toEqual(amountB.toNumber());

  expect(app.dependencyNonce.nonceValue).toEqual(1);
}

function startUninstallBalanceRefundMsg(
  multisigAddr: string,
  appId: string,
  from: string,
  to: string,
  amount: ethers.utils.BigNumber
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
