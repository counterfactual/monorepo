import * as ethers from "ethers";

import { Address, Bytes, Bytes4, H256, PeerBalance } from "../utils";
import * as abi from "../utils/abi";

export class CfAppInterface {
  public static generateSighash(
    abiInterface: ethers.utils.Interface,
    functionName: string
  ): string {
    return abiInterface.functions[functionName]
      ? abiInterface.functions[functionName].sighash
      : "0x00000000";
  }

  constructor(
    readonly address: Address,
    readonly applyAction: Bytes4,
    readonly resolve: Bytes4,
    readonly getTurnTaker: Bytes4,
    readonly isStateTerminal: Bytes4,
    readonly stateEncoding: string
  ) {}

  public encode(state: object): string {
    return abi.encode([this.stateEncoding], [state]);
  }

  public stateHash(state: object): string {
    // assumes encoding "tuple(type key, type key, type key)"
    return abi.keccak256(this.encode(state));
  }

  public hash(): string {
    if (this.address === "0x0") {
      // FIXME:
      // https://github.com/counterfactual/monorepo/issues/119
      console.error(
        "WARNING: Can't compute hash for AppInterface because its address is 0x0"
      );
      return ethers.constants.HashZero;
    }
    return abi.keccak256(
      abi.encode(
        [
          "tuple(address addr, bytes4 applyAction, bytes4 resolve, bytes4 getTurnTaker, bytes4 isStateTerminal)"
        ],
        [
          {
            addr: this.address,
            applyAction: this.applyAction,
            resolve: this.resolve,
            getTurnTaker: this.getTurnTaker,
            isStateTerminal: this.isStateTerminal
          }
        ]
      )
    );
  }
}

export class Terms {
  constructor(
    readonly assetType: number,
    readonly limit: ethers.utils.BigNumber,
    readonly token: Address
  ) {}

  public hash(): string {
    return abi.keccak256(
      abi.encode(
        ["bytes1", "uint8", "uint256", "address"],
        ["0x19", this.assetType, this.limit, this.token]
      )
    );
  }
}

export interface UpdateOptions {
  state: object;
}

export interface UpdateData {
  encodedAppState: string;
  /**
   * Hash of the State struct specific to a given application.
   */
  appStateHash: H256;
}

export interface UninstallOptions {
  peerABalance: ethers.utils.BigNumber;
  peerBBalance: ethers.utils.BigNumber;
}

export interface InstallData {
  peerA: PeerBalance;
  peerB: PeerBalance;
  keyA?: Address;
  keyB?: Address;
  encodedAppState: Bytes;
  terms: Terms;
  app: CfAppInterface;
  timeout: number;
}

export interface InstallOptions {
  appAddress: string;
  stateEncoding: string;
  abiEncoding: string;
  state: object;
  peerABalance: ethers.utils.BigNumber;
  peerBBalance: ethers.utils.BigNumber;
}
