import * as ethers from "ethers";
import { InstallProposer } from "../src/middleware/state-transition/install-proposer";
import { SetupProposer } from "../src/middleware/state-transition/setup-proposer";
import {
	CfFreeBalance,
	CfNonce,
	Terms,
	CfAppInterface
} from "../src/middleware/cf-operation/types";
import {
	ClientMessage,
	InternalMessage,
	StateChannelInfos,
	ChannelStates,
	PeerBalance
} from "../src/types";
import { CfState, Context, StateChannelInfoImpl } from "../src/state";
import { Instruction } from "../src/instructions";

// generic params for  peers
const MULTISIG = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd0";
const FROM = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd1";
const TO = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd2";

// install params
const KEY_A = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd3";
const KEY_B = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4";
const TOKEN_ADDRESS = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd5";
const APP_ADDRESS = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd6";
const REDUCER = "0x00000001";
const RESOLVER = "0x00000002";
const TURN_TAKER = "0x00000003";
const IS_STATE_FINAL = "0x00000004";

describe("State transition", () => {
	it("should propose a new setup state", () => {
		let message = new InternalMessage(
			"setup",
			Instruction.STATE_TRANSITION_PROPOSE,
			setupClientMsg()
		);
		let proposal = SetupProposer.propose(message);
		validateSetupInfos(proposal.state);
	});
	it("should propose a new install state", () => {
		let message = new InternalMessage(
			"install",
			Instruction.STATE_TRANSITION_PROPOSE,
			installClientMsg()
		);
		let proposal = InstallProposer.propose(
			message,
			new Context(),
			setupInstallCfState()
		);
		validateInstallInfos(proposal.state);
	});
});

function setupClientMsg(): ClientMessage {
	return {
		requestId: "0",
		appId: "0",
		action: "setup",
		data: {},
		multisigAddress: MULTISIG,
		toAddress: TO,
		fromAddress: FROM,
		stateChannel: undefined,
		seq: 0
	};
}

function setupInstallCfState(): CfState {
	let freeBalance = new CfFreeBalance(
		FROM,
		20,
		TO,
		20,
		0, // local nonce
		0, // uniqueId
		100, // timeout
		new CfNonce(0) // nonce
	);
	let info = new StateChannelInfoImpl(TO, FROM, MULTISIG, {}, freeBalance);
	let channelStates: ChannelStates = { [MULTISIG]: info };
	return new CfState(channelStates);
}

function validateSetupInfos(infos: StateChannelInfos) {
	expect(Object.keys(infos).length).toBe(1);
	let info = infos[MULTISIG];
	expect(info.fromAddress).toBe(FROM);
	expect(info.toAddress).toBe(TO);
	expect(Object.keys(info.appChannels).length).toBe(0);
	expect(info.freeBalance.alice).toBe(FROM);
	expect(info.freeBalance.aliceBalance).toBe(0);
	expect(info.freeBalance.bob).toBe(TO);
	expect(info.freeBalance.bobBalance).toBe(0);
	expect(info.freeBalance.localNonce).toBe(0);
	expect(info.freeBalance.uniqueId).toBe(0);

	let expectedSalt = ethers.utils.solidityKeccak256(["uint256"], [0]);

	expect(info.freeBalance.nonce.nonce).toBe(1);
	expect(info.freeBalance.nonce.salt).toBe(expectedSalt);
}

function installClientMsg(): ClientMessage {
	return {
		requestId: "0",
		appId: "0",
		action: "install",
		data: {
			peerA: new PeerBalance(FROM, 5),
			peerB: new PeerBalance(TO, 3),
			keyA: KEY_A,
			keyB: KEY_B,
			encodedAppState: "0x0",
			terms: new Terms(0, 8, TOKEN_ADDRESS),
			app: new CfAppInterface(
				APP_ADDRESS,
				REDUCER,
				RESOLVER,
				TURN_TAKER,
				IS_STATE_FINAL
			),
			timeout: 100
		},
		multisigAddress: MULTISIG,
		toAddress: TO,
		fromAddress: FROM,
		stateChannel: undefined,
		seq: 0
	};
}

function validateInstallInfos(infos: StateChannelInfos) {
	let stateChannel = infos[MULTISIG];

	expect(stateChannel.freeBalance.aliceBalance).toBe(15);
	expect(stateChannel.freeBalance.bobBalance).toBe(17);

	let expectedCfAddr =
		"0x363674963cc867f9de0dbcd8ba8d513a42dbedae380bbd2ad5a15e6ceddb4e64";
	let app = infos[MULTISIG].appChannels[expectedCfAddr];
	let expectedSalt =
		"0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6";

	expect(app.id).toBe(expectedCfAddr);
	expect(app.peerA.address).toBe(FROM);
	expect(app.peerA.balance).toBe(5);
	expect(app.peerB.address).toBe(TO);
	expect(app.keyA).toBe(KEY_A);
	expect(app.keyB).toBe(KEY_B);
	expect(app.encodedState).toBe("0x0");
	expect(app.localNonce).toBe(1);
	expect(app.timeout).toBe(100);
	expect(app.terms.assetType).toBe(0);
	expect(app.terms.limit).toBe(8);
	expect(app.terms.token).toBe(TOKEN_ADDRESS);
	expect(app.cfApp.address).toBe(APP_ADDRESS);
	expect(app.cfApp.reducer).toBe(REDUCER);
	expect(app.cfApp.resolver).toBe(RESOLVER);
	expect(app.cfApp.turnTaker).toBe(TURN_TAKER);
	expect(app.cfApp.isStateFinal).toBe(IS_STATE_FINAL);
	expect(app.dependencyNonce.salt).toBe(expectedSalt);
	expect(app.dependencyNonce.nonce).toBe(1);
}
