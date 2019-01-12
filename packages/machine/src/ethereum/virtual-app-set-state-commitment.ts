import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import { Interface, keccak256, Signature, solidityPack } from "ethers/utils";

import { EthereumCommitment, Transaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";
import {
  signaturesToBytes,
  sortSignaturesBySignerAddress
} from "./utils/signature";

const iface = new Interface(AppRegistry.abi);

export class VirtualAppSetStateCommitment extends EthereumCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly appIdentity: AppIdentity,
    public readonly appLocalNonceExpiry: number,
    public readonly timeout: number,
    // todo(xuanji): the following two are set to null for intermediary. This
    // is bad API design and should be fixed eventually.
    public readonly hashedAppState?: string,
    public readonly appLocalNonce?: number
  ) {
    super();
  }

  /// overrides EthereumCommitment::hashToSign
  public hashToSign(signerIsIntermediary: boolean): string {
    if (signerIsIntermediary) {
      /// keep in sync with `digest2` definition
      return keccak256(
        solidityPack(
          ["bytes1", "bytes32", "uint256", "uint256", "bytes32", "bytes1"],
          [
            "0x19",
            appIdentityToHash(this.appIdentity),
            this.appLocalNonceExpiry,
            this.timeout,
            "0x01"
          ]
        )
      );
    }
    /// keep in sync with `digest2` definition
    return keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32", "bytes1"],
        [
          "0x19",
          appIdentityToHash(this.appIdentity),
          this.appLocalNonce!,
          this.timeout,
          this.hashedAppState
        ]
      )
    );
  }

  // overrides EthereumCommitment::Transaction
  public transaction(
    signatures: Signature[],
    intermediarySignature: Signature
  ): Transaction {
    return {
      to: this.networkContext.AppRegistry,
      value: 0,
      data: iface.functions.virtualAppSetState.encode([
        this.appIdentity,
        this.getSignedStateHashUpdate(signatures, intermediarySignature)
      ])
    };
  }

  /// keep in sync with virtualAppSetState
  private getSignedStateHashUpdate(
    signatures: Signature[],
    intermediarySignature: Signature
  ): any {
    return {
      stateHash: this.hashedAppState!,
      nonce: this.appLocalNonce!,
      timeout: this.timeout,
      signatures: signaturesToBytes(
        intermediarySignature,
        ...sortSignaturesBySignerAddress(this.hashToSign(false), signatures)
      ),
      nonceExpiry: this.appLocalNonceExpiry
    };
  }
}
