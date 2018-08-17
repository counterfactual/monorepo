import * as ethers from "ethers";
import { Contract } from "./contract";
import { Multisig } from "./multisig";
export declare enum AssetType {
    ETH = 0,
    ERC20 = 1
}
export interface TransferTerms {
    assetType: AssetType;
    limit: ethers.types.BigNumberish;
    token?: string;
}
export interface App {
    addr: string;
    applyAction: string;
    resolve: string;
    getTurnTaker: string;
    isStateTerminal: string;
}
export declare class StateChannel {
    readonly signerAddrs: string[];
    readonly multisig: Multisig;
    readonly appStateEncoding: string;
    readonly terms: TransferTerms;
    readonly defaultTimeout: number;
    readonly app: App;
    contract?: Contract;
    appStateNonce: number;
    constructor(signerAddrs: string[], multisig: Multisig, appContract: ethers.Contract, appStateEncoding: string, terms: TransferTerms, defaultTimeout?: number);
    deploy(sender: ethers.Wallet, registry: ethers.Contract): Promise<void>;
    setState(appState: object, signers: ethers.Wallet[], timeout?: number, appStateNonce?: number): Promise<void>;
    setResolution(appState: object): Promise<void>;
}
export declare function computeStateHash(signingKeys: string[], appStateHash: string, appStateNonce: number, timeout: number): string;
export declare function computeActionHash(turnTaker: string, prevStateHash: string, action: string, appStateNonce: number, disputeNonce: number): string;
export declare function computeNonceRegistryKey(multisigAddress: string, nonceSalt: string): string;
export declare const termsEncoding: string;
export declare const appEncoding: string;
