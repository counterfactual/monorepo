import { SolidityABIEncoderV2Struct } from "@counterfactual/types";

import { Store } from "../../../store";

export async function getAppInstanceState(
  appInstanceId: string,
  store: Store
): Promise<SolidityABIEncoderV2Struct> {
  const appInstance = await store.getAppInstanceFromAppInstanceID(
    appInstanceId
  );

  return appInstance.state;
}
