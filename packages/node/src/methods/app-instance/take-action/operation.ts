import { AppInstance } from "@counterfactual/machine";
import { AppState } from "@counterfactual/types";
import { Contract } from "ethers";
import { Provider } from "ethers/providers";

import { ERRORS } from "../../errors";

export async function updateAppInstanceState(
  appInstance: AppInstance,
  action: any,
  provider: Provider
): Promise<AppState> {
  if (
    !appInstance.appInterface.addr ||
    appInstance.appInterface.addr.trim() === ""
  ) {
    return Promise.reject(ERRORS.NO_APP_CONTRACT_ADDR);
  }

  const abi = [
    `function applyAction(${appInstance.appInterface.stateEncoding}, ${
      appInstance.appInterface.actionEncoding
    }) pure returns (bytes)`
  ];
  const appContract = new Contract(
    appInstance.appInterface.addr,
    abi,
    provider
  );

  try {
    return appInstance.decodeState(
      await appContract.functions.applyAction(appInstance.state, action)
    );
  } catch (e) {}
}
