import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import {
  AppIdentity,
  NetworkContext,
  SignedStateHashUpdate
} from "@counterfactual/types";
import { Interface, keccak256, Signature, solidityPack } from "ethers/utils";

import { EthereumCommitment, Transaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";
import { signaturesToBytesSortedBySignerAddress } from "./utils/signature";

const iface = new Interface(AppRegistry.abi);

export class VirtualAppSetStateCommitment extends EthereumCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly appIdentity: AppIdentity,
    public readonly appLocalNonceExpiry: number,
    public readonly timeout: number,
    // set the following two to null for intermediary
    public readonly encodedAppState?: string,
    public readonly appLocalNonce?: number
  ) {
    super();
  }

  /// overrides EthereumCommitment::hashToSign
  /// keep in sync with `digest2` definition
  public hashToSign(): string {
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

  // overrides EthereumCommitment::Transaction
  public transaction(sigs: Signature[]): Transaction {
    return {
      to: this.networkContext.AppRegistry,
      value: 0,
      data: iface.functions.setState.encode([
        this.appIdentity,
        this.getSignedStateHashUpdate(sigs)
      ])
    };
  }

  /// keep in sync with virtualAppSetState
  private getSignedStateHashUpdate(
    signatures: Signature[]
  ): SignedStateHashUpdate {
    return {
      stateHash: keccak256(this.encodedAppState!),
      nonce: this.appLocalNonce!,
      timeout: this.timeout,
      signatures: signaturesToBytesSortedBySignerAddress(
        this.hashToSign(),
        ...signatures
      )
    };
  }
}
