import * as sys from "./system";

export class StateChannelContext {
	constructor(
		readonly multisigAddr: string,
		readonly myAddr: string,
		readonly peerAddr: string,
		readonly system?: sys.StateChannelSystem, // not used in setup protocol
		public networkContext?: Object
	) {
		this.networkContext = {
			CounterfactualAppAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			RegistryAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			WithdrawAppInterpreterAddress:
				"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			WithdrawAppInterpreterSighash: "0xaaaabbbb",
			AssetDispatcherAddress: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			AssetDispatcherSighashForETH: "0xbbbbaaaa",
			WithdrawAppBytecode: "0x0"
		};
	}

	getOwners(): Array<string> {
		return [this.myAddr, this.peerAddr];
	}
}
