import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "../state";
import { getFirstResult } from "../vm";
import { ClientMessage, InternalMessage } from "../types";
import { Instruction } from "../instructions";
import { StateTransition } from "./state-transition/state-transition";
export { StateTransition } from "./state-transition/state-transition";
import { CfOpGenerator } from "./cf-operation/cf-op-generator";
export { CfOpGenerator } from "./cf-operation/cf-op-generator";

export class CfMiddleware {
	constructor(readonly cfState: CfState, private middlewares = {}) {
		this.add(
			Instruction.OP_GENERATE,
			async (message: InternalMessage, next: Function, context: Context) => {
				return CfOpGenerator.generate(message, next, context, this.cfState);
			}
		);
		this.add(
			Instruction.STATE_TRANSITION_PROPOSE,
			async (message: InternalMessage, next: Function, context: Context) => {
				return StateTransition.propose(message, next, context, this.cfState);
			}
		);
		this.add(
			Instruction.STATE_TRANSITION_PREPARE,
			async (message: InternalMessage, next: Function, context: Context) => {
				return StateTransition.prepare(message, next, context, this.cfState);
			}
		);
		this.add(
			Instruction.STATE_TRANSITION_COMMIT,
			async (message: InternalMessage, next: Function, context: Context) => {
				return StateTransition.commit(message, next, context, this.cfState);
			}
		);
		this.add(Instruction.KEY_GENERATE, KeyGenerator.generate);
		this.add(Instruction.OP_SIGN_VALIDATE, SignatureValidator.validate);
		this.add(Instruction.IO_PREPARE_SEND, NextMsgGenerator.generate);
	}

	add(scope: Instruction, method: Function) {
		if (scope in this.middlewares) {
			this.middlewares[scope].push({ scope, method });
		} else {
			this.middlewares[scope] = [{ scope, method }];
		}
	}

	async run(msg: InternalMessage, context: Context) {
		let resolve;
		let result = new Promise((res, rej) => {
			resolve = res;
		});

		let counter = 0;
		let middlewares = this.middlewares;
		let opCode = msg.opCode;

		async function callback() {
			if (counter === middlewares[opCode].length - 1) {
				return Promise.resolve(null);
			} else {
				// This is hacky, prevents next from being called more than once
				counter++;
				console.log(counter);
				let middleware = middlewares[opCode][counter];
				if (opCode === Instruction.ALL || middleware.scope === opCode) {
					return middleware.method(msg, callback, context);
				} else {
					return callback();
				}
			}
		}
		return this.middlewares[opCode][0].method(msg, callback, context);
	}
}

export class NextMsgGenerator {
	static generate(
		internalMessage: InternalMessage,
		next: Function,
		context: Context
	) {
		let message = internalMessage.clientMessage;
		let msg: ClientMessage = {
			requestId: "none this should be a notification on completion",
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
