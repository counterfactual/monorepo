import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { Opcode } from "../../instructions";
import { getFirstResult } from "../../middleware/middleware";
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
    channel: cf.legacy.channel.StateChannelInfo
  ): StateProposal {
    const proposer = PROPOSER_ACTIONS[message.actionName];

    if (!proposer) {
      throw Error("Action name not supported");
    }

    return proposer.propose(message, context, channel);
  }

  public static commit(
    message: InternalMessage,
    next: Function,
    context: Context,
    channel: cf.legacy.channel.StateChannelInfo
  ) {
    const newState = getFirstResult(
      Opcode.STATE_TRANSITION_PROPOSE,
      context.results
    );

    console.log("state transition committing");
    console.log(newState);
    context.instructionExecutor.mutateState(newState.value.channel);
    next();
  }
}
