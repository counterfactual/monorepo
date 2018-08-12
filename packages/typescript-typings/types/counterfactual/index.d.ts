export interface BuildArtifact {
  readonly contractName: string;
  readonly abi: any[];
  readonly bytecode: string;
  readonly networks: { [networkName: string]: { address: string } };
}
