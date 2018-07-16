import { ChannelMsg } from "./channel-msg";
import { ChannelMsgIo, ProtocolStore } from "./types";
import { StateChannelContext } from "./state-channel";

export enum CfProtocol {
	SETUP,
	CREATE,
	INSTALL,
	UNINSTALL,
	UPDATE
}

export abstract class Protocol {
	constructor(
		readonly ctx: StateChannelContext,
		readonly io: ChannelMsgIo,
		readonly store: ProtocolStore,
		readonly protocolId: string
	) {}

	/**
	 * @returns the next message to be executed in the protocol.
	 */
	abstract async execute(msg: ChannelMsg): Promise<ChannelMsg>;

	/**
	 * @returns the number of messages in the protocol.
	 */
	abstract messageCount(): number;

	async receiveMsg(msg: ChannelMsg) {
		this.store.putMsg(this.ctx.multisigAddr, this.protocolId, msg);

		const nextMsg = await this.execute(msg);

		return await this.transition(nextMsg);
	}

	async transition(nextMsg: ChannelMsg) {
		if (nextMsg != null) {
			this.io.send(nextMsg);
			this.store.putMsg(this.ctx.multisigAddr, this.protocolId, nextMsg);
		}

		if (nextMsg == null || nextMsg.seqno === this.messageCount() - 1) {
			this.store.close();
		} else {
			let responseMsg = await this.io.receive();
			while (responseMsg.seqno !== nextMsg.seqno + 1) {
				responseMsg = await this.io.receive();
			}
			await this.receiveMsg(responseMsg);
		}
	}
}
