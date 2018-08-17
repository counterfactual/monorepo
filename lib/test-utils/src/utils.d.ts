import * as ethers from "ethers";
export declare const should: Chai.Should;
export declare const UNIT_ETH: ethers.ethers.BigNumber;
export declare const HIGH_GAS_LIMIT: {
    gasLimit: number;
};
export declare const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
export declare const deployContract: (contract: any, providerOrSigner: ethers.ethers.Wallet | ethers.ethers.types.Provider, args?: any[] | undefined) => Promise<ethers.ethers.Contract>;
export declare function deployContractViaRegistry(truffleContract: any, providerOrSigner: ethers.Wallet | ethers.types.Provider, cargs?: any[]): Promise<{
    cfAddr: string;
    contract: ethers.Contract;
}>;
export declare const getDeployedContract: (contract: any, providerOrSigner: ethers.ethers.Wallet | ethers.ethers.types.Provider) => Promise<ethers.ethers.Contract>;
export declare const randomETHAddress: () => string;
export declare function generateEthWallets(count: number, provider?: ethers.types.Provider): ethers.Wallet[];
export declare const setupTestEnv: (web3: any) => {
    provider: ethers.ethers.providers.Web3Provider;
    unlockedAccount: ethers.ethers.Wallet;
};
export declare function signMessage(message: any, ...wallets: ethers.Wallet[]): string;
export declare function getParamFromTxEvent(transaction: any, eventName: any, paramName: any, contract: any, contractFactory: any): any;
export declare function assertRejects(q: any, msg?: any): Promise<void>;
export declare const mineOneBlock: () => Promise<{}>;
export declare const mineBlocks: (blocks: any) => Promise<void>;
