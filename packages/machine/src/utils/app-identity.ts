import { ethers } from "ethers";

import { AppIdentity } from "@counterfactual/types";

import { APP_IDENTITY } from "./encodings";

const { keccak256, defaultAbiCoder } = ethers.utils;

export function appIdentityToHash(appIdentity: AppIdentity) {
  return keccak256(defaultAbiCoder.encode([APP_IDENTITY], [appIdentity]));
}
