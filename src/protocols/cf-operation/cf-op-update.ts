import * as ethers from "ethers";
import { StateChannelContext } from "../state-channel";
import { CfAppUpdateRequest } from "../../client/cf-app-store";
import { CFAppUpdateWithSigningKeys, CfOperation } from "./cf-operation";

import { Proxy as ProxyContract } from "../contracts-layer-constants";

const TIMEOUT = 100;

export class CfOpUpdate {
	static operation(req: CfAppUpdateRequest): CfOperation {
		const signingKeys = []; // FIXME: @armani need to get keys from store
		return new CFAppUpdateWithSigningKeys(
			req.cfaddress,
			1337, // FIXME: @armani need a unique id
			req.proposedAppState,
			2 // FIXME: @armani need a nonce
		);
	}
}
