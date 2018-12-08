import { ethers } from "ethers";

import * as cf from "@counterfactual/cf.js";

// FIXME: use proxy factory
import MinimumViableMultisig from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";

import { Transaction } from "../../src/middleware/protocol-operation/types";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  UNUSED_FUNDED_ACCOUNT_PRIVATE_KEY
} from "../utils/environment";

import { TestResponseSink } from "../utils/test-response-sink";

// FIXME: Remove this dependency!
// https://github.com/counterfactual/monorepo/issues/103
const ganache = new ethers.providers.JsonRpcProvider("http://127.0.0.1:9545");

describe("Setup Protocol", async () => {
  jest.setTimeout(30000);

  let devEnvNetworkContext7777777: cf.legacy.network.NetworkContext;

  beforeAll(() => {
    // NOTE: This `require` statement is explicitly in side the `beforeAll` and not at
    // the file scope because we need it to do the file lookup at runtime and not
    // buildtime otherwise the build process will fail if the contracts haven't
    // been migrated yet.
    const network = require("@counterfactual/contracts/networks/7777777.json");

    const nameToAddressMap = network.map(x => ({
      [x.contractName]: x.address
    }));

    devEnvNetworkContext7777777 = {
      // Protocol
      ConditionalTransaction: nameToAddressMap["ConditionalTransaction"],
      MultiSend: nameToAddressMap["MultiSend"],
      NonceRegistry: nameToAddressMap["NonceRegistry"],
      AppRegistry: nameToAddressMap["AppRegistry"],
      // App-specific
      PaymentApp: nameToAddressMap["PaymentApp"],
      ETHBalanceRefund: nameToAddressMap["ETHBalanceRefund"]
    };
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

    const responseSinkA = new TestResponseSink(
      A_PRIVATE_KEY,
      devEnvNetworkContext7777777
    );

    const responseSinkB = new TestResponseSink(
      B_PRIVATE_KEY,
      devEnvNetworkContext7777777
    );

    const startingBalanceA = await ganache.getBalance(A_ADDRESS);
    const startingBalanceB = await ganache.getBalance(B_ADDRESS);

    const unlockedAccount = new ethers.Wallet(
      UNUSED_FUNDED_ACCOUNT_PRIVATE_KEY,
      ganache
    );

    responseSinkA.io.peers.set(B_ADDRESS, responseSinkB);
    responseSinkB.io.peers.set(A_ADDRESS, responseSinkA);

    const peerBalances = cf.legacy.utils.PeerBalance.balances(
      A_ADDRESS,
      ethers.utils.bigNumberify(0),
      B_ADDRESS,
      ethers.utils.bigNumberify(0)
    );

    const signingKeys = [
      peerBalances.peerA.address,
      peerBalances.peerB.address
    ];

    const multisig = await new ethers.ContractFactory(
      MinimumViableMultisig.abi,
      MinimumViableMultisig.bytecode,
      unlockedAccount
    ).deploy();

    await multisig.functions.setup(signingKeys);

    await setup(multisig.address, responseSinkA, responseSinkB);

    const {
      cfAddr: balanceRefundAppId,
      txFeeA: depositTxFeeA,
      txFeeB: depositTxFeeB
    } = await makeDeposits(
      multisig.address,
      responseSinkA,
      responseSinkB,
      depositAmount
    );

    const app = cf.legacy.utils.FreeBalance.contractInterface(
      devEnvNetworkContext7777777
    );

    const terms = cf.legacy.utils.FreeBalance.terms();

    const uninstallTx: Transaction = await responseSinkA.store.getTransaction(
      balanceRefundAppId,
      cf.legacy.node.ActionName.UNINSTALL
    );

    await unlockedAccount.sendTransaction({
      to: uninstallTx.to,
      value: `0x${uninstallTx.value.toString(16)}`,
      data: uninstallTx.data,
      gasLimit: 6e9
    });

    for (const _ of Array(100)) {
      // FIXME: This is assuming Ganache backend
      // @ts-ignore
      await unlockedAccount.provider.send("evm_mine", []);
    }

    const freeBalance = responseSinkA.instructionExecutor.node.freeBalanceFromMultisigAddress(
      multisig.address
    );

    const freeBalanceFinalState = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256"],
      [
        freeBalance.alice,
        freeBalance.bob,
        freeBalance.aliceBalance,
        freeBalance.bobBalance
      ]
    );

    const appInstance = new cf.legacy.app.AppInstance(
      multisig.address,
      signingKeys,
      app,
      terms,
      100,
      0
    );

    const appRegistry = new ethers.Contract(
      devEnvNetworkContext7777777["AppRegistry"],
      require("@counterfactual/contracts/build/contracts/AppRegistry.json").abi,
      unlockedAccount
    );

    const termsData = ethers.utils.defaultAbiCoder.encode(
      ["bytes1", "uint8", "uint256", "address"],
      ["0x19", terms.assetType, terms.limit, terms.token]
    );

    await appRegistry.functions.setResolution(
      [
        app.address,
        app.applyAction,
        app.resolve,
        app.getTurnTaker,
        app.isStateTerminal
      ],
      freeBalanceFinalState,
      termsData
    );

    const setupTx = await responseSinkA.store.getTransaction(
      multisig.address,
      cf.legacy.node.ActionName.SETUP
    );

    await unlockedAccount.sendTransaction({
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
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink
) {
  validatePresetup(responseSinkA, responseSinkB);
  const response = await responseSinkA.runSetupProtocol(
    responseSinkA.signingKey.address,
    responseSinkB.signingKey.address,
    multisigAddr
  );
  expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
  validateSetup(multisigAddr, responseSinkA, responseSinkB);
}

function validatePresetup(
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink
) {
  expect(responseSinkA.instructionExecutor.node.channelStates).toEqual({});
  expect(responseSinkB.instructionExecutor.node.channelStates).toEqual({});
}

function validateSetup(
  multisigAddr: string,
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink
) {
  validateNoAppsAndFreeBalance(
    multisigAddr,
    responseSinkA,
    responseSinkB,
    ethers.utils.bigNumberify(0),
    ethers.utils.bigNumberify(0)
  );
  validateNoAppsAndFreeBalance(
    multisigAddr,
    responseSinkB,
    responseSinkA,
    ethers.utils.bigNumberify(0),
    ethers.utils.bigNumberify(0)
  );
}

/**
 * Validates the correctness of walletAs free balance *not* walletBs.
 */
function validateNoAppsAndFreeBalance(
  multisigAddr: string,
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink,
  amountAgiven: ethers.utils.BigNumber,
  amountBgiven: ethers.utils.BigNumber
) {
  // todo: add nonce and uniqueId params and check them
  // https://github.com/counterfactual/monorepo/issues/111
  const state = responseSinkA.instructionExecutor.node;

  let peerA = responseSinkA.signingKey.address;
  let peerB = responseSinkB.signingKey.address;

  let amountA = amountAgiven;
  let amountB = amountBgiven;

  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel =
    responseSinkA.instructionExecutor.node.channelStates[multisigAddr];
  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(responseSinkB.signingKey.address);
  expect(channel.me).toEqual(responseSinkA.signingKey.address);
  expect(channel.multisigAddress).toEqual(multisigAddr);
  expect(channel.appInstances).toEqual({});
  expect(channel.freeBalance.alice).toEqual(peerA);
  expect(channel.freeBalance.bob).toEqual(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(
    amountA.toNumber()
  );
  expect(channel.freeBalance.bobBalance.toNumber()).toEqual(amountB.toNumber());
}

async function makeDeposits(
  multisigAddr: string,
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink,
  depositAmount: ethers.utils.BigNumber
): Promise<{
  cfAddr: string;
  txFeeA: ethers.utils.BigNumber;
  txFeeB: ethers.utils.BigNumber;
}> {
  const { txFee: txFeeA } = await deposit(
    multisigAddr,
    responseSinkA, // depositor
    responseSinkB, // counterparty
    depositAmount, // amountToDeposit
    ethers.utils.bigNumberify(0) // counterpartyBalance
  );
  const { cfAddr, txFee: txFeeB } = await deposit(
    multisigAddr,
    responseSinkB, // depositor
    responseSinkA, // counterparty
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
  const response = await depositor.runInstallProtocol(
    depositor.signingKey.address,
    counterparty.signingKey.address,
    multisigAddr,
    msg
  );
  expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
  // since the machine is async, we need to wait for responseSinkB to finish up its
  // side of the protocol before inspecting it's state

  await new Promise(resolve => setTimeout(resolve, 50));
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
    value,
    to: multisigAddress
  });

  const balanceAfter = await ganache.getBalance(address);
  // Calculate transaction fee
  return balanceAfter.sub(balanceBefore).add(value);
}

async function uninstallBalanceRefund(
  multisigAddr: string,
  cfAddr: string,
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  const response = await responseSinkA.runUninstallProtocol(
    responseSinkA.signingKey.address,
    responseSinkB.signingKey.address,
    multisigAddr,
    [
      new cf.legacy.utils.PeerBalance(
        responseSinkA.signingKey.address,
        amountA
      ),
      new cf.legacy.utils.PeerBalance(responseSinkB.signingKey.address, 0)
    ],
    cfAddr
  );
  expect(response.status).toEqual(cf.legacy.node.ResponseStatus.COMPLETED);
  // validate responseSinkA
  validateUninstalledAndFreeBalance(
    multisigAddr,
    cfAddr,
    responseSinkA,
    responseSinkB,
    amountA,
    amountB
  );
  // validate responseSinkB
  validateUninstalledAndFreeBalance(
    multisigAddr,
    cfAddr,
    responseSinkB,
    responseSinkA,
    amountB,
    amountA
  );
}

function startInstallBalanceRefundMsg(
  multisigAddr: string,
  from: string,
  to: string,
  threshold: ethers.utils.BigNumber
): cf.legacy.app.InstallData {
  let peerA = from;
  let peerB = to;
  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
  }
  const terms = new cf.legacy.app.Terms(
    0,
    ethers.utils.bigNumberify(10),
    ethers.constants.AddressZero
  ); // todo

  const app = new cf.legacy.app.AppInterface(
    "0x0",
    "0x00000000",
    "0x00000000",
    "0x00000000",
    "0x00000000",
    ""
  ); // todo
  const timeout = 100;
  return {
    terms,
    app,
    timeout,
    peerA: new cf.legacy.utils.PeerBalance(peerA, 0),
    peerB: new cf.legacy.utils.PeerBalance(peerB, 0),
    keyA: peerA,
    keyB: peerB,
    encodedAppState: "0x1234"
  };
}

function validateInstalledBalanceRefund(
  multisigAddr: string,
  wallet: TestResponseSink,
  amount: ethers.utils.BigNumber
) {
  const appRegistry =
    wallet.instructionExecutor.node.channelStates[multisigAddr];
  const appInstances = appRegistry.appInstances;
  const cfAddrs = Object.keys(appInstances);
  expect(cfAddrs.length).toEqual(1);

  const cfAddr = cfAddrs[0];

  expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(0);
  expect(appInstances[cfAddr].peerA.address).toEqual(
    appRegistry.freeBalance.alice
  );
  expect(appInstances[cfAddr].peerA.balance.toNumber()).toEqual(0);

  expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(0);
  expect(appInstances[cfAddr].peerB.address).toEqual(
    appRegistry.freeBalance.bob
  );
  expect(appInstances[cfAddr].peerB.balance.toNumber()).toEqual(0);

  return cfAddr;
}

/**
 * Validates the correctness of responseSinkA's free balance *not* responseSinkB's.
 */
function validateUninstalledAndFreeBalance(
  multisigAddr: string,
  cfAddr: string,
  responseSinkA: TestResponseSink,
  responseSinkB: TestResponseSink,
  amountAgiven: ethers.utils.BigNumber,
  amountBgiven: ethers.utils.BigNumber
) {
  // TODO: add nonce and uniqueId params and check them
  // https://github.com/counterfactual/monorepo/issues/111
  const state = responseSinkA.instructionExecutor.node;

  let peerA = responseSinkA.signingKey.address;
  let peerB = responseSinkB.signingKey.address;

  let amountA = amountAgiven;
  let amountB = amountBgiven;

  if (peerB.localeCompare(peerA) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel =
    responseSinkA.instructionExecutor.node.channelStates[multisigAddr];
  const app = channel.appInstances[cfAddr];

  expect(Object.keys(state.channelStates).length).toEqual(1);
  expect(channel.counterParty).toEqual(responseSinkB.signingKey.address);
  expect(channel.me).toEqual(responseSinkA.signingKey.address);
  expect(channel.multisigAddress).toEqual(multisigAddr);
  expect(channel.freeBalance.alice).toEqual(peerA);
  expect(channel.freeBalance.bob).toEqual(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toEqual(
    amountA.toNumber()
  );
  expect(channel.freeBalance.bobBalance.toNumber()).toEqual(amountB.toNumber());

  expect(app.dependencyNonce.nonceValue).toEqual(1);
}
