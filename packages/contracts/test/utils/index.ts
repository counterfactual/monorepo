import { AppIdentity } from "@counterfactual/types";
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import { HashZero } from "ethers/constants";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/utils";

export const expect = chai.use(solidity).expect;

// TS version of MAppRegistryCore::computeAppChallengeHash
export const computeAppChallengeHash = (
  id: string,
  appStateHash: string,
  nonce: number,
  timeout: number
) =>
  keccak256(
    solidityPack(
      ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
      ["0x19", id, nonce, timeout, appStateHash]
    )
  );

// TS version of MAppRegistryCore::computeActionHash
export const computeActionHash = (
  turnTaker: string,
  previousState: string,
  action: string,
  setStateNonce: number,
  disputeNonce: number
) =>
  keccak256(
    solidityPack(
      ["bytes1", "address", "bytes", "bytes", "uint256", "uint256"],
      ["0x19", turnTaker, previousState, action, setStateNonce, disputeNonce]
    )
  );

export class AppInstance {
  get identityHash(): string {
    return this.hashOfEncoding();
  }

  get appIdentity(): AppIdentity {
    return {
      owner: this.owner,
      signingKeys: this.signingKeys,
      appDefinitionAddress: this.appDefinitionAddress,
      interpreterHash: HashZero,
      defaultTimeout: this.defaultTimeout
    };
  }

  constructor(
    readonly owner: string,
    readonly signingKeys: string[],
    readonly appDefinitionAddress: string,
    readonly defaultTimeout: number
  ) {}

  // appIdentity
  public hashOfEncoding(): string {
    return keccak256(
      defaultAbiCoder.encode(
        [
          `tuple(
            address owner,
            address[] signingKeys,
            address appDefinitionAddress,
            bytes32 interpreterHash,
            uint256 defaultTimeout
          )`
        ],
        [this.appIdentity]
      )
    );
  }
}
