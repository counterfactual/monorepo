import { AppIdentity } from "@counterfactual/types";
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  BigNumberish,
  defaultAbiCoder,
  keccak256,
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
