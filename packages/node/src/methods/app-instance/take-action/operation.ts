import { AppInstance } from "@counterfactual/machine";
import { AppState } from "@counterfactual/types";
import { Contract } from "ethers";
import { Provider } from "ethers/providers";

import { isNotDefinedOrEmpty } from "../../../utils";
import { ERRORS } from "../../errors";

export async function generateNewAppInstanceState(
  appInstance: AppInstance,
  action: any,
  provider: Provider
): Promise<AppState> {
  if (isNotDefinedOrEmpty(appInstance.appInterface.addr)) {
    return Promise.reject(ERRORS.NO_APP_CONTRACT_ADDR);
  }

  const appContract = new Contract(
    appInstance.appInterface.addr,
    createABI(appInstance),
    provider
  );

  try {
    return appInstance.decodeAppState(
      await appContract.functions.applyAction(appInstance.state, action)
    );
  } catch (e) {
    const sanitizedError = e
      .toString()
      .replace("s: VM Exception while processing transaction: revert");
    return Promise.reject(`${ERRORS.INVALID_ACTION}: ${sanitizedError}`);
  }
}

function createABI(appInstance: AppInstance): string[] {
  return [
    `function applyAction(
      ${appInstance.appInterface.stateEncoding},
      ${appInstance.appInterface.actionEncoding}
    )
    pure
    returns (bytes)`
  ];
}
