import { ClientMessage } from "./../src/machine/types";
import { CfOpUpdate } from "../src/protocols/cf-operation/cf-op-update";
import { CfWallet } from "../src/wallet/wallet";
import * as ethers from "ethers";

describe("Exploring", () => {
	it("IgorXX", async () => {
		let wallet = new CfWallet();
		let msg: ClientMessage = {
			requestId: "123-456-789",
			//appName: 'ethmo',
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
	});
});
