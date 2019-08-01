import { AppIdentity } from "@counterfactual/types";
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BigNumber,
  defaultAbiCoder,
  joinSignature,
  keccak256,
  recoverAddress,
  Signature
} from "ethers/utils";

export const expect = chai.use(solidity).expect;

export class AppIdentityTestClass {
  get identityHash(): string {
    return keccak256(
      defaultAbiCoder.encode(
        ["uint256", "address[]"],
        [this.channelNonce, this.participants]
      )
    );
  }

  get appIdentity(): AppIdentity {
    return {
      participants: this.participants,
      appDefinition: this.appDefinition,
      defaultTimeout: this.defaultTimeout,
      channelNonce: this.channelNonce
    };
  }

  constructor(
    readonly participants: string[],
    readonly appDefinition: string,
    readonly defaultTimeout: number,
    readonly channelNonce: number
  ) {}
}

/**
 * Converts an array of signatures into a single string
 *
 * @param signatures An array of etherium signatures
 */
export function signaturesToBytes(...signatures: Signature[]): string {
  return signatures
    .map(joinSignature)
    .map(s => s.substr(2))
    .reduce((acc, v) => acc + v, "0x");
}

/**
 * Sorts signatures in ascending order of signer address
 *
 * @param signatures An array of etherium signatures
 */
export function sortSignaturesBySignerAddress(
  digest: string,
  signatures: Signature[]
): Signature[] {
  const ret = signatures.slice();
  ret.sort((sigA, sigB) => {
    const addrA = recoverAddress(digest, signaturesToBytes(sigA));
    const addrB = recoverAddress(digest, signaturesToBytes(sigB));
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return ret;
}
