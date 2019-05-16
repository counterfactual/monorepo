import { BigNumberish } from "ethers/utils";

export type ABIEncoding = string;
export type AppInstanceID = string;
export type Address = string;
export type Bytes32 = string;

// The application-specific state of an app instance, to be interpreted by the
// app developer. We just treat it as an opaque blob; however since we pass this
// around in protocol messages and include this in transaction data in disputes,
// we impose some restrictions on the type; they must be serializable both as
// JSON and as solidity structs.
export type SolidityABIEncoderV2Type = SolidityABIEncoderV2Struct | SolidityABIEncoderV2SArray;

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
