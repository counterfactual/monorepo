import { createProviderConsumer } from "@stencil/state-tunnel";

import { GameState, HighRollerAppState } from "./game-types";
import { HighRollerUIState } from "./types";

export default createProviderConsumer<HighRollerUIState>(
  {
    myRoll: [0, 0],
    opponentRoll: [0, 0],
    myScore: 0,
    opponentScore: 0,
    gameState: GameState.Play,
    updateUIState: () => {},
    highRoller: async () => ({ myRoll: [0, 0], opponentRoll: [0, 0] }),
    generateRandomRoll: () => [0, 0],
    highRollerState: {} as HighRollerAppState
  } as HighRollerUIState,
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
