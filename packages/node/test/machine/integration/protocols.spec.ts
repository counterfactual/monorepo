import AppWithAction from "@counterfactual/contracts/build/AppWithAction.json";
import { NetworkContext, OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { bigNumberify } from "ethers/utils";

import {
  AppInstanceProtocolContext,
  DirectChannelProtocolContext,
  VirtualChannelProtocolContext,
  xkeyKthAddress
} from "../../../src/machine";
import { sortAddresses } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { MessageRouter } from "./message-router";
import { MiniNode } from "./mininode";

let network: NetworkContext;
let provider: JsonRpcProvider;
let wallet: Wallet;
let appDefinition: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  [provider, wallet, {}] = await connectToGanache();
  network = global["networkContext"];

  appDefinition = await new ContractFactory(
    AppWithAction.abi,
    AppWithAction.bytecode,
    wallet
  ).deploy();
});

describe("Three mininodes", () => {
  it("Can run all the protocols", async () => {
    const mininodeA = new MiniNode(network, provider);
    const mininodeB = new MiniNode(network, provider);
    const mininodeC = new MiniNode(network, provider);

    const mr = new MessageRouter([mininodeA, mininodeB, mininodeC]);

    let cAB: StateChannel;

    cAB = ((await mininodeA.ie.runSetupProtocol({
      initiatingXpub: mininodeA.xpub,
      respondingXpub: mininodeB.xpub,
      multisigAddress: AddressZero
    })) as DirectChannelProtocolContext).stateChannel;

    mininodeA.scm = mininodeA.scm.set(cAB.multisigAddress, cAB);

    // todo: if nodeB/nodeC is still busy doing stuff, we should wait for it

    mr.assertNoPending();

    const signingKeys = sortAddresses([
      xkeyKthAddress(mininodeA.xpub, 1),
      xkeyKthAddress(mininodeB.xpub, 1)
    ]);

    cAB = ((await mininodeA.ie.runInstallProtocol(cAB, {
      signingKeys,
      initiatingXpub: mininodeA.xpub,
      respondingXpub: mininodeB.xpub,
      multisigAddress: AddressZero,
      initiatingBalanceDecrement: Zero,
      respondingBalanceDecrement: Zero,
      initialState: {
        player1: AddressZero,
        player2: AddressZero,
        counter: 0
      },
      appInterface: {
        addr: appDefinition.address,
        stateEncoding:
          "tuple(address player1, address player2, uint256 counter)",
        actionEncoding: "tuple(uint256 increment)"
      },
      defaultTimeout: 40,
      outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
    })) as DirectChannelProtocolContext).stateChannel;

    mininodeA.scm = mininodeA.scm.set(cAB.multisigAddress, cAB);

    const appInstances = mininodeA.scm.get(AddressZero)!.appInstances;

    const [key] = [...appInstances.keys()].filter(key => {
      return key !== mininodeA.scm.get(AddressZero)!.freeBalance.identityHash;
    });

    cAB = ((await mininodeA.ie.runUninstallProtocol(
      mininodeA.scm.get(cAB.multisigAddress)!,
      {
        appIdentityHash: key,
        initiatingXpub: mininodeA.xpub,
        respondingXpub: mininodeB.xpub,
        multisigAddress: AddressZero
      }
    )) as DirectChannelProtocolContext).stateChannel;

    mininodeA.scm = mininodeA.scm.set(cAB.multisigAddress, cAB);

    mr.assertNoPending();

    const addressOne = "0x0000000000000000000000000000000000000001";

    let cBC: StateChannel;

    cBC = ((await mininodeB.ie.runSetupProtocol({
      initiatingXpub: mininodeB.xpub,
      respondingXpub: mininodeC.xpub,
      multisigAddress: addressOne
    })) as DirectChannelProtocolContext).stateChannel;

    mininodeB.scm = mininodeB.scm.set(cBC.multisigAddress, cBC);

    mr.assertNoPending();

    expect(mininodeA.scm.size).toBe(1);
    expect(mininodeB.scm.size).toBe(2);
    expect(mininodeC.scm.size).toBe(1);

    const ret = (await mininodeA.ie.runInstallVirtualAppProtocol(
      mininodeA.scm.get(cAB.multisigAddress)!,
      undefined,
      {
        initiatingXpub: mininodeA.xpub,
        intermediaryXpub: mininodeB.xpub,
        respondingXpub: mininodeC.xpub,
        defaultTimeout: 100,
        appInterface: {
          addr: appDefinition.address,
          stateEncoding:
            "tuple(address player1, address player2, uint256 counter)",
          actionEncoding: "tuple(uint256 increment)"
        },
        initialState: {
          player1: AddressZero,
          player2: AddressZero,
          counter: 0
        },
        initiatingBalanceDecrement: bigNumberify(0),
        respondingBalanceDecrement: bigNumberify(0)
      }
    )) as VirtualChannelProtocolContext;

    cAB = ret.stateChannelWithIntermediary;
    const cAC = ret.stateChannelWithCounterparty;

    mininodeA.scm = mininodeA.scm
      .set(cAB.multisigAddress, cAB)
      .set(cAC.multisigAddress, cAC);

    mr.assertNoPending();

    expect(mininodeA.scm.size).toBe(2);

    const [virtualKey] = [...mininodeA.scm.keys()].filter(key => {
      return key !== AddressZero;
    });

    const [appInstance] = [
      ...mininodeA.scm.get(virtualKey)!.appInstances.values()
    ];

    expect(appInstance.isVirtualApp);

    let vApp: AppInstance;

    vApp = ((await mininodeA.ie.runUpdateProtocol(appInstance, {
      initiatingXpub: mininodeA.xpub,
      respondingXpub: mininodeC.xpub,
      multisigAddress: virtualKey,
      appIdentityHash: appInstance.identityHash,
      newState: {
        player1: AddressZero,
        player2: AddressZero,
        counter: 1
      }
    })) as AppInstanceProtocolContext).appInstance;

    mininodeA.scm = mininodeA.scm.set(
      virtualKey,
      mininodeA.scm.get(virtualKey)!.setState(vApp.identityHash, vApp.state)
    );

    mr.assertNoPending();

    vApp = ((await mininodeA.ie.runTakeActionProtocol(vApp, {
      initiatingXpub: mininodeA.xpub,
      respondingXpub: mininodeC.xpub,
      multisigAddress: virtualKey,
      appIdentityHash: vApp.identityHash,
      action: {
        increment: 1
      }
    })) as AppInstanceProtocolContext).appInstance;

    mininodeA.scm = mininodeA.scm.set(
      virtualKey,
      mininodeA.scm.get(virtualKey)!.setState(vApp.identityHash, vApp.state)
    );

    mr.assertNoPending();

    await mininodeA.ie.runUninstallVirtualAppProtocol(
      mininodeA.scm.get(cAB.multisigAddress)!,
      mininodeA.scm.get(cAC.multisigAddress)!,
      {
        initiatingXpub: mininodeA.xpub,
        intermediaryXpub: mininodeB.xpub,
        respondingXpub: mininodeC.xpub,
        targetAppIdentityHash: vApp.identityHash,
        targetAppState: vApp.state
      }
    );
  });
});
