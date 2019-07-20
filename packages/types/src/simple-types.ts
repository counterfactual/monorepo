import { BigNumberish, Interface, ParamType } from "ethers/utils";

export type ABIEncoding = string;
export type Address = string;

// This is copied from the ethers definition of how an ABI is typed.
// tslint:disable-next-line:prefer-array-literal
export type ContractABI = Array<string | ParamType> | string | Interface;

// The application-specific state of an app instance, to be interpreted by the
// app developer. We just treat it as an opaque blob; however since we pass this
// around in protocol messages and include this in transaction data in challenges,
// we impose some restrictions on the type; they must be serializable both as
// JSON and as solidity structs.
export type SolidityABIEncoderV2Type =
  | SolidityABIEncoderV2Struct
  | SolidityABIEncoderV2SArray;

type SolidityABIEncoderV2Struct = {
  [x: string]:
    | string
    | BigNumberish
    | boolean
    | SolidityABIEncoderV2Struct
    | SolidityABIEncoderV2SArray;
};

// Ideally this should be a `type` not an `interface` but self-referencial
// types is not supported: github.com/Microsoft/TypeScript/issues/6230
interface SolidityABIEncoderV2SArray
  extends Array<
    | string
    | number
    | boolean
    | SolidityABIEncoderV2Struct
    | SolidityABIEncoderV2SArray
  > {}
