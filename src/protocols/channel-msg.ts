import { Signature } from "./types";
import { CfOperation } from "./cf-operation/cf-operation";
import { CfProtocol } from "./protocol";

export class ChannelMsg {
	constructor(
		readonly protocol: CfProtocol,
		readonly seqno: number,
		readonly signatures?: Array<Signature>,
		readonly ackSignatures?: Array<Signature>,
		readonly body?: any
	) {}
}
