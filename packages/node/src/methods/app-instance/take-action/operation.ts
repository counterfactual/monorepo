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

  return await makeApplyActionCall(appContract, appInstance, action);
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

async function makeApplyActionCall(
  contract: Contract,
  appInstance: AppInstance,
  action: any
): Promise<AppState> {
  try {
    return appInstance.decodeAppState(
      await contract.functions.applyAction(appInstance.state, action)
    );
  } catch (e) {
    const sanitizedError = e
      .toString()
      .replace("s: VM Exception while processing transaction: revert");
    return Promise.reject(`${ERRORS.INVALID_ACTION}: ${sanitizedError}`);
  }
}

export async function actionIsEncondable(
  appInstance: AppInstance,
  action: AppState
): Promise<void> {
  if (isNotDefinedOrEmpty(appInstance.appInterface.actionEncoding)) {
    return Promise.reject(ERRORS.NO_ACTION_ENCODING_FOR_APP_INSTANCE);
  }
  try {
    appInstance.encodeAction(action);
  } catch (e) {
    return Promise.reject(ERRORS.ACTION_OBJECT_NOT_ENCODABLE);
  }
}
