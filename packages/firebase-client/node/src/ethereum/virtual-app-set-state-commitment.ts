import { utils } from "@counterfactual/cf.js";
import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import { Interface, keccak256, Signature, solidityPack } from "ethers/utils";

import { EthereumCommitment, Transaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";
const { signaturesToBytes, sortSignaturesBySignerAddress } = utils;

// hardcoded assumption: all installed virtual apps can go through this many update operations
const NONCE_EXPIRY = 65536;

const iface = new Interface(AppRegistry.abi);

export class VirtualAppSetStateCommitment extends EthereumCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly appIdentity: AppIdentity,
    public readonly timeout: number,
    // todo(xuanji): the following two are set to null for intermediary. This
    // is bad API design and should be fixed eventually.
    public readonly hashedSolidityABIEncoderV2Struct?: string,
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
          ["bytes1", "bytes32", "uint256", "uint256", "bytes1"],
          [
            "0x19",
            appIdentityToHash(this.appIdentity),
            NONCE_EXPIRY,
            this.timeout,
            "0x01"
          ]
        )
      );
    }
    /// keep in sync with `digest` definition
    return keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          appIdentityToHash(this.appIdentity),
          this.appLocalNonce!,
          this.timeout,
          this.hashedSolidityABIEncoderV2Struct
        ]
      )
    );
  }

  // overrides EthereumCommitment::Transaction
  public transaction(
    signatures: Signature[],
    intermediarySignature: Signature
  ): Transaction {
    if (!intermediarySignature) {
      throw Error("transaction must receive intermediary signature");
    }
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
      appStateHash: this.hashedSolidityABIEncoderV2Struct!,
      nonce: this.appLocalNonce!,
      timeout: this.timeout,
      signatures: signaturesToBytes(
        intermediarySignature,
        ...sortSignaturesBySignerAddress(this.hashToSign(false), signatures)
      ),
      nonceExpiry: NONCE_EXPIRY
    };
  }
}
