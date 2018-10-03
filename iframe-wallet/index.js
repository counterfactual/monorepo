const wallet = new wa.TestWallet();
const listeners = [];

let ethmoContract;
let multisigContract;
let nonceRegistry;

window.addEventListener("message", event => {
  if (event.data.type === "cf:init") {
    injectScript(event);
  }
});

async function getSourceCode (id) {
  const response = await fetch(document.getElementById(`${id}_src`).src);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let file = "";
  let done = false;

  while (!done) {
    const segment = await reader.read();
    file += decoder.decode(segment.value);
    done = segment.done;
  }

  return file.replace(`var ${id} =`, `window.${id} =`);
};

async function injectScript (event) {
  const injectedScript = `${await getSourceCode("ci")};`;

  event.source.postMessage(
    { type: "cf:init-reply", source: injectedScript },
    "*"
  );
};

function sendMessageToChild(msg) {
  document.querySelectorAll("iframe").forEach(el => {
    el.contentWindow.postMessage(msg, "*");
  });
}

async function pickUser(pkey) {
  // TODO: Figure out a way to access process.env within rollup and use `test/constants.ts`
  // currently can't rollup envvars: https://github.com/calvinmetcalf/rollup-plugin-node-globals/issues/7
  const key = new ethers.Wallet(pkey).address;

  wallet.setUser(key, pkey);

  await wallet.initUser(key);

  wallet.onMessage(msg => {
    const message = {
      type: "cf:io-send",
      data: msg
    };
    sendMessageToChild(message);
  });

  wallet.onResponse(message => {
    console.log("onResponse", message);
    sendMessageToChild(message);
  });

  listeners.forEach(listener =>
    window.removeEventListener("message", listener)
  );

  const listener = event => {
    if (event.data.type === "cf:default") {
      wallet.receiveMessageFromClient(event.data);
    }
  };

  listeners.push(listener);

  window.addEventListener("message", listener);

  sendMessageToChild({ type: "cf:user-picked", key, pkey });
}

function getApps() {
  const openChannelAddress = Object.keys(
    wallet.currentUser.vm.cfState.channelStates
  )[0];
  return wallet.currentUser.vm.cfState.channelStates[openChannelAddress]
    .appChannels;
}

function getStateChannels() {
  return wallet.currentUser.vm.cfState.channelStates;
}

async function deployFreeBalanceStateChannel() {
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  const contract = await deployFreeBalanceContract(
    wallet.defaultNetwork(),
    stateChannel,
    wallet.currentUser.ethersWallet
  );
  console.log(`📄 FreeBalance contract deployed: ${contract.address}`);
}

async function deployEthmoStateChannel() {
  const apps = getApps();
  const ethmoApplication = Object.values(apps)[0];
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  ethmoContract = await deployApplicationStateChannel(
    wallet.defaultNetwork(),
    stateChannel,
    ethmoApplication,
    wallet.currentUser.ethersWallet
  );
  console.log(`📄 Ethmo contract deployed: ${ethmoContract.address}`);
  return ethmoContract;
}

async function submitLatestStateForEthmo() {
  const apps = getApps();
  const ethmoAppId = Object.keys(apps)[0];

  const setStateTransaction = wallet.currentUser.store.getTransaction(
    ethmoAppId,
    ActionName.UPDATE
  );

  const res = wallet.currentUser.ethersWallet.sendTransaction({
    ...setStateTransaction,
    gasLimit: GAS_LIMITS.SET_STATE_COMMITMENT
  });

  console.log(
    `📝 State sent to contract: tx=${(await res.wait()).transactionHash}`
  );
}

async function mine() {
  const ethmoState = await ethmoContract.state();
  const finalizationBlockerNumber = ethmoState.finalizesAt.toString();
  const currentBlockNumber = await wallet.currentUser.ethersWallet.provider.getBlockNumber();
  for (
    let blockCount = 0;
    blockCount < finalizationBlockerNumber - currentBlockNumber;
    blockCount++
  ) {
    await wallet.currentUser.ethersWallet.provider.send("evm_mine", []);
  }
  console.log(`⌛️ Waited for timeout`);
}

async function setResolution() {
  const apps = getApps();
  const ethmoApplication = Object.values(apps)[0];
  const { cfApp: app, terms, encodedState } = ethmoApplication;
  const appData = [
    app.address,
    app.applyAction,
    app.resolve,
    app.getTurnTaker,
    app.isStateTerminal
  ];
  const termsData = ethers.utils.defaultAbiCoder.encode(
    ["bytes1", "uint8", "uint256", "address"],
    ["0x19", terms.assetType, terms.limit, terms.token]
  );
  await ethmoContract.setResolution(appData, encodedState, termsData);
  console.log(`✅ State channel resolved`);
}

async function everythingUptoWithdraw() {
  await deployEthmoStateChannel();
  await deployFreeBalanceStateChannel();
  await submitLatestStateForEthmo();
  await mine();
  await setResolution();
}

async function withdraw() {
  const apps = getApps();
  const ethmoAppId = Object.keys(apps)[0];

  const installTransaction = wallet.currentUser.store.getTransaction(
    ethmoAppId,
    ActionName.INSTALL
  );

  const res = wallet.currentUser.ethersWallet.sendTransaction({
    ...installTransaction,
    gasLimit: GAS_LIMITS.INSTALL_COMMITMENT
  });

  console.log(`💸 Money withdrawn: ${(await res.wait()).transactionHash}`);
}

const GAS_LIMITS = {
  DEPLOY_APP_INSTANCE: 4e6,
  SET_STATE_COMMITMENT: 0.5e6,
  INSTALL_COMMITMENT: 0.5e6
};

function deployFreeBalanceContract (networkContext, stateChannel, wallet) {
  const signingKeys = [
    stateChannel.freeBalance.alice,
    stateChannel.freeBalance.bob
  ];
  const salt = 0;
  const app = CfFreeBalance.contractInterface(networkContext);
  const terms = CfFreeBalance.terms();
  const timeout = 100;
  return this.deployAppInstance(
    networkContext,
    stateChannel,
    wallet,
    salt,
    signingKeys,
    app,
    terms,
    timeout
  );
};

async function deployApplicationStateChannel (
  networkContext,
  stateChannel,
  application,
  wallet
) {
  return this.deployAppInstance(
    networkContext,
    stateChannel,
    wallet,
    application.uniqueId,
    [application.peerA.address, application.peerB.address],
    application.cfApp,
    application.terms,
    application.timeout
  );
};

async function deployAppInstance (
  networkContext,
  stateChannel,
  wallet,
  salt,
  signingKeys,
  app,
  terms,
  timeout
) {
  const registry = new ethers.Contract(
    networkContext.Registry,
    Registry.abi,
    wallet
  );
  const initcode = new ethers.Interface(StateChannel.abi).deployFunction.encode(
    this.getStateChannelByteCode(networkContext),
    [
      stateChannel.multisigAddress,
      signingKeys,
      app.hash(),
      terms.hash(),
      timeout
    ]
  );
  await registry.functions.deploy(initcode, salt, {
    gasLimit: ClientInterface.GAS_LIMITS.DEPLOY_APP_INSTANCE
  });
  const cfAddress = ethers.utils.solidityKeccak256(
    ["bytes1", "bytes", "uint256"],
    ["0x19", initcode, salt]
  );

  const address = await registry.functions.resolver(cfAddress);

  return new ethers.Contract(address, StateChannel.abi, wallet);
};

function getStateChannelByteCode (networkContext) {
  StateChannel.bytecode = StateChannel.bytecode.replace(
    /__Signatures_+/g,
    networkContext.Signatures.substr(2)
  );
  StateChannel.bytecode = StateChannel.bytecode.replace(
    /__StaticCall_+/g,
    networkContext.StaticCall.substr(2)
  );
  return StateChannel.bytecode;
};
