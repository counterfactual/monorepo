import {
  EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT,
  NetworkContext
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero, HashZero, Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { hexlify, randomBytes } from "ethers/utils";
import { anything, instance, mock, when } from "ts-mockito";

import {
  NO_APP_INSTANCE_ID_TO_INSTALL,
  NO_MULTISIG_FOR_APP_INSTANCE_ID,
  NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID
} from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { Engine, Protocol, xkeysToSortedKthAddresses } from "../../src/engine";
import { install } from "../../src/methods/app-instance/install/operation";
import { StateChannel } from "../../src/models";
import { Store } from "../../src/store";
import { getRandomExtendedPubKeys } from "../engine/integration/random-signing-keys";
import { MemoryStoreService } from "../services/memory-store-service";

import { createAppInstanceProposalForTest } from "./utils";

const NETWORK_CONTEXT_OF_ALL_ZERO_ADDRESSES = EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT.reduce(
  (acc, contractName) => ({
    ...acc,
    [contractName]: AddressZero
  }),
  {} as NetworkContext
);

describe("Can handle correct & incorrect installs", () => {
  let store: Store;
  let engine: Engine;

  beforeAll(() => {
    store = new Store(
      new MemoryStoreService(),
      "install.spec.ts-test-store",
      NETWORK_CONTEXT_OF_ALL_ZERO_ADDRESSES
    );
    engine = new Engine(
      NETWORK_CONTEXT_OF_ALL_ZERO_ADDRESSES,
      {} as BaseProvider
    );
  });

  it("fails to install with undefined appInstanceId", async () => {
    await expect(
      install(store, engine, { appInstanceId: undefined! })
    ).rejects.toThrowError(NO_APP_INSTANCE_ID_TO_INSTALL);
  });

  it("fails to install with empty string appInstanceId", async () => {
    await expect(
      install(store, engine, { appInstanceId: "" })
    ).rejects.toThrowError(NO_APP_INSTANCE_ID_TO_INSTALL);
  });

  it("fails to install without the AppInstance being proposed first", async () => {
    await expect(
      install(store, engine, { appInstanceId: HashZero })
    ).rejects.toThrowError(
      NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(HashZero)
    );
  });

  it("fails to install without the AppInstanceId being in a channel", async () => {
    expect.hasAssertions();

    const mockedStore = mock(Store);

    const appInstanceId = hexlify(randomBytes(32));
    const appInstanceProposal = createAppInstanceProposalForTest(appInstanceId);

    when(mockedStore.getAppInstanceProposal(appInstanceId)).thenResolve(
      appInstanceProposal
    );

    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenThrow(
      Error(NO_MULTISIG_FOR_APP_INSTANCE_ID)
    );

    await expect(
      install(instance(mockedStore), engine, { appInstanceId })
    ).rejects.toThrowError(NO_MULTISIG_FOR_APP_INSTANCE_ID);
  });

  it("succeeds to install a proposed AppInstance", async () => {
    const mockedEngine = mock(Engine);
    const engine = instance(mockedEngine);

    const mockedStore = mock(Store);
    const store = instance(mockedStore);

    const appInstanceId = hexlify(randomBytes(32));
    const multisigAddress = Wallet.createRandom().address;
    const extendedKeys = getRandomExtendedPubKeys(2);
    const participants = xkeysToSortedKthAddresses(extendedKeys, 0);

    const stateChannel = StateChannel.setupChannel(
      AddressZero,
      multisigAddress,
      extendedKeys
    );

    expect(
      stateChannel
        .getFreeBalanceClass()
        .getBalance(CONVENTION_FOR_ETH_TOKEN_ADDRESS, participants[0])
    ).toEqual(Zero);
    expect(
      stateChannel
        .getFreeBalanceClass()
        .getBalance(CONVENTION_FOR_ETH_TOKEN_ADDRESS, participants[1])
    ).toEqual(Zero);

    await store.saveStateChannel(stateChannel);

    const appInstanceProposal = createAppInstanceProposalForTest(appInstanceId);

    when(mockedStore.getAppInstanceProposal(appInstanceId)).thenResolve(
      appInstanceProposal
    );

    when(mockedStore.getChannelFromAppInstanceID(appInstanceId)).thenResolve(
      stateChannel
    );

    // Gets around having to register middleware into the machine
    // and just returns a basic <string, StateChannel> map with the
    // expected multisigAddress in it.
    when(
      mockedEngine.initiateProtocol(Protocol.Install, anything(), anything())
    ).thenResolve(new Map([[multisigAddress, stateChannel]]));

    // The AppInstanceProposal that's returned is the one that was installed, which
    // is the same one as the one that was proposed
    await expect(
      install(store, engine, {
        appInstanceId
      })
    ).resolves.toEqual(appInstanceProposal);
  });
});
