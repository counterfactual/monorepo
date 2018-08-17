import { BuildArtifact } from "@counterfactual/typescript-typings";
import * as ethers from "ethers";
export declare class Contract extends ethers.Contract {
    salt?: string;
    cfAddress?: string;
    registry?: Contract;
}
export declare class AbstractContract {
    readonly abi: string[] | string;
    readonly binary: string;
    static loadBuildArtifact(artifactName: string, links?: {
        [name: string]: AbstractContract;
    }): AbstractContract;
    static fromBuildArtifact(buildArtifact: BuildArtifact, links?: {
        [name: string]: AbstractContract;
    }): AbstractContract;
    private deployedAddress?;
    constructor(abi: string[] | string, binary: string);
    getDeployed(signer: ethers.Wallet): Contract;
    deploy(signer: ethers.Wallet, args?: any[]): Promise<Contract>;
    connect(signer: ethers.Wallet, address: string): Promise<Contract>;
    deployViaRegistry(signer: ethers.Wallet, registry: Contract, args?: any[], salt?: string): Promise<Contract>;
}
