import { createProviderConsumer } from "@stencil/state-tunnel";

import { GameState, HighRollerAppState } from "./game-types";

export type HighRollerUIMutableState = {
  myRoll: number[];
  opponentRoll: number[];
  myScore: number;
  opponentScore: number;
  gameState: GameState;
  highRollerState: HighRollerAppState;
};

export type HighRollerUIState = HighRollerUIMutableState & {
  updateUIState: (state: HighRollerUIMutableState) => void;
  highRoller: (
    num1: number,
    num2: number
  ) => { myRoll: number[]; opponentRoll: number[] };
  generateRandomRoll: () => number[];
};

export default createProviderConsumer<HighRollerUIState>(
  {
    myRoll: [0, 0],
    opponentRoll: [0, 0],
    myScore: 0,
    opponentScore: 0,
    gameState: GameState.Play,
    updateUIState: () => {},
    highRoller: () => ({ myRoll: [0, 0], opponentRoll: [0, 0] }),
    generateRandomRoll: () => [0, 0],
    highRollerState: {} as HighRollerAppState
  } as HighRollerUIState,
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
