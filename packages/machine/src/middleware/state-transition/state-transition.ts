import { Instruction } from "../../instructions";
import { getFirstResult } from "../../middleware/middleware";
import { CfState, Context } from "../../state";
import { InternalMessage, StateProposal } from "../../types";
import { ProposerActions } from "./proposer-actions";

export class StateTransition {
  /**
   * The proposed state transitions do not complete a state update. They give
   * a "proposed" state update that should not be enacted until both
   * STATE_TRANSITION_COMMIT instructions have been executed.
   */
  public static propose(
    message: InternalMessage,
    next: Function,
    context: Context,
    cfState: CfState
  ): StateProposal {
    const proposer = ProposerActions[message.actionName];

    if (!proposer) {
      throw Error("Action name not supported");
    }

    return proposer.propose(message, context, cfState);
  }

  public static commit(
    message: InternalMessage,
    next: Function,
    context: Context,
    cfState: CfState
  ) {
    const newState = getFirstResult(
      Instruction.STATE_TRANSITION_PROPOSE,
      context.results
    );
    context.vm.mutateState(newState.value.state);
    next();
  }
}
