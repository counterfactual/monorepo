import { instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { getAppInstanceState } from "../../src/methods/app-instance/get-state/operation";
import { Store } from "../../src/store";

import { createAppInstance } from "./utils";

describe("Can handle getState calls", () => {
  describe("uses mocked store service", () => {
    let mockedStore: Store;
    let store;
    beforeAll(() => {
      mockedStore = mock(Store);
      store = instance(mockedStore);
    });

    it("succeeds in getting the app state for an installed AppInstance", async () => {
      const appInstanceId = generateUUID();
      const appInstance = createAppInstance();

      when(
        mockedStore.getAppInstanceFromAppInstanceID(appInstanceId)
      ).thenResolve(appInstance);

      const state = await getAppInstanceState(appInstanceId, store);
      expect(state.bar).toEqual(appInstance.state.bar);
      expect(state.foo).toEqual(appInstance.state.foo);
    });
  });
});
