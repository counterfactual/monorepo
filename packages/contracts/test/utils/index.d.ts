/// <reference types="chai" />
import { AppIdentity } from "@counterfactual/types";
export declare const expect: Chai.ExpectStatic;
export declare enum AssetType {
    ETH = 0,
    ERC20 = 1,
    ANY = 2
}
export declare class App {
    readonly owner: string;
    readonly signingKeys: string[];
    readonly appInterfaceHash: string;
    readonly termsHash: string;
    readonly defaultTimeout: number;
    private static readonly ABI_ENCODER_V2_ENCODING;
    readonly id: string;
    constructor(owner: string, signingKeys: string[], appInterfaceHash: string, termsHash: string, defaultTimeout: number);
    toJson(): AppIdentity;
    hashOfEncoding(): string;
}
export declare class AppInterface {
    readonly addr: string;
    readonly getTurnTaker: string;
    readonly applyAction: string;
    readonly resolve: string;
    readonly isStateTerminal: string;
    private static readonly ABI_ENCODER_V2_ENCODING;
    constructor(addr: string, getTurnTaker: string, applyAction: string, resolve: string, isStateTerminal: string);
    hashOfPackedEncoding(): string;
}
export declare class Terms {
    readonly assetType: AssetType;
    readonly limit: number;
    readonly token: string;
    private static readonly ABI_ENCODER_V2_ENCODING;
    constructor(assetType: AssetType, limit: number, token: string);
    hashOfPackedEncoding(): string;
}
export declare const computeStateHash: (id: string, appStateHash: string, nonce: number, timeout: number) => string;
export declare const computeActionHash: (turnTaker: string, previousState: string, action: string, setStateNonce: number, disputeNonce: number) => string;
export declare class AppInstance {
    readonly owner: string;
    readonly signingKeys: string[];
    readonly appInterface: AppInterface;
    readonly terms: Terms;
    readonly defaultTimeout: number;
    readonly id: string;
    readonly appIdentity: AppIdentity;
    constructor(owner: string, signingKeys: string[], appInterface: AppInterface, terms: Terms, defaultTimeout: number);
    hashOfEncoding(): string;
}
