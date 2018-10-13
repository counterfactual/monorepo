declare interface OffChainContractEntry {
    contractName: string;
    address: string;
}

declare interface OffChainNetworkJson {
    migrationVersion: number;
    contracts: OffChainContractEntry[];
}

declare interface NetworkMapping {
    [networkId: number]: { address: string };
}

declare interface BuildArtifact {
    readonly contractName: string;
    readonly abi: any[];
    readonly bytecode: string;
    readonly networks: NetworkMapping;
}

declare interface ArtifactsLoader {
    require(name: string): BuildArtifact;
}

declare interface TruffleDeployer {
    deploy(artifact: BuildArtifact);

    link(artifact: BuildArtifact, libraries: BuildArtifact[]);
}