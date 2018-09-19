import * as ethers from "ethers";

import { Context } from "../../src/state";
import { CounterfactualVM, CfVmConfig } from "../../src/vm";
import {
	ResponseSink,
	ClientActionMessage,
	ChannelStates,
	InternalMessage,
	Notification,
	WalletResponse,
	Signature,
	NetworkContext
} from "../../src/types";
import { CfVmWal, MemDb, SyncDb } from "../../src/wal";
import { IoProvider } from "./ioProvider";
import { Instruction } from "../../src/instructions";
import { EthCfOpGenerator } from "../../src/middleware/cf-operation/cf-op-generator";
import { applyMixins } from "../../src/mixins/apply";
import { Observable, NotificationType } from "../../src/mixins/observable";
import { TestWallet } from "./wallet";
import { CfOperation } from "../../src/middleware/cf-operation/types";
import { getFirstResult, getLastResult } from "../../src/middleware/middleware";
import { CommitmentStore } from "./commitmentStore";

let ganacheURL;

try {
	ganacheURL = process.env.GANACHE_URL || "http://localhost:9545";
} catch (e) {
	ganacheURL = "http://localhost:9545";
}

export class User implements Observable, ResponseSink {
	private observerCallbacks: Map<string, Function> = new Map<
		string,
		Function
	>();
	blockchainProvider: ethers.providers.BaseProvider;
	signer: ethers.SigningKey;
	ethersWallet: ethers.Wallet;
	vm: CounterfactualVM;
	io: IoProvider;
	address: string;
	store: CommitmentStore;

	// Observable
	observers: Map<NotificationType, Function[]> = new Map();
	registerObserver(type: NotificationType, callback: Function) {}
	unregisterObserver(type: NotificationType, callback: Function) {}
	notifyObservers(type: NotificationType, data: object) {}

	constructor(
		readonly wallet: TestWallet,
		address: string,
		privateKey: string,
		networkContext: NetworkContext,
		db?: SyncDb,
		states?: ChannelStates
	) {
		this.wallet = wallet;
		this.address = address;
		this.io = new IoProvider(this);
		this.vm = new CounterfactualVM(
			new CfVmConfig(
				this,
				new EthCfOpGenerator(),
				new CfVmWal(db !== undefined ? db : new MemDb()),
				networkContext,
				states
			)
		);
		this.store = new CommitmentStore();
		this.io.ackMethod = this.vm.startAck.bind(this.vm);
		this.registerMiddlewares();
		this.vm.registerObserver(
			"actionCompleted",
			this.handleActionCompletion.bind(this)
		);

		this.signer = new ethers.SigningKey(privateKey);
		this.address = this.signer.address;
		this.blockchainProvider = new ethers.providers.JsonRpcProvider(ganacheURL);

		this.ethersWallet = new ethers.Wallet(privateKey, this.blockchainProvider);
	}

	handleActionCompletion(notification: Notification) {
		this.notifyObservers(`${notification.data.name}Completed`, {
			requestId: notification.data.requestId,
			result: this.generateObserverNotification(notification),
			clientMessage: notification.data.clientMessage
		});
	}

	generateObserverNotification(notification: Notification): any {
		return notification.data.results.find(result => result.opCode === 0).value;
	}

	addObserver(message: ClientActionMessage) {
		let boundNotification = this.sendNotification.bind(
			this,
			message.data.notificationType
		);
		this.observerCallbacks.set(message.data.observerId, boundNotification);
		this.registerObserver(message.data.notificationType, boundNotification);
	}

	removeObserver(message: ClientActionMessage) {
		let callback = this.observerCallbacks.get(message.data.observerId);

		if (callback) {
			this.unregisterObserver(message.data.notificationType, callback);
		}
	}

	sendNotification(type: NotificationType, message: object) {
		if (this.isCurrentUser) {
			this.wallet.sendNotification(type, message);
		}
	}

	sendResponse(res: WalletResponse | Notification) {
		if (this.isCurrentUser) {
			this.wallet.sendResponse(res);
		}
	}

	sendIoMessageToClient(message: any) {
		if (this.isCurrentUser) {
			this.wallet.sendIoMessageToClient(message);
		}
	}

	get isCurrentUser(): boolean {
		return this.wallet.currentUser === this;
	}

	private registerMiddlewares() {
		this.vm.register(
			Instruction.OP_SIGN,
			async (message: InternalMessage, next: Function, context: Context) => {
				return signMyUpdate(message, next, context, this);
			}
		);
		this.vm.register(
			Instruction.OP_SIGN_VALIDATE,
			async (message: InternalMessage, next: Function, context: Context) => {
				return validateSignatures(message, next, context, this);
			}
		);
		this.vm.register(Instruction.IO_SEND, this.io.ioSendMessage.bind(this.io));
		this.vm.register(Instruction.IO_WAIT, this.io.waitForIo.bind(this.io));
		this.vm.register(
			Instruction.STATE_TRANSITION_COMMIT,
			this.store.setCommitment.bind(this.store)
		);
	}
}

/**
 * Plugin middleware methods.
 */

async function signMyUpdate(
	message: InternalMessage,
	next: Function,
	context: Context,
	user: User
): Promise<Signature> {
	const operation: CfOperation = getFirstResult(
		Instruction.OP_GENERATE,
		context.results
	).value;
	console.log(user.address + " is signing the digest");
	const digest = operation.hashToSign();
	console.log("signing digest = ", digest);
	const sig = user.signer.signDigest(digest);
	console.info("signing address: " + user.signer.address);
	console.info(
		"recovered address: " + ethers.utils.recoverAddress(digest, sig)
	);
	return new Signature(sig.recoveryParam! + 27, sig.r, sig.s);
}

async function validateSignatures(
	message: InternalMessage,
	next: Function,
	context: Context,
	user: User
) {
	const op: CfOperation = getLastResult(
		Instruction.OP_GENERATE,
		context.results
	).value;
	const digest = op.hashToSign();
	console.log("validating signature on digest = ", digest);
	let sig;
	let expectedSigningAddress =
		message.clientMessage.toAddress === user.address
			? message.clientMessage.fromAddress
			: message.clientMessage.toAddress;
	console.log(
		user.address +
			" is validating signature for counterparty: " +
			expectedSigningAddress
	);
	if (message.clientMessage.signature === undefined) {
		// initiator
		const incomingMessage = getLastResult(Instruction.IO_WAIT, context.results)
			.value;
		sig = incomingMessage.signature;
	} else {
		// receiver
		sig = message.clientMessage.signature;
	}

	const recoveredAddress = ethers.utils.recoverAddress(digest, {
		v: sig.v,
		r: sig.r,
		s: sig.s
	});
	console.log("recovered address: " + recoveredAddress);
	console.log("expected address: " + expectedSigningAddress);
	if (recoveredAddress !== expectedSigningAddress) {
		// FIXME: handle this more gracefully
		throw Error("Invalid signature");
	}
}

applyMixins(User, [Observable]);
