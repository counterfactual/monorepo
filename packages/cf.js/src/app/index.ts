import * as ethers from "ethers";

import { Address, Bytes4 } from "../utils";
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
