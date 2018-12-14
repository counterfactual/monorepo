import { keccak256 } from "ethers/utils";

import { abi } from "../../utils";

import { Bytes32 } from ".";

export class Nonce {
  public isSet: boolean;
  public salt: Bytes32;
  public nonceValue: number;

  constructor(isSet: boolean, uniqueId: number, nonceValue: number) {
    this.isSet = isSet;
    this.salt = keccak256(abi.encodePacked(["uint256"], [uniqueId]));
    this.nonceValue = nonceValue;
  }
}
