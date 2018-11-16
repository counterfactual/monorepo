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
    channel: cf.legacy.channel.StateChannelInfo,
    network: cf.legacy.network.NetworkContext
  ): StateProposal {
    const proposer = PROPOSER_ACTIONS[message.actionName];

    if (!proposer) {
      throw Error("Action name not supported");
    }

    const proposal = proposer.propose(message, context, channel, network);
    return proposal;
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

    context.instructionExecutor.mutateState(newState.value.channel);
    next();
  }
}
