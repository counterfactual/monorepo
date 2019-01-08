import dotenv from "dotenv-extended";
import { instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { getAppInstanceState } from "../../src/methods/app-instance-operations";
import { ERRORS } from "../../src/methods/errors";
import { Store } from "../../src/store";
import memoryStoreService from "../services/memory-store-service";

dotenv.load();

describe("Can successfully and unsuccessfully handle getState calls", () => {
  const storeKeyPrefix = "store";

  describe("uses memory-based store service", () => {
    it("fails to getState for non-existent AppInstance", async () => {
      const store = new Store(memoryStoreService, storeKeyPrefix);
      // ignoring here to simulate an undefined `appInstanceId` being passed in
      // @ts-ignore
      const params = { appInstanceId: undefined };
      expect(getAppInstanceState(generateUUID(), store)).rejects.toEqual(
        ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
      );
    });
  });

  describe("uses mocked store service", () => {
    let mockedStore: Store;
    let store;
    beforeAll(() => {
      mockedStore = mock(Store);
      store = instance(mockedStore);
    });

    it("fails to getState for AppInstance, as the AppInstance is not installed in any StateChannel", async () => {
      const appInstanceId = generateUUID();
      when(mockedStore.getMultisigAddressFromAppInstanceID(appInstanceId))
        // return value is null if no channel exists for that ID
        // @ts-ignore
        .thenResolve(null);
      expect(getAppInstanceState(appInstanceId, store)).rejects.toEqual(
        ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
      );
    });
  });
});
