import { Provider } from "./provider";
import { Address, AppABIEncodings } from "./types";

export class AppFactory {
  constructor(
    readonly provider: Provider,
    readonly appId: Address,
    readonly encodings: AppABIEncodings
  ) {}
}
