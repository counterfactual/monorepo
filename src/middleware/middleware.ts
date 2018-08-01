import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "../state";
import { InternalMessage, getFirstResult } from "../vm";
import { ClientMessage } from "../types";
import {
	zeroBytes32,
	zeroAddress,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";
import { Instruction } from "../instructions";
export { StateDiffGenerator } from "./state_diff_generator";
export { CfOpGenerator } from "./cf_op_generator";

export class NextMsgGenerator {
	static generate(
		internalMessage: InternalMessage,
		next: Function,
		context: Context
	) {
		let message = internalMessage.clientMessage;
		let msg: ClientMessage = {
			requestId: "none this should be a notification on completion",
			appName: message.appName,
			appId: message.appId,
			action: message.action,
			data: message.data,
			multisigAddress: message.multisigAddress,
			toAddress: message.fromAddress, // swap to/from here since sending to peer
			fromAddress: message.toAddress,
			seq: message.seq + 1
		};
		// need to bump the seqeunce number, so that, when we send out another IO
		// msg we give the correct one to the nextMsg.
		internalMessage.clientMessage.seq += 1;
		return msg;
	}
}

export class KeyGenerator {
	/**
	 * After generating this machine's app/ephemeral key, mutate the
	 * client message by placing the ephemeral key on it for my address.
	 */
	static generate(message: InternalMessage, next: Function, Context) {
		let wallet = ethers.Wallet.createRandom();
		let installData = message.clientMessage.data;
		if (installData.peerA.address === message.clientMessage.fromAddress) {
			installData.keyA = wallet.address;
		} else {
			installData.keyB = wallet.address;
		}
		return wallet;
	}
}

export class SignatureValidator {
	static async validate(
		message: InternalMessage,
		next: Function,
		context: Context
	) {
		let incomingMessage = getFirstResult(Instruction.IO_WAIT, context.results);
		let op = getFirstResult(Instruction.OP_GENERATE, context.results);
		// now validate the signature against the op hash
	}
}
