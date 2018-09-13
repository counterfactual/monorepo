import { InternalMessage, StateProposal, ActionName } from "../../types";
import { CfState, Context } from "../../state";
import { getFirstResult } from "../../middleware/middleware";
import { Instruction } from "../../instructions";
import { SetupProposer } from "./setup-proposer";
import { InstallProposer } from "./install-proposer";
import { UninstallProposer } from "./uninstall-proposer";
import { UpdateProposer } from "./update-proposer";

export class StateTransition {
	/**
	 * The proposed state transitions do not complete a state update. They give
	 * a "proposed" state update that should not be enacted until both
	 * STATE_TRANSITION_COMMIT instructions have been executed.
	 */
	static propose(
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

	static commit(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		let newState = getFirstResult(
			Instruction.STATE_TRANSITION_PROPOSE,
			context.results
		);
		context.vm.mutateState(newState.value.state);
		next();
	}
}
