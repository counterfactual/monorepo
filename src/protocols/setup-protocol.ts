/*
import * as ethers from "ethers";

import * as cfOp from "./cf-operation/cf-operation";

import { ChannelMsg } from "./channel-msg";
import { Protocol, CfProtocol } from "./protocol";
import {
	ProtocolStore,
	AppId,
	MultisigProvider,
	SignerService,
	Signature,
	ChannelMsgIo
} from "./types";
import { StateChannelContext } from "../client/state-channel";

enum SetupSeqNo {
	Setup = 0,
	SetupAck
}

export class SetupChannelProtocol extends Protocol {
	constructor(
		readonly ctx: StateChannelContext,
		io: ChannelMsgIo,
		store: ProtocolStore,
		private machine: SetupChannelMachine,
		readonly protocolId: string
	) {
		super(ctx, io, store, protocolId);
	}

	async init(metadata: any) {
		const ops: Array<cfOp.CfOperation> = this.machine.getSetupCfOperations();

		const signatures = await this.machine.signer.signMany(
			ops.map(x => x.getHashToSign()),
			{}
		);

		let msg = new ChannelMsg(
			CfProtocol.SETUP,
			// TODO: @armani seems weird that this is SetupAck
			SetupSeqNo.Setup,
			signatures,
			[],
			{ multisigAddr: this.ctx.multisigAddr, req: { metadata: metadata } }
		);
		await this.transition(msg);
	}

	async execute(msg: ChannelMsg): Promise<ChannelMsg> {
		switch (msg.seqno) {
			case SetupSeqNo.Setup: {
				return await this.machine.setup(msg);
			}
			case SetupSeqNo.SetupAck: {
				return await this.machine.setupAck(msg);
			}
			default: {
				console.log("receieved bad msg");
			}
		}
	}

	messageCount(): number {
		return SetupSeqNo.SetupAck + 1;
	}
}

export class SetupChannelMachine {
	constructor(
		private ctx: StateChannelContext,
		readonly signer: SignerService,
		private didSetup: Function
	) {}

	async setup(msg: ChannelMsg): Promise<ChannelMsg> {
		const hashList: Array<string> = [];

		const ops: Array<cfOp.CfOperation> = this.getSetupCfOperations();

		for (let i = 0; i < ops.length; i++) {
			const hash = ops[i].getHashToSign();
			hashList.push(hash);
			if (!Signature.matches(hash, msg.signatures[i], this.ctx.peerAddr)) {
				throw Error("Signature from counterparty did not match.");
			}
		}

		const ackSignatures = await this.signer.signMany(hashList, {});

		this.didSetup();

		return new ChannelMsg(
			CfProtocol.SETUP,
			SetupSeqNo.SetupAck,
			[],
			ackSignatures,
			{ req: msg.body.req }
		);
	}

	async setupAck(msg: ChannelMsg): Promise<ChannelMsg> {
		const ops: Array<cfOp.CfOperation> = this.getSetupCfOperations();

		for (let i = 0; i < ops.length; i++) {
			const hash = ops[i].getHashToSign();
			if (!Signature.matches(hash, msg.signatures[i], this.ctx.peerAddr)) {
				throw Error("Signature from counterparty did not match.");
			}
		}
		this.didSetup();
		return null;
	}

	*/