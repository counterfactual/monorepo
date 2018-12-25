import { Contract } from "ethers";
import { AddressZero } from "ethers/constants";
import {
  BigNumber,
  defaultAbiCoder,
  parseEther,
  solidityKeccak256
} from "ethers/utils";

import {
  AbstractContract,
  AssetType,
  buildArtifacts,
  expect,
  TransferTerms,
  TransferTransaction
} from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

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
  // TODO Is it correct that Stage is of type uint here? Using Stage or enum didn't work
  return defaultAbiCoder.decode(
    [
      "tuple(address[2] playerAddrs, uint stage, bytes32 salt, bytes32 commitHash, uint256 playerFirstNumber, uint256 playerSecondNumber)"
    ],
    encodedAppState
  )[0];
}

// Default value instead of null Bytes32
const nullValueBytes32 =
  "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";

contract("HighRollerApp", (accounts: string[]) => {
  let highRollerApp: Contract;

  // @ts-ignore
  before(async () => {
    const staticCall = buildArtifacts.StaticCall;
    const highRollerContract = await AbstractContract.fromArtifactName(
      "HighRollerApp",
      {
        StaticCall: staticCall
      }
    );
    highRollerApp = await highRollerContract.deploy(unlockedAccount);
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
      expect(state.stage).to.be.eql(new BigNumber(1));
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
      expect(state.stage).to.be.eql(new BigNumber(2));
      expect(state.commitHash).to.be.eql(hash);
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
      expect(state.stage).to.be.eql(new BigNumber(3));
      expect(state.playerSecondNumber).to.be.eql(new BigNumber(2));
    });
    it("can end game", async () => {
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

      const terms: TransferTerms = {
        assetType: AssetType.ETH,
        limit: parseEther("2"),
        token: AddressZero
      };
      const transaction: TransferTransaction = await highRollerApp.functions.resolve(
        preState,
        terms
      );

      expect(transaction.limit).to.be.eql(new BigNumber(3));
    });
  });
});
