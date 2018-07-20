import * as ethers from "ethers";
import { StateChannelContext } from "../delete_me";
import { CFAppUpdateWithSigningKeys, CfOperation } from "./cf-operation";

import { Proxy as ProxyContract } from "./contracts-layer-constants";

const TIMEOUT = 100;

export class CfOpUpdate {
	static operation(req: CfOpUpdateRequest): CfOperation {
		const signingKeys = []; // FIXME: @armani need to get keys from store
		return new CFAppUpdateWithSigningKeys(
			req.cfaddress,
			1337, // FIXME: @armani need a unique id
			req.proposedAppState,
			2 // FIXME: @armani need a nonce
		);
	}
}

// todo: update these fields
export class CfOpUpdateRequest {
	constructor(
		readonly appId: string,
		readonly cfaddress: string,
		readonly moduleUpdateData: any,
		readonly proposedAppState: string,
		readonly metadata: any,
		readonly nonce?: any
	) {}
}
