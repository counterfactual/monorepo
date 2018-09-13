import { Context } from "../../src/state";
import { CounterfactualVM, CfVmConfig, Response } from "../../src/vm";
import {
	ResponseSink,
	ClientMessage,
	ChannelStates,
	InternalMessage,
	Address,
	Signature,
	NetworkContext,
	ActionName
} from "../../src/types";
import { CfVmWal, MemDb, SyncDb } from "../../src/wal";
import { IoProvider } from "./ioProvider";
import { Instruction } from "../../src/instructions";
import { CfOperation } from "../../src/middleware/cf-operation/types";
import { EthCfOpGenerator } from "../../src/middleware/cf-operation/cf-op-generator";
import { CommitmentStore } from "./commitmentStore";
import { getFirstResult, getLastResult } from "../../src/middleware/middleware";

import { HIGH_GAS_LIMIT } from "@counterfactual/test-utils";
import * as ethers from "ethers";

export class TestWallet implements ResponseSink {
	readonly address: Address;
	signer: ethers.SigningKey;
	vm: CounterfactualVM;
	io: IoProvider;
	store: CommitmentStore;
	blockchainProvider: ethers.providers.BaseProvider;
	wallet: ethers.Wallet;
	private requests: Map<string, Function>;

	constructor(
		readonly privateKey: string,
		db?: SyncDb,
		states?: ChannelStates,
		networkContext?: NetworkContext
	) {
		this.vm = new CounterfactualVM(
			new CfVmConfig(
				this,
				new EthCfOpGenerator(),
				new CfVmWal(db !== undefined ? db : new MemDb()),
				states,
				networkContext
			)
		);
		this.io = new IoProvider();
		this.io.ackMethod = this.vm.startAck.bind(this.vm);
		this.store = new CommitmentStore();
		this.requests = new Map<string, Function>();
		this.signer = new ethers.SigningKey(privateKey);
		this.address = this.signer.address;
		this.registerMiddlewares();

		this.blockchainProvider = new ethers.providers.JsonRpcProvider(
			process.env.GANACHE_URL || "http://localhost:9545"
		);
		this.wallet = new ethers.Wallet(privateKey, this.blockchainProvider);
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

	/**
	 * The test will call this when it wants to start a protocol.
	 * Returns a promise that resolves with a Response object when
	 * the protocol has completed execution.
	 */
	async runProtocol(msg: ClientMessage): Promise<Response> {
		let promise = new Promise<Response>((resolve, reject) => {
			this.requests[msg.requestId] = resolve;
		});
		let response = this.vm.receive(msg);
		return promise;
	}

	/**
	 * Resolves the registered promise so the test can continue.
	 */
	sendResponse(res: Response) {
		if (this.requests[res.requestId] !== undefined) {
			let promise = this.requests[res.requestId];
			delete this.requests[res.requestId];
			promise(res);
		}
	}

	/**
	 * Called When a peer wants to send an io messge to this wallet.
	 */
	receiveMessageFromPeer(incoming: ClientMessage) {
		console.log("Receive from peer: ", incoming.action, incoming.seq);
		this.io.receiveMessageFromPeer(incoming);
	}

	async goToChain(appId: string) {
		//await this.installApp(appId);
		//await this.updateApp(appId);
	}

	async installApp(appId: string) {
		const signedInstallTransaction: any = Object.assign(
			{},
			this.store.getTransaction(appId, ActionName.INSTALL)
		);
		console.log("about to send the signed transaction");

		signedInstallTransaction.gasLimit = HIGH_GAS_LIMIT.gasLimit;
		//signedInstallTransaction.data = "0x";
		signedInstallTransaction.nonce = await this.blockchainProvider.getTransactionCount(
			this.address
		);
		const gasEstimate = await this.blockchainProvider.estimateGas(
			signedInstallTransaction
		);
		console.log(gasEstimate);
		// for the test check for contracts having been deployed
	}

	async updateApp(appId: string) {
		// const signedUpdateTransaction = this.store.getTransaction(appId, "update");
		// this.blockchainProvider.sendTransaction(signedUpdateTransaction);
		// for the test check that the on chain contracts have the same state as the machine
	}
}

/**
 * Plugin middleware methods.
 */

async function signMyUpdate(
	message: InternalMessage,
	next: Function,
	context: Context,
	wallet: TestWallet
): Promise<Signature> {
	const operation: CfOperation = getFirstResult(
		Instruction.OP_GENERATE,
		context.results
	).value;
	const digest = operation.hashToSign();
	console.log("signing digest = ", digest);
	const sig = wallet.signer.signDigest(digest);
	console.info("signing address: " + wallet.signer.address);
	console.info(
		"recovered address: " + ethers.utils.recoverAddress(digest, sig)
	);
	return new Signature(sig.recoveryParam! + 27, sig.r, sig.s);
}

async function validateSignatures(
	message: InternalMessage,
	next: Function,
	context: Context,
	wallet: TestWallet
) {
	const op: CfOperation = getLastResult(
		Instruction.OP_GENERATE,
		context.results
	).value;
	const digest = op.hashToSign();
	console.log("validate digest = ", digest);
	let sig;
	let expectedSigningAddress =
		message.clientMessage.fromAddress === wallet.address
			? message.clientMessage.toAddress
			: message.clientMessage.fromAddress;
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
	if (recoveredAddress !== expectedSigningAddress) {
		throw "Invalid signature";
	}
}
