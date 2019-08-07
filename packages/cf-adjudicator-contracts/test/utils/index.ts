import { AppIdentity } from "@counterfactual/types";
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BigNumber,
  BigNumberish,
  defaultAbiCoder,
  joinSignature,
  keccak256,
  recoverAddress,
  Signature,
  solidityPack
} from "ethers/utils";

export const expect = chai.use(solidity).expect;

// TS version of MChallengeRegistryCore::computeAppChallengeHash
export const computeAppChallengeHash = (
  id: string,
  appStateHash: string,
  versionNumber: BigNumberish,
  timeout: number
) =>
  keccak256(
    solidityPack(
      ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
      ["0x19", id, versionNumber, timeout, appStateHash]
    )
  );

// TS version of MChallengeRegistryCore::computeActionHash
export const computeActionHash = (
  turnTaker: string,
  previousState: string,
  action: string,
  versionNumber: number
) =>
  keccak256(
    solidityPack(
      ["bytes1", "address", "bytes", "bytes", "uint256"],
      ["0x19", turnTaker, previousState, action, versionNumber]
    )
  );

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

/**
 * Sorts signatures in ascending order of signer address
 * and converts them into bytes
 *
 * @param signatures An array of etherium signatures
 */
export function signaturesToBytesSortedBySignerAddress(
  digest: string,
  ...signatures: Signature[]
): string {
  return signaturesToBytes(
    ...sortSignaturesBySignerAddress(digest, signatures)
  );
}
