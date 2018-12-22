import { defaultAbiCoder, keccak256 } from "ethers/utils";

import { AppIdentity } from "@counterfactual/types";

import { APP_IDENTITY } from "./encodings";

export function appIdentityToHash(appIdentity: AppIdentity) {
  return keccak256(defaultAbiCoder.encode([APP_IDENTITY], [appIdentity]));
}
