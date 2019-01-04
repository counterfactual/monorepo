import { AppIdentity } from "@counterfactual/types";
import * as chai from "chai";
import { solidity } from "ethereum-waffle";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/utils";

export const expect = chai.use(solidity).expect;

export enum AssetType {
  ETH,
  ERC20,
  ANY
}

export class AppInterface {
  private static readonly ABI_ENCODER_V2_ENCODING = `
    tuple(
      address addr,
      bytes4 getTurnTaker,
      bytes4 applyAction,
      bytes4 resolve,
      bytes4 isStateTerminal
    )
  `;

  constructor(
    readonly addr: string,
    readonly getTurnTaker: string,
    readonly applyAction: string,
    readonly resolve: string,
    readonly isStateTerminal: string
  ) {}

  public hashOfPackedEncoding(): string {
    return keccak256(
      defaultAbiCoder.encode(
        [AppInterface.ABI_ENCODER_V2_ENCODING],
        [
          {
            addr: this.addr,
            getTurnTaker: this.getTurnTaker,
            applyAction: this.applyAction,
            resolve: this.resolve,
            isStateTerminal: this.isStateTerminal
          }
        ]
      )
    );
  }
}

export class Terms {
  private static readonly ABI_ENCODER_V2_ENCODING =
    "tuple(uint8 assetType, uint256 limit, address token)";

  constructor(
    readonly assetType: AssetType,
    readonly limit: number,
    readonly token: string
  ) {}

  public hashOfPackedEncoding(): string {
    return keccak256(
      defaultAbiCoder.encode(
        [Terms.ABI_ENCODER_V2_ENCODING],
        [
          {
            assetType: this.assetType,
            limit: this.limit,
            token: this.token
          }
        ]
      )
    );
  }
}

// TS version of MAppRegistryCore::computeStateHash
export const computeStateHash = (
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
      appInterfaceHash: this.appInterface.hashOfPackedEncoding(),
      termsHash: this.terms.hashOfPackedEncoding(),
      defaultTimeout: this.defaultTimeout
    };
  }

  constructor(
    readonly owner: string,
    readonly signingKeys: string[],
    readonly appInterface: AppInterface,
    readonly terms: Terms,
    readonly defaultTimeout: number
  ) {}

  public hashOfEncoding(): string {
    return keccak256(
      defaultAbiCoder.encode(
        [
          `tuple(
            address owner,
            address[] signingKeys,
            bytes32 appInterfaceHash,
            bytes32 termsHash,
            uint256 defaultTimeout
          )`
        ],
        [this.appIdentity]
      )
    );
  }
}
