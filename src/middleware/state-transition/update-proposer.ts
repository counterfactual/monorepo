import { InternalMessage, getFirstResult } from "../../vm";
import { CfState, Context } from "../../state";
import { Address, H256, UpdateData } from "../../types";

export class UpdateProposer {
	static propose(message: InternalMessage, context: Context, state: CfState) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfos();

		let appId: H256 = message.clientMessage.appId;
		let updateData: UpdateData = message.clientMessage.data;

		let app = channels[multisig].appChannels[appId];
		app.appStateHash = updateData.appStateHash;
		app.encodedState = updateData.encodedAppState;
		app.localNonce += 1;

		return channels;
	}
}
