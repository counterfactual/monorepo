// tmp app store for mvp
export class CfAppStore {
	static app(req: CfAppInstallRequest, signingKeys: Array<string>) {
		switch (req.appId) {
			case "ethmo": {
				return new CfApp(
					"0x0", // todo
					"tuple(address,uint256)[2]", // todo
					signingKeys,
					req.peerAmounts,
					req.initData,
					"0xb5d78d8c", // todo
					10 // todo
				);
			}
			case "ttt": {
				return new CfApp(
					"0x1", // todo
					"tuple(uint256[9],uint256)",
					signingKeys,
					req.peerAmounts,
					req.initData,
					"0xb5d78d8c", // todo
					11 // todo
				);
			}
			case "withdraw": {
				return new CfApp(
					"0x2", // todo
					"tuple(address,address,uint256)", // todo
					signingKeys,
					req.peerAmounts,
					req.initData,
					"0xb5d78d8c", // todo
					121 // todo
				);
			}
			case "test": {
				return new CfApp(
					"0x3", // todo
					"tuple(uint256[9],uint256)",
					signingKeys,
					req.peerAmounts,
					req.initData,
					"0xb5d78d8c", // todo
					13 // todo
				);
			}
		}
	}
}

export class CfAppInstallRequest {
	constructor(
		readonly appId: string,
		readonly signingKey: string,
		readonly peerAmounts: Array<CfPeerAmount>,
		readonly initData: any,
		readonly metadata?: any
	) {}
}

export class CfAppUninstallRequest {
	constructor(
		readonly appId: string,
		readonly peerAmounts: Array<CfPeerAmount>,
		readonly exitData: any,
		readonly metadata?: any
	) {}
}

export class CfAppUpdateRequest {
	constructor(
		readonly appId: string,
		readonly cfaddress: string,
		readonly moduleUpdateData: any,
		readonly proposedAppState: string,
		readonly metadata: any,
		readonly nonce?: any
	) {}
}

// todo: probably move this over to system
//       the fact that this lives next to CfApp is confusing
export class CfPeerAmount {
	constructor(readonly addr: string, public amount: number) {}
}

export class CfApp {
	constructor(
		readonly bytecode: string,
		readonly stateType: string,
		readonly signingKeys: Array<string>,
		readonly peerAmounts: Array<CfPeerAmount>,
		readonly initData: any,
		readonly interpreterSigHash: string,
		readonly uniqueId: number
	) {}
}
