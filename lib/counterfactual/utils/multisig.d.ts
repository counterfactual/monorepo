import * as ethers from "ethers";
export declare class Multisig {
    readonly owners: string[];
    private contract?;
    constructor(owners: string[]);
    readonly address: string;
    deploy(signer: ethers.ethers.Wallet): Promise<void>;
    execDelegatecall(toContract: ethers.Contract, funcName: string, args: any[], signers: ethers.Wallet[]): Promise<ethers.types.Transaction>;
    execCall(toContract: ethers.Contract, funcName: string, args: any[], signers: ethers.Wallet[]): Promise<ethers.types.Transaction>;
    private execTransaction;
}
