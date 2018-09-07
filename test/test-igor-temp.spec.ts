import { ClientMessage, ChannelStates } from "./../src/types";
import * as ethers from "ethers";

describe("Exploring", () => {
	it("update ack", async () => {
		/*
		let state: ChannelStates = {
			sampleMultisig: {
				toAddress: 'toAddress',
				fromAddress: 'fromAddress',
				multisigAddress: 'sampleMultisig',
				appChannels: {
					someAppId: {
						id: 'someAppId',
						toSigningKey: 'toSigningKey',
						fromSigningKey: 'fromSigningKey',
						rootNonce: 0,
						encodedState: ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
						appState: { someValue: 1 },
						localNonce: 5
					}
				},
				// we should move this out into an accessor class
			 owners() { return [] }
			 }
		}

		// temp hack until we move the parent pointer out of the data structure
		state.sampleMultisig.appChannels.someAppId.stateChannel = state.sampleMultisig;
		let wallet = new CfWallet("", state);

		let incoming = {
			appId: 'someAppId',
      multisig: 'sampleMultisig',
      to: 'fromAddress',
			from: 'toAddress',
			protocol: 'update',
      seq: 0,
      body: { moduleUpdateData: { someValue: 2 } },
      signatures: [ 'hi i am a signature' ]
		};
		wallet.receiveMessageFromPeer(incoming);
	});
		*/
	/*
	it("update", async (done) => {
		let state: ChannelStates = {
			sampleMultisig: {
				toAddress: 'toAddress',
				fromAddress: 'fromAddress',
				multisigAddress: 'sampleMultisig',
				appChannels: {
					someAppId: {
						id: 'someAppId',
						toSigningKey: 'toSigningKey',
						fromSigningKey: 'fromSigningKey',
						rootNonce: 0,
						encodedState: ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
						appState: { someValue: 1 },
						localNonce: 5
					}
				},
				// we should move this out into an accessor class
			 owners() { return [] }
			 }
		}

		// temp hack until we move the parent pointer out of the data structure
		state.sampleMultisig.appChannels.someAppId.stateChannel = state.sampleMultisig;
		let wallet = new CfWallet("", state);

		let msg: ClientMessage = {
			requestId: '123-456-789',
			appId: 'someAppId',
			//toAddress: 'toAddr',
			//fromAddress: 'fromAddr',
			//multisigAddress: '',
			action: 'update',
			data: {
				encodedData: ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [2]),
				moduleUpdateData: { someValue: 1 } }
		};
		wallet.receive(msg);
		let incoming = {
			appId: 'someAppId',
			multisig: 'sampleMultisig',
			to: 'fromAddress',
			from: 'toAddress',
			seq: 1,
			body: { moduleUpdateData: { someValue: 1 } },
			signatures: ['hi i am a signature']
		};
		wallet.receiveMessageFromPeer(incoming);
	});
	*/
	/*
	it("IgorXX", async () => {
		let wallet = new CfWallet();
		let msg: ClientMessage = {
			requestId: "123-456-789",
			//appId: 'someAppId',
			// @igor: need to use real addresses for ethers to not crash
			toAddress: "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd3",
			fromAddress: "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd5",
			multisigAddress: "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			action: "setup",
			data: {
				encodedData: ethers.utils.AbiCoder.defaultCoder.encode(
					["uint256"],
					[1]
				),
				moduleUpdateData: { someValue: 1 }
			}
		};
		wallet.receive(msg);
		// app id and multisig must match the above client message
		let incoming = {
			appId: "someAppId",
			multisig: "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			to: "fromAddress",
			from: "toAddress",
			seq: 1,
			body: { moduleUpdateData: { someValue: 1 } },
			signatures: ["hi i am a signature"]
		};
		wallet.receiveMessageFromPeer(incoming);
	*/
	});
});
