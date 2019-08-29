import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/expected-build-artifacts/ChallengeRegistry.json";
import {
  AppIdentity,
  NetworkContext,
  Node,
  SignedStateHashUpdate
} from "@counterfactual/types";
import {
  Interface,
  joinSignature,
  keccak256,
  Signature,
  solidityPack
} from "ethers/utils";

import { sortSignaturesBySignerAddress } from "../utils";

import { EthereumCommitment } from "./types";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(ChallengeRegistry.abi);

export class SetStateCommitment extends EthereumCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly appIdentity: AppIdentity,
    public readonly hashedAppState: string,
    public readonly appVersionNumber: number,
    public readonly timeout: number
  ) {
    super();
  }

  public hashToSign(): string {
    return keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          appIdentityToHash(this.appIdentity),
          this.appVersionNumber,
          this.timeout,
          this.hashedAppState
        ]
      )
    );
  }

  public getSignedTransaction(sigs: Signature[]): Node.MinimalTransaction {
    return {
      to: this.networkContext.ChallengeRegistry,
      value: 0,
      data: iface.functions.setState.encode([
        this.appIdentity,
        this.getSignedStateHashUpdate(sigs)
      ])
    };
  }

  private getSignedStateHashUpdate(
    signatures: Signature[]
  ): SignedStateHashUpdate {
    return {
      appStateHash: this.hashedAppState,
      versionNumber: this.appVersionNumber,
      timeout: this.timeout,
      signatures: sortSignaturesBySignerAddress(
        this.hashToSign(),
        signatures
      ).map(joinSignature)
    };
  }
}
