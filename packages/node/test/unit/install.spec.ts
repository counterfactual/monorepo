import { Wallet } from "ethers";
import { AddressZero } from "ethers/constants";
import { instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { install } from "../../src/methods/app-instance/install/operation";
import { ERRORS } from "../../src/methods/errors";
import { openStateChannel } from "../../src/methods/state-channel/create/instance";
import { Store } from "../../src/store";
import { EMPTY_NETWORK } from "../integration/utils";
import memoryStoreService from "../services/memory-store-service";

import { createProposedAppInstanceInfo } from "./utils";

describe("Can handle correct & incorrect installs", () => {
  const storeKeyPrefix = "store";

  it("fails to install without appInstanceId", () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    const params = { appInstanceId: undefined };
    // ignoring here to simulate an undefined `appInstanceId` being passed in
    // @ts-ignore
    expect(install(store, params)).rejects.toEqual(
      ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL
    );
  });

  it("fails to install without appInstanceId", () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    const params = { appInstanceId: "" };
    expect(install(store, params)).rejects.toEqual(
      ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL
    );
  });

  it("fails to install without the AppInstance being proposed first", async () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    expect(install(store, { appInstanceId: generateUUID() })).rejects.toEqual(
      ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID
    );
  });

  it("fails to install without the AppInstanceId being in a channel", () => {
    expect.hasAssertions();

    const mockedStore = mock(Store);
    const store = instance(mockedStore);

    const appInstanceId = generateUUID();
    const proposedAppInstanceInfo = createProposedAppInstanceInfo(
      appInstanceId
    );

    when(mockedStore.getProposedAppInstanceInfo(appInstanceId)).thenResolve(
      proposedAppInstanceInfo
    );
    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenReject(
      ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
    );

    expect(install(store, { appInstanceId })).rejects.toEqual(
      ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
    );
  });

  it("succeeds to install a proposed AppInstance", async () => {
    const mockedStore = mock(Store);
    const store = instance(mockedStore);

    const appInstanceId = generateUUID();
    const multisigAddress = Wallet.createRandom().address;
    const owners = [Wallet.createRandom().address, AddressZero];
    const stateChannel = await openStateChannel(
      multisigAddress,
      owners,
      store,
      EMPTY_NETWORK
    );

    const proposedAppInstanceInfo = createProposedAppInstanceInfo(
      appInstanceId
    );

    when(mockedStore.getProposedAppInstanceInfo(appInstanceId)).thenResolve(
      proposedAppInstanceInfo
    );
    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenResolve(
      stateChannel
    );

    // The AppInstanceInfo that's returned is the one that was installed, which
    // is the same one as the one that was proposed
    expect(install(store, { appInstanceId })).resolves.toEqual(
      proposedAppInstanceInfo
    );
  });
});
