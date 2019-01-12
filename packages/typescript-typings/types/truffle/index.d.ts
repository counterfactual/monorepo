declare module "truffle" {
  import * as truffle from "truffle-contract";

  interface ArtifactsGlobal {
    require<A>(name: string): truffle.TruffleContract<A>;
  }

  interface BuildArtifact {
    contractName?: string;
    networks?: {
      [x: string]: {
        address: string,
        events: {},
        links: { [x: string]: string },
        transactionHash: string
      }
    }
  }

  global {
    function contract(
      name: string,
      callback: (accounts: Array<string>) => void
    ): void;
    const artifacts: ArtifactsGlobal;
  }
}
