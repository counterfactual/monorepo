import { InstructionExecutor, StateChannel } from "@counterfactual/machine";
import { AssetType } from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { anything, instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { install } from "../../src/methods/app-instance/install/operation";
import { ERRORS } from "../../src/methods/errors";
import { Store } from "../../src/store";
import { EMPTY_NETWORK } from "../integration/utils";
import memoryStoreService from "../services/memory-store-service";

import { createProposedAppInstanceInfo } from "./utils";

describe("Can handle correct & incorrect installs", () => {
  const storeKeyPrefix = "store";

  it("fails to install without appInstanceId", async () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    const instructionExecutor = new InstructionExecutor(EMPTY_NETWORK);
    await expect(
      install(store, instructionExecutor, AddressZero, AddressZero, {
        appInstanceId: undefined! // Simulate an undefined `appInstanceId`
      })
    ).rejects.toEqual(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  });

  it("fails to install without appInstanceId", async () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    const instructionExecutor = new InstructionExecutor(EMPTY_NETWORK);
    const params = { appInstanceId: "" };
    await expect(
      install(store, instructionExecutor, AddressZero, AddressZero, params)
    ).rejects.toEqual(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  });

  it("fails to install without the AppInstance being proposed first", async () => {
    const store = new Store(memoryStoreService, storeKeyPrefix);
    const instructionExecutor = new InstructionExecutor(EMPTY_NETWORK);
    await expect(
      install(store, instructionExecutor, AddressZero, AddressZero, {
        appInstanceId: generateUUID()
      })
    ).rejects.toEqual(ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID);
  });

  it("fails to install without the AppInstanceId being in a channel", async () => {
    expect.hasAssertions();

    const instructionExecutor = new InstructionExecutor(EMPTY_NETWORK);

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

    await expect(
      install(store, instructionExecutor, AddressZero, AddressZero, {
        appInstanceId
      })
    ).rejects.toEqual(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  });

  it("succeeds to install a proposed AppInstance", async () => {
    const mockedInstructionExecutor = mock(InstructionExecutor);
    const instructionExecutor = instance(mockedInstructionExecutor);

    const mockedStore = mock(Store);
    const store = instance(mockedStore);

    const appInstanceId = generateUUID();
    const multisigAddress = Wallet.createRandom().address;
    const owners = [Wallet.createRandom().address, AddressZero];

    const stateChannel = StateChannel
      .setupChannel(EMPTY_NETWORK, multisigAddress, owners);

    const fbState = stateChannel.getFreeBalanceFor(AssetType.ETH).state;

    expect(fbState.alice === owners[1]);
    expect(fbState.bob === owners[0]);
    expect(fbState.aliceBalance).toEqual(Zero);
    expect(fbState.bobBalance).toEqual(Zero);

    await store.saveStateChannel(stateChannel);

    const proposedAppInstanceInfo = createProposedAppInstanceInfo(
      appInstanceId
    );

    when(mockedStore.getProposedAppInstanceInfo(appInstanceId)).thenResolve(
      proposedAppInstanceInfo
    );

    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenResolve(
      stateChannel
    );

    // Gets around having to register middleware into the machine
    // and just returns a basic <string, StateChannel> map with the
    // expected multisigAddress in it.
    when(
      mockedInstructionExecutor.runInstallProtocol(anything(), anything())
    ).thenResolve(new Map([[multisigAddress, stateChannel]]));

    // The AppInstanceInfo that's returned is the one that was installed, which
    // is the same one as the one that was proposed
    await expect(
      install(store, instructionExecutor, AddressZero, AddressZero, {
        appInstanceId
      })
    ).resolves.toEqual(proposedAppInstanceInfo);
  });
});
