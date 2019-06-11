export enum HighRollerStage {
  WAITING_FOR_P1_COMMITMENT,
  P1_COMMITTED_TO_HASH,
  P2_COMMITTED_TO_NUM,
  P1_REVEALED_NUM,
  P1_TRIED_TO_SUBMIT_ZERO
}

export type HighRollerAppState = {
  stage: HighRollerStage;
  salt: string;
  commitHash: string;
  playerFirstNumber: number;
  playerSecondNumber: number;
  turnNum: number;
};

export enum HighRollerActionType {
  COMMIT_TO_HASH,
  COMMIT_TO_NUM,
  REVEAL_NUM
}

export type HighRollerAction = {
  actionType: HighRollerActionType;
  number: number;
  actionHash: string;
};

export enum GameState {
  Play,
  Lost,
  Won,
  Tie
}

export enum PlayerType {
  Black = "black",
  White = "white"
}
