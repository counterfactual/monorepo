import {
  AppABIEncodings,
  AppState,
  AssetType,
  BlockchainAsset
} from "@counterfactual/types";
import dotenv from "dotenv-extended";
import { Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { instance, mock, when } from "ts-mockito";
import { v4 as generateUUID } from "uuid";

import { ERRORS, install } from "../../src/methods/install-operations";
import { openStateChannel } from "../../src/methods/multisig-operations";
import { ProposedAppInstanceInfo } from "../../src/models";
import { Store, STORE_ERRORS } from "../../src/store";
import { EMPTY_NETWORK } from "../integration/utils";
import MEMORY_STORE_SERVICE from "../services/memory-store-service";

dotenv.load();

describe("Can handle correct & incorrect installs", () => {
  const storeKeyPrefix = "store";

  it("fails to install without appInstanceId", () => {
    const store = new Store(MEMORY_STORE_SERVICE, storeKeyPrefix);
    const params = { appInstanceId: "" };
    expect(install(store, params)).rejects.toEqual(ERRORS.NO_APP_INSTANCE_ID);
  });

  it("fails to install without the AppInstance being proposed first", async () => {
    const store = new Store(MEMORY_STORE_SERVICE, storeKeyPrefix);
    const params = { appInstanceId: generateUUID() };
    expect(install(store, params)).rejects.toEqual(
      STORE_ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID
    );
  });

  it("fails to install without the AppInstanceId being in a channel", async () => {
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
      STORE_ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID
    );

    const params = { appInstanceId };
    try {
      await install(store, params);
    } catch (e) {
      expect(e).toEqual(STORE_ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
    }
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

    const params = { appInstanceId };
    // The AppInstanceInfo that's returned is the one that was installed, which
    // is the same one as the one that was proposed
    expect(await install(store, params)).toEqual(proposedAppInstanceInfo);
  });
});

function createProposedAppInstanceInfo(appInstanceId: string) {
  return new ProposedAppInstanceInfo(appInstanceId, {
    appId: AddressZero,
    abiEncodings: {
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    } as AppABIEncodings,
    asset: {
      assetType: AssetType.ETH
    } as BlockchainAsset,
    myDeposit: Zero,
    peerDeposit: Zero,
    timeout: One,
    initialState: {
      foo: AddressZero,
      bar: 0
    } as AppState
  });
}
