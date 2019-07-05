import { utils } from "@counterfactual/cf.js";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import {
  BigNumberish,
  Interface,
  keccak256,
  Signature,
  solidityPack
} from "ethers/utils";

import { EthereumCommitment, Transaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";
const { signaturesToBytes, sortSignaturesBySignerAddress } = utils;

// hardcoded assumption: all installed virtual apps can go through this many update operations
const VERSION_NUMBER_EXPIRY = 65536;

const iface = new Interface(ChallengeRegistry.abi);

export class VirtualAppSetStateCommitment extends EthereumCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly appIdentity: AppIdentity,
    public readonly timeout: number,
    // todo(xuanji): the following two are set to null for intermediary. This
    // is bad API design and should be fixed eventually.
    public readonly hashedSolidityABIEncoderV2Struct?: string,
    public readonly appVersionNumber?: BigNumberish
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
            VERSION_NUMBER_EXPIRY,
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
          this.appVersionNumber!,
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
      to: this.networkContext.ChallengeRegistry,
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
      versionNumber: this.appVersionNumber!,
      timeout: this.timeout,
      signatures: signaturesToBytes(
        intermediarySignature,
        ...sortSignaturesBySignerAddress(this.hashToSign(false), signatures)
      ),
      versionNumberExpiry: VERSION_NUMBER_EXPIRY
    };
  }
}
