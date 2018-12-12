import { utils } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import {
  AppIdentity,
  NetworkContext,
  SignedStateHashUpdate
} from "@counterfactual/types";

import { appIdentityToHash } from "../../utils/app-identity";

import { ProtocolOperation, Transaction } from "./types";

const { keccak256, solidityPack, Interface } = ethers.utils;

export class OpSetState extends ProtocolOperation {
  constructor(
    readonly networkContext: NetworkContext,
    readonly appIdentity: AppIdentity,
    readonly appStateHash: string,
    readonly appLocalNonce: number,
    readonly timeout: number
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
          this.appLocalNonce,
          this.timeout,
          this.appStateHash
        ]
      )
    );
  }

  public transaction(sigs: ethers.utils.Signature[]): Transaction {
    const appRegistryInterface = new Interface(AppRegistry.abi);
    return new Transaction(
      this.networkContext.AppRegistry,
      0,
      appRegistryInterface.functions.setState.encode([
        this.appIdentity,
        this.getSignedStateHashUpdate(sigs)
      ])
    );
  }

  private getSignedStateHashUpdate(
    signatures: ethers.utils.Signature[]
  ): SignedStateHashUpdate {
    return {
      stateHash: this.appStateHash,
      nonce: this.appLocalNonce,
      timeout: this.timeout,
      signatures: utils.signaturesToSortedBytes(
        this.hashToSign(),
        ...signatures
      )
    };
  }
}
