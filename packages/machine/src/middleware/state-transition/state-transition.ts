import { Instruction } from "../../instructions";
import { getFirstResult } from "../../middleware/middleware";
import { CfState, Context } from "../../state";
import { ActionName, InternalMessage, StateProposal } from "../../types";
import { InstallProposer } from "./install-proposer";
import { SetupProposer } from "./setup-proposer";
import { UninstallProposer } from "./uninstall-proposer";
import { UpdateProposer } from "./update-proposer";

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
    if (message.actionName === ActionName.UPDATE) {
      return UpdateProposer.propose(message, context, cfState);
    } else if (message.actionName === ActionName.INSTALL) {
      return InstallProposer.propose(message, context, cfState);
    } else if (message.actionName === ActionName.UNINSTALL) {
      return UninstallProposer.propose(message, context, cfState);
    } else if (message.actionName === ActionName.SETUP) {
      return SetupProposer.propose(message);
    } else {
      throw Error("Action name not supported");
    }
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
