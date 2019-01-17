import { AssetType, Terms, Transaction } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { defaultAbiCoder, parseEther, solidityKeccak256 } from "ethers/utils";

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
  DONE
}

type HighRollerAppState = {
  playerAddrs: string[];
  stage: HighRollerStage;
  salt: string;
  commitHash: string;
  playerFirstNumber: number;
  playerSecondNumber: number;
};

enum ActionType {
  START_GAME,
  COMMIT_TO_HASH,
  COMMIT_TO_NUM
}

type Action = {
  actionType: ActionType;
  number: number;
  actionHash: string;
};

function decodeAppState(encodedAppState: string): HighRollerAppState {
  return defaultAbiCoder.decode(
    [
      `tuple(
        address[2] playerAddrs,
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

// Default value instead of null Bytes32
const nullValueBytes32 =
  "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";

describe("HighRollerApp", () => {
  let highRollerApp: Contract;

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    highRollerApp = await waffle.deployContract(wallet, HighRollerApp);
  });

  describe("applyAction", () => {
    it("can start game", async () => {
      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.PRE_GAME,
        salt: nullValueBytes32,
        commitHash: nullValueBytes32,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      };

      const action: Action = {
        actionType: ActionType.START_GAME,
        number: 0,
        actionHash: nullValueBytes32
      };
      const ret = await highRollerApp.functions.applyAction(preState, action);

      const state = decodeAppState(ret);
      expect(state.stage).to.eq(1);
    });

    it("can commit to hash", async () => {
      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.COMMITTING_HASH,
        salt: nullValueBytes32,
        commitHash: nullValueBytes32,
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
      const ret = await highRollerApp.functions.applyAction(preState, action);

      const state = decodeAppState(ret);
      expect(state.stage).to.eq(2);
      expect(state.commitHash).to.eq(hash);
    });

    it("can commit to num", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.COMMITTING_NUM,
        salt: nullValueBytes32,
        commitHash: hash,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      };

      const action: Action = {
        actionType: ActionType.COMMIT_TO_NUM,
        number: 2,
        actionHash: nullValueBytes32
      };
      const ret = await highRollerApp.functions.applyAction(preState, action);

      const state = decodeAppState(ret);
      expect(state.stage).to.eq(3);
      expect(state.playerSecondNumber).to.eq(2);
    });

    it("can end game - playerSecond wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 1;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 1,
        playerSecondNumber: 2
      };

      const terms: Terms = {
        assetType: AssetType.ETH,
        limit: parseEther("2"),
        token: AddressZero
      };
      const transaction: Transaction = await highRollerApp.functions.resolve(
        preState,
        terms
      );

      expect(transaction.assetType).to.eq(AssetType.ETH);
      expect(transaction.token).to.eq(AddressZero);
      expect(transaction.to).to.deep.eq([AddressZero, AddressZero]);
      expect(transaction.value[0]).to.eq(Zero);
      expect(transaction.value[1]).to.eq(parseEther("2"));
      expect(transaction.data).to.deep.eq(["0x", "0x"]);
    });

    /**
     * IMPORTANT: The numbers 75 and 45 were calculated by brute-force
     * computing getWinningAmounts with some numbersless than 100
     * until getting back a result where both players tie.
     */
    it("can end game - draw", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 75;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 75,
        playerSecondNumber: 45
      };

      const terms: Terms = {
        assetType: AssetType.ETH,
        limit: parseEther("2"),
        token: AddressZero
      };
      const transaction: Transaction = await highRollerApp.functions.resolve(
        preState,
        terms
      );

      expect(transaction.assetType).to.eq(AssetType.ETH);
      expect(transaction.token).to.eq(AddressZero);
      expect(transaction.to).to.deep.eq([AddressZero, AddressZero]);
      expect(transaction.value[0]).to.eq(parseEther("1"));
      expect(transaction.value[1]).to.eq(parseEther("1"));
      expect(transaction.data).to.deep.eq(["0x", "0x"]);
    });

    it("can end game - playerFirst wins", async () => {
      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = 3;
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const preState: HighRollerAppState = {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.DONE,
        salt: numberSalt,
        commitHash: hash,
        playerFirstNumber: 3,
        playerSecondNumber: 2
      };

      const terms: Terms = {
        assetType: AssetType.ETH,
        limit: parseEther("2"),
        token: AddressZero
      };
      const transaction: Transaction = await highRollerApp.functions.resolve(
        preState,
        terms
      );

      expect(transaction.assetType).to.eq(AssetType.ETH);
      expect(transaction.token).to.eq(AddressZero);
      expect(transaction.to).to.deep.equal([AddressZero, AddressZero]);
      expect(transaction.value[0]).to.eq(parseEther("2"));
      expect(transaction.value[1]).to.eq(Zero);
      expect(transaction.data).to.deep.equal(["0x", "0x"]);
    });
  });
});
