import { ChannelMsgIo } from "../protocols/types";

export abstract class ChannelMsgIoProvider {
	abstract makeIo(
		protocolId: string,
		fromAddr: string,
		toAddr: string
	): ChannelMsgIo;
}

export enum ProtocolFlag {
	SETUP = 1 << 0,
	CREATE = 1 << 1,
	INSTALL = 1 << 2,
	UNINSTALL = 1 << 3,
	UPDATE = 1 << 4
}
