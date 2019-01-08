import dotenv from "dotenv-extended";
import { v4 as generateUUID } from "uuid";

import { ERRORS, install } from "../../src/methods/install-operations";
import { Store, STORE_ERRORS } from "../../src/store";
import MEMORY_STORE_SERVICE from "../services/memory-store-service";

dotenv.load();

describe("Can handle correct & incorrect installs", () => {
  const storeKeyPrefix = "store";
  let store: Store;
  beforeAll(() => {
    store = new Store(MEMORY_STORE_SERVICE, storeKeyPrefix);
  });

  it("fails to install without appInstanceId", () => {
    const params = { appInstanceId: "" };
    expect(install(store, params)).rejects.toEqual(ERRORS.NO_APP_INSTANCE_ID);
  });

  it("fails to install without the AppInstance being proposed first", async () => {
    const params = { appInstanceId: generateUUID() };
    expect(install(store, params)).rejects.toEqual(
      STORE_ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID
    );
  });

  // it("fails to install without the AppInstanceId being in a channel", () => {
  //   const params = { appInstanceId: generateUUID() };
  //   expect(install(store, params)).rejects.toEqual(
  //     STORE_ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
  //   );
  // });
});
