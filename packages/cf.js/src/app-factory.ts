import { Address, AppABIEncodings } from "@counterfactual/common-types";

import { Provider } from "./provider";

export class AppFactory {
  constructor(
    readonly provider: Provider,
    readonly appId: Address,
    readonly encodings: AppABIEncodings
  ) {}
}
