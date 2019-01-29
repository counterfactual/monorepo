import { SolidityABIEncoderV2Struct } from "@counterfactual/types";

import { Store } from "../../../store";

export async function getAppInstanceState(
  appInstanceId: string,
  store: Store
): Promise<SolidityABIEncoderV2Struct> {
  const appInstance = await store.getAppInstanceFromAppInstanceID(
    appInstanceId
  );

  // NOTE: this is important in the test cases currently because
  //       it changes `BigNumber` values to `object` values, which
  //       you get when fetching from the DB, which most tests
  //       check against.
  //
  //       The more performant way of doing this is:
  //
  //       ```
  //       return appInstance.state
  //       ```
  return appInstance.decodeAppState(appInstance.encodedLatestState);
}
