import {
  SolidityABIEncoderV2Type,
  TwoPartyFixedOutcome
} from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { HashZero } from "ethers/constants";
import { defaultAbiCoder, solidityKeccak256 } from "ethers/utils";

import HighRollerApp from "../build/HighRollerApp.json";

chai.use(waffle.solidity);

const { expect } = chai;

/// Returns the commit hash that can be used to commit to chosenNumber
/// using appSalt
function computeCommitHash(appSalt: string, chosenNumber: number) {
  return solidityKeccak256(["bytes32", "uint256"], [appSalt, chosenNumber]);
}

enum HighRollerStage {
  WAITING_FOR_P1_COMMITMENT,
  P1_COMMITTED_TO_HASH,
  P2_COMMITTED_TO_NUM,
  P1_REVEALED_NUM,
  P1_TRIED_TO_SUBMIT_ZERO
}

type HighRollerAppState = {
  stage: HighRollerStage;
  salt: string;
  commitHash: string;
  playerFirstNumber: number;
  playerSecondNumber: number;
  versionNumber: number;
};

enum HighRollerActionType {
  COMMIT_TO_HASH,
  COMMIT_TO_NUM,
  REVEAL_NUM
}

type HighRollerAction = {
  actionType: HighRollerActionType;
  number: number;
  actionHash: string;
};

const rlpAppStateEncoding = `
  tuple(
    uint8 stage,
    bytes32 salt,
    bytes32 commitHash,
    uint256 playerFirstNumber,
    uint256 playerSecondNumber,
    uint256 versionNumber
  )
`;

const rlpActionEncoding = `
  tuple(
    uint8 actionType,
    uint256 number,
    bytes32 actionHash,
  )
`;

function decodeBytesToAppState(encodedAppState: string): HighRollerAppState {
  return defaultAbiCoder.decode([rlpAppStateEncoding], encodedAppState)[0];
}

function encodeState(state: SolidityABIEncoderV2Type) {
  return defaultAbiCoder.encode([rlpAppStateEncoding], [state]);
}

function encodeAction(state: SolidityABIEncoderV2Type) {
  return defaultAbiCoder.encode([rlpActionEncoding], [state]);
}

describe("HighRollerApp", () => {
  let highRollerApp: Contract;

  async function computeStateTransition(
    state: SolidityABIEncoderV2Type,
    action: SolidityABIEncoderV2Type
  ) {
    return await highRollerApp.functions.applyAction(
      encodeState(state),
      encodeAction(action)
    );
  }

  async function computeOutcome(state: SolidityABIEncoderV2Type) {
    const [decodedResult] = defaultAbiCoder.decode(
      ["uint256"],
      await highRollerApp.functions.computeOutcome(encodeState(state))
    );
    return decodedResult;
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    highRollerApp = await waffle.deployContract(wallet, HighRollerApp);
  });

  describe("normal state transition path", () => {
    it("can commit to hash", async () => {
      const preState: HighRollerAppState = {
        stage: HighRollerStage.WAITING_FOR_P1_COMMITMENT,
        salt: HashZero,
        commitHash: HashZero,
        playerFirstNumber: 0,
        playerSecondNumber: 0,
        versionNumber: 0
      };

      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 1;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const action: HighRollerAction = {
        actionType: HighRollerActionType.COMMIT_TO_HASH,
        number: 0,
        actionHash: hash
      };

      const ret = await computeStateTransition(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.stage).to.eq(HighRollerStage.P1_COMMITTED_TO_HASH);
      expect(state.commitHash).to.eq(hash);
    });

    it("can commit to num", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 1;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_COMMITTED_TO_HASH,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 0,
        versionNumber: 1
      };

      const action: HighRollerAction = {
        actionType: HighRollerActionType.COMMIT_TO_NUM,
        number: 2,
        actionHash: HashZero
      };

      const ret = await computeStateTransition(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.stage).to.eq(HighRollerStage.P2_COMMITTED_TO_NUM);

      expect(state.playerSecondNumber).to.eq(2);
    });

    it("cannot commit to num == 0", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 1;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_COMMITTED_TO_HASH,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 0,
        versionNumber: 1
      };

      const action: HighRollerAction = {
        actionType: HighRollerActionType.COMMIT_TO_NUM,
        number: 0,
        actionHash: HashZero
      };

      await expect(computeStateTransition(preState, action)).to.be.revertedWith(
        "It is considered invalid to use 0 as the number."
      );
    });

    it("can reveal", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 1;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P2_COMMITTED_TO_NUM,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 2,
        versionNumber: 2
      };

      const action: HighRollerAction = {
        actionType: HighRollerActionType.REVEAL_NUM,
        number: playerFirstNumber,
        actionHash: numberSalt
      };

      const ret = await computeStateTransition(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.stage).to.eq(HighRollerStage.P1_REVEALED_NUM);
      expect(state.playerFirstNumber).to.eq(1);
      expect(state.playerSecondNumber).to.eq(2);
      expect(state.salt).to.eq(numberSalt);
    });

    it("can reveal but if reveal 0, you cheated", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 0;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P2_COMMITTED_TO_NUM,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 2,
        versionNumber: 2
      };

      const action: HighRollerAction = {
        actionType: HighRollerActionType.REVEAL_NUM,
        number: playerFirstNumber,
        actionHash: numberSalt
      };

      const ret = await computeStateTransition(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.stage).to.eq(HighRollerStage.P1_TRIED_TO_SUBMIT_ZERO);
    });

    it("can end game - playerSecond wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 1;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_REVEALED_NUM,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 1,
        playerSecondNumber: 2,
        versionNumber: 3
      };

      expect(await computeOutcome(preState)).to.eq(
        TwoPartyFixedOutcome.SEND_TO_ADDR_TWO
      );
    });

    /**
     * IMPORTANT: The numbers 75 and 45 were calculated by brute-force
     * computing getWinningAmounts with some numbers less than 100
     * until getting back a result where both players tie.
     */
    it("can end game - draw", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 75;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_REVEALED_NUM,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 75,
        playerSecondNumber: 45,
        versionNumber: 4
      };

      expect(await computeOutcome(preState)).to.eq(2);
    });

    it("can end game - playerFirst wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 3;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_REVEALED_NUM,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 3,
        playerSecondNumber: 2,
        versionNumber: 5
      };

      expect(await computeOutcome(preState)).to.eq(
        TwoPartyFixedOutcome.SEND_TO_ADDR_ONE
      );
    });

    it("can end game - playerFirst cheated", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";

      const playerFirstNumber = 3;

      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.P1_TRIED_TO_SUBMIT_ZERO,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 2,
        versionNumber: 5
      };

      expect(await computeOutcome(preState)).to.eq(
        TwoPartyFixedOutcome.SEND_TO_ADDR_TWO
      );
    });
  });
});
