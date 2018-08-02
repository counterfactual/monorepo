import { InternalMessage, getFirstResult } from "../../vm";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import { Instruction } from "../../instructions";
import {
	zeroAddress,
	zeroBytes32,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";
import { SetupProposer } from "./setup-proposer";
import { InstallProposer } from "./install-proposer";
import { UninstallProposer } from "./uninstall-proposer";
import { UpdateProposer } from "./update-proposer";

export class StateTransition {
	/**
	 * The proposed state transitions do not complete a state upate. They give
	 * a "proposed" state update that should not be enacted until both
	 * STATE_TRANSITION_PREPARE and STATE_TRANSITION_COMMIT instructions have
	 * been executed.
	 */
	static propose(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		if (message.actionName === "update") {
			return UpdateProposer.propose(message, context, cfState);
		} else if (message.actionName === "install") {
			return InstallProposer.propose(message, context, cfState);
		} else if (message.actionName === "uninstall") {
			return UninstallProposer.propose(message, context, cfState);
		} else if (message.actionName === "setup") {
			return SetupProposer.propose(message, context, cfState);
		} else {
			throw Error("Action name not supported");
		}
	}

	static prepare(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		// todo
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
		context.vm.mutateState(newState.value);
	}
}
