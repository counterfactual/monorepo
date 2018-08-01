import * as ethers from "ethers";
import { Bytes, Address } from "../types";
import { Abi } from "./types";

export function proxyCallSetStateData(
	appStateHash: string,
	appCfAddr: string,
	appLocalNonce: number,
	timeout: number,
	signatures: Bytes,
	registry: Address
) {
	return new ethers.Interface([Abi.proxyCall]).functions.proxyCall.encode([
		registry,
		appCfAddr,
		new ethers.Interface([Abi.setState]).functions.setState.encode([
			appStateHash,
			appLocalNonce,
			timeout,
			signatures
		])
	]);
}
