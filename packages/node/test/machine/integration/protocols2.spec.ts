import UnidirectionalTransferApp from "@counterfactual/apps/build/UnidirectionalTransferApp.json";
import { NetworkContext, OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { Zero } from "ethers/constants";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";

import { Protocol, xkeyKthAddress } from "../../../src/machine";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/models/free-balance";
import { getCreate2MultisigAddress } from "../../../src/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { MessageRouter } from "./message-router";
import { MiniNode } from "./mininode";

let network: NetworkContext;
let provider: JsonRpcProvider;
let wallet: Wallet;
let unidirectionalTransferApp: Contract;

expect.extend({ toBeEq });

// enum ActionType {
//   SUBMIT_COUNTER_INCREMENT,
//   ACCEPT_INCREMENT
// }

beforeAll(async () => {
  [provider, wallet, {}] = await connectToGanache();
  network = global["networkContext"];

  unidirectionalTransferApp = await new ContractFactory(
    UnidirectionalTransferApp.abi,
    UnidirectionalTransferApp.bytecode,
    wallet
  ).deploy();
});

describe("Three mininodes", () => {
  it("Can run all the protocols", async () => {
    const mininodeA = new MiniNode(network, provider);
    const mininodeB = new MiniNode(network, provider);
    const mininodeC = new MiniNode(network, provider);

    const multisigAB = getCreate2MultisigAddress(
      [mininodeA.xpub, mininodeB.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    const multisigBC = getCreate2MultisigAddress(
      [mininodeB.xpub, mininodeC.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    const mr = new MessageRouter([mininodeA, mininodeB, mininodeC]);

    mininodeA.scm = await mininodeA.ie.runSetupProtocol({
      initiatorXpub: mininodeA.xpub,
      responderXpub: mininodeB.xpub,
      multisigAddress: multisigAB
    });

    await mr.waitForAllPendingPromises();

    // const signingKeys = sortAddresses([
    //   xkeyKthAddress(mininodeA.xpub, 1),
    //   xkeyKthAddress(mininodeB.xpub, 1)
    // ]);

    const appState = {
      stage: 0, // POST_FUND
      finalized: false,
      transfers: [
        [xkeyKthAddress(mininodeA.xpub, 0), Zero],
        [xkeyKthAddress(mininodeC.xpub, 0), Zero]
      ],
      turnNum: 0
    };

    const appInterface = {
      addr: unidirectionalTransferApp.address,
      stateEncoding: `tuple(
          uint8 stage,
          tuple(
            address to,
            uint256 amount
          )[2] transfers,
          uint256 turnNum,
          bool finalized
        )`,
      actionEncoding: "tuple(uint8 actionType, uint256 amount)"
    };

    await mr.waitForAllPendingPromises();

    mininodeB.scm.set(
      multisigBC,
      (await mininodeB.ie.runSetupProtocol({
        initiatorXpub: mininodeB.xpub,
        responderXpub: mininodeC.xpub,
        multisigAddress: multisigBC
      })).get(multisigBC)!
    );

    await mr.waitForAllPendingPromises();

    expect(mininodeA.scm.size).toBe(1);
    expect(mininodeB.scm.size).toBe(2);
    expect(mininodeC.scm.size).toBe(1);

    await mininodeA.ie.initiateProtocol(
      Protocol.InstallVirtualApp,
      mininodeA.scm,
      {
        appInterface,
        initiatorXpub: mininodeA.xpub,
        intermediaryXpub: mininodeB.xpub,
        responderXpub: mininodeC.xpub,
        defaultTimeout: 100,
        initialState: appState,
        initiatorBalanceDecrement: Zero,
        responderBalanceDecrement: Zero,
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        outcomeType: OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER
      }
    );

    const multisigAC = getCreate2MultisigAddress(
      [mininodeA.xpub, mininodeC.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    const [appInstance] = [
      ...mininodeA.scm.get(multisigAC)!.appInstances.values()
    ];

    expect(appInstance.isVirtualApp);

    await mininodeA.ie.initiateProtocol(
      Protocol.UninstallVirtualApp,
      mininodeA.scm,
      {
        initiatorXpub: mininodeA.xpub,
        intermediaryXpub: mininodeB.xpub,
        responderXpub: mininodeC.xpub,
        targetAppIdentityHash: appInstance.identityHash,
        targetOutcome: await appInstance.computeOutcome(
          appState,
          unidirectionalTransferApp.provider as BaseProvider
        )
      }
    );
  });
});
