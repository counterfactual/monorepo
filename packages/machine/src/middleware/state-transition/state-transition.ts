import { Context } from "../../instruction-executor";
import { Instruction } from "../../instructions";
import { getFirstResult } from "../../middleware/middleware";
import { NodeState } from "../../node-state";
import { InternalMessage, StateProposal } from "../../types";

import { PROPOSER_ACTIONS } from "./proposer-actions";

export class StateTransition {
  /**
   * The proposed state transitions do not complete a state update. They give
   * a "proposed" state update that should not be committed until both
   * STATE_TRANSITION_COMMIT instructions have been executed.
   */
  public static propose(
    message: InternalMessage,
    next: Function,
    context: Context,
    nodeState: NodeState
  ): StateProposal {
    const proposer = PROPOSER_ACTIONS[message.actionName];

    if (!proposer) {
      throw Error("Action name not supported");
    }

    return proposer.propose(message, context, nodeState);
  }

  public static commit(
    message: InternalMessage,
    next: Function,
    context: Context,
    state: NodeState
  ) {
    const newState = getFirstResult(
      Instruction.STATE_TRANSITION_PROPOSE,
      context.results
    );
    context.instructionExecutor.mutateState(newState.value.state);
    next();
  }
}
