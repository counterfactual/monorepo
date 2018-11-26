import { Provider } from "./provider";
import { AppABIEncodings } from "./types/protocol-types";
import { Address } from "./types/simple-types";

export class AppFactory {
  constructor(
    readonly provider: Provider,
    readonly appId: Address,
    readonly encodings: AppABIEncodings
  ) {}
}
