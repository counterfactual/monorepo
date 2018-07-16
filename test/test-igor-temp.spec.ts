import { ClientMessage } from './../src/machine/types';
import { CfOpUpdate } from "../src/protocols/cf-operation/cf-op-update";
import { CfWallet } from "../src/wallet/wallet";
import * as ethers from "ethers";


describe("Exploring", () => {

	beforeAll(() => {
	});

	afterAll(() => {
	});

	it("IgorXX", async (done) => {
		let wallet = new CfWallet();
		let msg: ClientMessage = {
			requestId: '123-456-789',
			//appName: 'ethmo',
			//appId: 'someAppId',
			toAddress: 'toAddr',
			fromAddress: 'fromAddr',
			multisigAddress: '',
			action: 'setup',
			data: { 
				encodedData: ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
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
});