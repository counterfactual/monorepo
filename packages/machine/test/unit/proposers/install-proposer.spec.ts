import { legacy } from "@counterfactual/cf.js";
import {
  AppIdentity,
  AppInterface,
  AssetType,
  ETHBucketAppState,
  Terms
} from "@counterfactual/types";
import { ethers } from "ethers";

import { InstallProposer } from "../../../src/middleware/state-transition/install-proposer";
import { Node, StateChannelInfoImpl } from "../../../src/node";
import { Opcode } from "../../../src/opcodes";
import { InternalMessage, StateProposal } from "../../../src/types";
import { appIdentityToHash } from "../../../src/utils/app-identity";
import { APP_INTERFACE, TERMS } from "../../../src/utils/encodings";
import {
  freeBalanceTerms,
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../../src/utils/free-balance";
import {
  A_ADDRESS,
  B_ADDRESS,
  UNUSED_FUNDED_ACCOUNT
} from "../../test-helpers/environment";

const {
  bigNumberify,
  hexlify,
  randomBytes,
  getAddress,
  keccak256,
  defaultAbiCoder
} = ethers.utils;

const { WeiPerEther, AddressZero } = ethers.constants;

describe("Install Proposer", () => {
  let proposal: StateProposal;

  // Test network context
  const networkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  // General interaction testing values
  const interaction = {
    sender: A_ADDRESS,
    receiver: B_ADDRESS
  };

  // State channel testing values
  const stateChannel = {
    multisigAddress: UNUSED_FUNDED_ACCOUNT,
    multisigOwners: [interaction.sender, interaction.receiver]
  };

  // App-to-be-installed test values
  const app = {
    stateEncoding: "tuple(address foo, uint256 bar)",

    interface: {
      addr: getAddress(hexlify(randomBytes(20))),
      applyAction: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4)),
      getTurnTaker: hexlify(randomBytes(4))
    } as AppInterface,

    terms: {
      assetType: AssetType.ETH,
      limit: bigNumberify(8),
      token: AddressZero
    } as Terms,

    identity: {
      /* assignment done below to reuse app.{interface, terms} values */
    } as AppIdentity,

    initialState: "" // assignment done below to reuse app.stateEncoding
  };

  app.identity = {
    owner: stateChannel.multisigAddress,
    signingKeys: [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ].sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1)),
    appInterfaceHash: keccak256(
      defaultAbiCoder.encode([APP_INTERFACE], [app.interface])
    ),
    termsHash: keccak256(defaultAbiCoder.encode([TERMS], [app.terms])),
    defaultTimeout: 100
  };

  app.initialState = defaultAbiCoder.encode(
    [app.stateEncoding],
    [{ foo: AddressZero, bar: 0 }]
  );

  // Test free balance values
  const freeBalance = {
    uniqueAppNonceWithinStateChannel: 0,

    currentLocalNonce: 10,

    defaultTimeout: 100,

    appIdentity: {
      owner: stateChannel.multisigAddress,
      signingKeys: stateChannel.multisigOwners,
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    } as AppIdentity,

    terms: freeBalanceTerms,

    updatedState: {
      alice: stateChannel.multisigOwners[0],
      bob: stateChannel.multisigOwners[1],
      aliceBalance: WeiPerEther.div(2),
      bobBalance: WeiPerEther.div(2)
    } as ETHBucketAppState
  };

  beforeAll(() => {
    const message = new InternalMessage(
      legacy.node.ActionName.INSTALL,
      Opcode.STATE_TRANSITION_PROPOSE,
      {
        appInstanceId: "0",
        action: legacy.node.ActionName.INSTALL,
        data: {
          peerA: new legacy.utils.PeerBalance(interaction.sender, 5),
          peerB: new legacy.utils.PeerBalance(interaction.receiver, 3),
          keyA: app.identity.signingKeys[0],
          keyB: app.identity.signingKeys[1],
          // TODO: (question) Is this supposed to be for the free bal?
          encodedAppState: app.initialState,
          // TODO: Get rid of legacy.app.Terms
          terms: new legacy.app.Terms(
            app.terms.assetType,
            app.terms.limit,
            app.terms.token
          ),
          // TODO: Get rid of legacy.app.AppInterface
          app: new legacy.app.AppInterface(
            app.interface.addr,
            app.interface.applyAction,
            app.interface.resolve,
            app.interface.getTurnTaker,
            app.interface.isStateTerminal,
            // TODO: (question) why isn't there an actionEncoding field?
            app.stateEncoding
          ),
          timeout: app.identity.defaultTimeout
        },
        multisigAddress: stateChannel.multisigAddress,
        fromAddress: interaction.sender,
        toAddress: interaction.receiver,
        seq: 0
      }
    );

    proposal = InstallProposer.propose(
      message,
      {
        intermediateResults: {
          inbox: [],
          outbox: []
        },
        // NOTE: This is a hack to avoid typescript
        instructionExecutor: Object.create(null)
      },
      new Node(
        {
          [stateChannel.multisigAddress]: new StateChannelInfoImpl(
            interaction.sender,
            interaction.receiver,
            stateChannel.multisigAddress,
            {},
            new legacy.utils.FreeBalance(
              stateChannel.multisigOwners[0],
              bigNumberify(20),
              stateChannel.multisigOwners[1],
              bigNumberify(20),
              freeBalance.currentLocalNonce, // local nonce
              // Whys is "uniqueId" a number?
              0, // TODO: appIdentityToHash(freeBalance.appIdentity),
              freeBalance.defaultTimeout, // timeout
              new legacy.utils.Nonce(true, 0, 0) // nonce
            )
          )
        },
        {}
      )
    );
  });

  it("should return an object with one key, the multisig address", () => {
    const { state } = proposal;
    expect(Object.keys(state).length).toEqual(1);
    expect(Object.keys(state)[0]).toBe(stateChannel.multisigAddress);
  });

  describe("the generated proposed state", () => {
    let multisigAddress: string;
    let freeBalance: legacy.utils.FreeBalance;
    let me: string;
    let appInstances: legacy.app.AppInstanceInfos;
    let counterParty: string;

    beforeAll(() => {
      const info = proposal.state[stateChannel.multisigAddress];
      multisigAddress = info.multisigAddress;
      freeBalance = info.freeBalance;
      me = info.me;
      counterParty = info.counterParty;
      appInstances = info.appInstances;
    });

    it("should set the free balance to some random numbers lol", () => {
      expect(freeBalance.aliceBalance).toEqual(bigNumberify(15));
      expect(freeBalance.bobBalance).toEqual(bigNumberify(17));
    });

    it("should set the open app instances to be of length 1 (the new app)", () => {
      expect(Object.keys(appInstances).length).toEqual(1);
    });

    it("should return correct channel metadata", () => {
      expect(multisigAddress).toBe(stateChannel.multisigAddress);
      expect(me).toBe(interaction.sender);
      expect(counterParty).toBe(interaction.receiver);
    });

    describe("the proposed AppInstance", () => {
      let appInstance: legacy.app.AppInstanceInfo;

      beforeAll(() => {
        appInstance = Object.values(appInstances)[0];
      });

      it("should set the id correctly", () => {
        const expectedId = appIdentityToHash(app.identity);
        expect(Object.keys(appInstances)[0]).toEqual(expectedId);
        expect(appInstances[expectedId].id).toEqual(expectedId);
      });

      it("should compute the subdeposits correctly", () => {
        expect(appInstance.peerA.address).toEqual(interaction.sender);
        expect(appInstance.peerA.balance).toEqual(bigNumberify(5));
        expect(appInstance.peerB.address).toEqual(interaction.receiver);
        expect(appInstance.peerB.balance).toEqual(bigNumberify(3));
      });

      it("should return the proposed encoded state", () => {
        expect(appInstance.encodedState).toEqual(app.initialState);
      });

      it("should start the nonce at 1", () => {
        expect(appInstance.localNonce).toEqual(1);
      });

      it("should use the default timeout for the new apps initial state", () => {
        expect(appInstance.timeout).toEqual(app.identity.defaultTimeout);
      });

      it("should use the terms provided", () => {
        expect(appInstance.terms.assetType).toEqual(AssetType.ETH);
        expect(appInstance.terms.limit).toEqual(app.terms.limit);
        expect(appInstance.terms.token).toEqual(app.terms.token);
      });

      it("should use the app interface provided", () => {
        expect(appInstance.cfApp.address).toEqual(app.interface.addr);
        expect(appInstance.cfApp.applyAction).toEqual(
          app.interface.applyAction
        );
        expect(appInstance.cfApp.resolve).toEqual(app.interface.resolve);
        expect(appInstance.cfApp.getTurnTaker).toEqual(
          app.interface.getTurnTaker
        );
        expect(appInstance.cfApp.isStateTerminal).toEqual(
          app.interface.isStateTerminal
        );
      });

      it("should set the dependency nonce to some random number", () => {
        const expectedSalt =
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6";
        expect(appInstance.dependencyNonce.salt).toEqual(expectedSalt);
        expect(appInstance.dependencyNonce.nonceValue).toEqual(0);
      });
    });
  });
});
