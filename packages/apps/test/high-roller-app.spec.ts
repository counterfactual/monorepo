import {
  SolidityABIEncoderV2Type,
  TwoPartyOutcome
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
  PRE_GAME,
  COMMITTING_HASH,
  COMMITTING_NUM,
  REVEALING,
  DONE
}

type HighRollerAppState = {
  stage: HighRollerStage;
  salt: string;
  commitHash: string;
  playerFirstNumber: number;
  playerSecondNumber: number;
};

enum ActionType {
  START_GAME,
  COMMIT_TO_HASH,
  COMMIT_TO_NUM,
  REVEAL
}

type Action = {
  actionType: ActionType;
  number: number;
  actionHash: string;
};

function decodeBytesToAppState(encodedAppState: string): HighRollerAppState {
  return defaultAbiCoder.decode(
    [
      `tuple(
        uint8 stage,
        bytes32 salt,
        bytes32 commitHash,
        uint256 playerFirstNumber,
        uint256 playerSecondNumber
      )`
    ],
    encodedAppState
  )[0];
}

describe("HighRollerApp", () => {
  let highRollerApp: Contract;

  function encodeState(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint8 stage,
          bytes32 salt,
          bytes32 commitHash,
          uint256 playerFirstNumber,
          uint256 playerSecondNumber
        )
      `
      ],
      [state]
    );
  }

  function encodeAction(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint8 actionType,
          uint256 number,
          bytes32 actionHash,
        )
      `
      ],
      [state]
    );
  }

  async function applyAction(
    state: SolidityABIEncoderV2Type,
    action: SolidityABIEncoderV2Type
  ) {
    return await highRollerApp.functions.applyAction(
      encodeState(state),
      encodeAction(action)
    );
  }

  async function computeResolution(state: SolidityABIEncoderV2Type) {
    const [decodedResult] = defaultAbiCoder.decode(
      ["uint256"],
      await highRollerApp.functions.resolve(encodeState(state))
    );
    return decodedResult;
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    highRollerApp = await waffle.deployContract(wallet, HighRollerApp);
  });

  describe("applyAction", () => {
    it("can start game", async () => {
      const preState: HighRollerAppState = {
        stage: HighRollerStage.PRE_GAME,
        salt: HashZero,
        commitHash: HashZero,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      };

      const action: Action = {
        actionType: ActionType.START_GAME,
        number: 0,
        actionHash: HashZero
      };
      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);
      expect(state.stage).to.eq(1);
    });

    it("can commit to hash", async () => {
      const preState: HighRollerAppState = {
        stage: HighRollerStage.COMMITTING_HASH,
        salt: HashZero,
        commitHash: HashZero,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      };

      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const action: Action = {
        actionType: ActionType.COMMIT_TO_HASH,
        number: 0,
        actionHash: hash
      };
      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);
      expect(state.stage).to.eq(TwoPartyOutcome.SPLIT_AND_SEND_TO_BOTH_ADDRS);
      expect(state.commitHash).to.eq(hash);
    });

    it("can commit to num", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.COMMITTING_NUM,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      };

      const action: Action = {
        actionType: ActionType.COMMIT_TO_NUM,
        number: 2,
        actionHash: HashZero
      };
      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);
      expect(state.stage).to.eq(3);
      expect(state.playerSecondNumber).to.eq(2);
    });

    it("can reveal", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.REVEALING,
        salt: HashZero,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 2
      };

      const action: Action = {
        actionType: ActionType.REVEAL,
        number: playerFirstNumber,
        actionHash: numberSalt
      };
      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);
      expect(state.stage).to.eq(4);
      expect(state.playerFirstNumber).to.eq(1);
      expect(state.playerSecondNumber).to.eq(2);
      expect(state.salt).to.eq(numberSalt);
    });

    it("can end game - playerSecond wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 1,
        playerSecondNumber: 2
      };

      expect(await computeResolution(preState)).to.eq(
        TwoPartyOutcome.SEND_TO_ADDR_TWO
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
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 75,
        playerSecondNumber: 45
      };

      expect(await computeResolution(preState)).to.eq(2);
    });

    it("can end game - playerFirst wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 3;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 3,
        playerSecondNumber: 2
      };

      expect(await computeResolution(preState)).to.eq(
        TwoPartyOutcome.SEND_TO_ADDR_ONE
      );
    });
  });
});
