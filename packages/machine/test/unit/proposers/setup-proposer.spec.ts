import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { SetupProposer } from "../../../src/middleware/state-transition/setup-proposer";
import { Opcode } from "../../../src/opcodes";
import { InternalMessage, StateProposal } from "../../../src/types";

import {
  A_ADDRESS,
  B_ADDRESS,
  UNUSED_FUNDED_ACCOUNT
} from "../../test-helpers/environment";

const { Zero } = ethers.constants;

describe("SetupProposer", () => {
  let proposal: StateProposal;

  beforeAll(() => {
    const message = new InternalMessage(
      legacy.node.ActionName.SETUP,
      Opcode.STATE_TRANSITION_PROPOSE,
      {
        appInstanceId: "0",
        action: legacy.node.ActionName.SETUP,
        data: {},
        multisigAddress: UNUSED_FUNDED_ACCOUNT,
        fromAddress: A_ADDRESS,
        toAddress: B_ADDRESS,
        seq: 0
      }
    );

    proposal = SetupProposer.propose(message);
  });

  it("should return an object with one key, the multisig address", () => {
    const { state } = proposal;
    expect(Object.keys(state).length).toEqual(1);
    expect(Object.keys(state)[0]).toBe(UNUSED_FUNDED_ACCOUNT);
  });

  describe("the generated proposed state", () => {
    let counterParty: string;
    let me: string;
    let multisigAddress: string;
    let appInstances: legacy.app.AppInstanceInfos;
    let freeBalance: legacy.utils.FreeBalance;

    beforeAll(() => {
      const info = proposal.state[UNUSED_FUNDED_ACCOUNT];
      counterParty = info.counterParty;
      me = info.me;
      multisigAddress = info.multisigAddress;
      appInstances = info.appInstances;
      freeBalance = info.freeBalance;
    });

    it("should be between me and the chosen counterparty ", () => {
      expect(me).toBe(A_ADDRESS);
      expect(counterParty).toBe(B_ADDRESS);
    });

    it("should not have any open apps", () => {
      expect(Object.keys(appInstances).length).toBe(0);
    });

    it("should start with me and my counterparty at 0 ETH balances", () => {
      expect(freeBalance.balanceOfAddress(A_ADDRESS)).toEqual(Zero);
      expect(freeBalance.balanceOfAddress(B_ADDRESS)).toEqual(Zero);
    });

    it("should have a local nonce of 0 for the created free balance", () => {
      expect(freeBalance.localNonce).toBe(0);
    });

    // TODO: Figure out what this is
    it("should have a uniqueId 0???", () => {
      expect(freeBalance.uniqueId).toBe(0);
    });

    it("should use dependency nonce of salt 0 (since it is the first app)", () => {
      const expectedSalt = ethers.utils.solidityKeccak256(["uint256"], [0]);
      expect(freeBalance.dependencyNonce.salt).toBe(expectedSalt);
    });

    it("should be installed (have dependency nonce _value_ of 0)", () => {
      expect(freeBalance.dependencyNonce.nonceValue).toBe(0);
    });

    it("should include the multisig address in the returned proposed state", () => {
      expect(multisigAddress).toBe(UNUSED_FUNDED_ACCOUNT);
    });
  });
});
