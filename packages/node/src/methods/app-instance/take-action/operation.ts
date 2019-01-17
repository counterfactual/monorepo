import { AppInstance } from "@counterfactual/machine";
import { Contract } from "ethers";
import { Provider } from "ethers/providers";

import { ERRORS } from "../../errors";

export async function updateAppInstance(
  appInstance: AppInstance,
  action: any,
  provider: Provider
): Promise<AppInstance> {
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

  const newState = appInstance.decodeState(
    await appContract.functions.applyAction(appInstance.state, action)
  );

  return appInstance.setState(newState);
}
