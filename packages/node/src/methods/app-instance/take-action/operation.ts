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
    // TODO: Import CounterfactualApp.json directly and place it here.
    //       Keep in mind that requires bundling the json in the rollup dist.
    ["function applyAction(bytes, bytes) pure returns (bytes)"],
    provider
  );

  return await makeApplyActionCall(appContract, appInstance, action);
}

async function makeApplyActionCall(
  contract: Contract,
  appInstance: AppInstance,
  action: any
): Promise<AppState> {
  try {
    return appInstance.decodeAppState(
      await contract.functions.applyAction(
        appInstance.encodedLatestState,
        appInstance.encodeAction(action)
      )
    );
  } catch (e) {
    const sanitizedError = e
      .toString()
      .replace("s: VM Exception while processing transaction: revert");
    throw new Error(`${ERRORS.INVALID_ACTION}: ${sanitizedError}`);
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
