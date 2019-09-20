import AppWithAction from "@counterfactual/cf-adjudicator-contracts/expected-build-artifacts/AppWithAction.json";
import { OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { BaseProvider } from "ethers/providers";
import { bigNumberify } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../../src/constants";
import { Protocol } from "../../../../src/machine";
import { toBeEq } from "../bignumber-jest-matcher";
import { connectToGanache } from "../connect-ganache";

import { TestRunner } from "./test-runner";

let wallet: Wallet;
let appWithAction: Contract;

expect.extend({ toBeEq });

enum ActionType {
  SUBMIT_COUNTER_INCREMENT,
  ACCEPT_INCREMENT
}

beforeAll(async () => {
  [{}, wallet, {}] = await connectToGanache();

  appWithAction = await new ContractFactory(
    AppWithAction.abi,
    AppWithAction.evm.bytecode,
    wallet
  ).deploy();
});

describe("Three mininodes", () => {
  it("Can run all the protocols", async () => {
    const tr = new TestRunner();
    await tr.connectToGanache();

    await tr.setup();

    await tr.mininodeA.engine.initiateProtocol(
      Protocol.InstallVirtualApp,
      tr.mininodeA.scm,
      {
        initiatorXpub: tr.mininodeA.xpub,
        intermediaryXpub: tr.mininodeB.xpub,
        responderXpub: tr.mininodeC.xpub,
        defaultTimeout: 100,
        appInterface: {
          addr: appWithAction.address,
          stateEncoding: "tuple(uint256 counter)",
          actionEncoding: "tuple(uint8 actionType, uint256 increment)"
        },
        initialState: {
          counter: 0
        },
        appSeqNo: 0,
        initiatorBalanceDecrement: bigNumberify(0),
        responderBalanceDecrement: bigNumberify(0),
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
      }
    );

    const [virtualAppInstance] = [
      ...tr.mininodeA.scm.get(tr.multisigAC)!.appInstances.values()
    ];

    expect(virtualAppInstance.isVirtualApp);

    await tr.mininodeA.engine.initiateProtocol(
      Protocol.Update,
      tr.mininodeA.scm,
      {
        initiatorXpub: tr.mininodeA.xpub,
        responderXpub: tr.mininodeC.xpub,
        multisigAddress: tr.multisigAC,
        appIdentityHash: virtualAppInstance.identityHash,
        newState: {
          counter: 1
        }
      }
    );

    await tr.mininodeA.engine.initiateProtocol(
      Protocol.TakeAction,
      tr.mininodeA.scm,
      {
        initiatorXpub: tr.mininodeA.xpub,
        responderXpub: tr.mininodeC.xpub,
        multisigAddress: tr.multisigAC,
        appIdentityHash: virtualAppInstance.identityHash,
        action: {
          actionType: ActionType.SUBMIT_COUNTER_INCREMENT,
          increment: 1
        }
      }
    );

    await tr.mininodeA.engine.initiateProtocol(
      Protocol.UninstallVirtualApp,
      tr.mininodeA.scm,
      {
        initiatorXpub: tr.mininodeA.xpub,
        intermediaryXpub: tr.mininodeB.xpub,
        responderXpub: tr.mininodeC.xpub,
        targetAppIdentityHash: virtualAppInstance.identityHash,
        targetOutcome: await virtualAppInstance.computeOutcome(
          {
            counter: 2
          },
          appWithAction.provider as BaseProvider
        )
      }
    );
  });
});
