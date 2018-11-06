import { abi, Bytes32 } from "./index";

export class CfNonce {
  public isSet: boolean;
  public salt: Bytes32;
  public nonceValue: number;

  constructor(isSet: boolean, uniqueId: number, nonceValue: number) {
    this.isSet = isSet;
    this.salt = abi.keccak256(abi.encodePacked(["uint256"], [uniqueId]));
    this.nonceValue = nonceValue;
  }
}
