import { AssetType, Node, JsonApi } from "@counterfactual/types";
// import ethers from "ethers";
import { Zero } from "ethers/constants";

// import { AppInstance } from "../src/app-instance";
import { NODE_REQUEST_TIMEOUT, Provider } from "../src/provider";
import {
  // CounterfactualEvent,
  // ErrorEventData,
  EventType,
  // InstallEventData,
  // RejectInstallEventData
} from "../src/types";

import { TEST_XPUBS, TestNodeProvider } from "./fixture";

describe("cf-wallet.js Provider", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  const expectedIntermediary = "0x6001600160016001600160016001600160016001";
  const TEST_APP_INSTANCE_INFO: JsonApi.Resource = {
    id: "TEST_ID",
    type: "appInstance",
    attributes: {
      asset: { assetType: AssetType.ETH },
      abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
      appId: "0x1515151515151515151515151515151515151515",
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: Zero,
      proposedByIdentifier: TEST_XPUBS[0],
      proposedToIdentifier: TEST_XPUBS[1],
      intermediaries: expectedIntermediary
    },
    relationships: {}
  };

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("throws an error on message type mismatch", async () => {
    expect.assertions(3);

    // @ts-ignore
    nodeProvider.onMethodRequest("reject:proposal", request => {
      if (!request.operations || !request.meta) return;
      expect(request.operations[0].op).toBe(Node.OpName.REJECT);
      expect(request.operations[0].ref.type).toBe(Node.TypeName.PROPOSAL);

      nodeProvider.simulateMessageFromNode({
        meta: {
          requestId: request.meta.requestId
        },
        operations: [{
          op: Node.OpName.INSTALL,
          ref: {
            type: Node.TypeName.PROPOSAL
          }
        }],
        data: {
          type: Node.TypeName.PROPOSAL,
          relationships: {},
          attributes: {
            appInstanceId: ""
          }
        }
      });
    });

    try {
      await provider.rejectInstall("foo");
    } catch (e) {
      expect(e.errors[0].code).toBe("unexpected_message_type");
    }
  });

  it("emits an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, (e) => {
      e = e as JsonApi.ErrorsDocument;
      const error = e.errors[0];
      expect(error.status).toBe(EventType.ERROR);
      expect(error.code).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      meta: {
        requestId: "test"
      },
      operations: [{
        op: Node.OpName.INSTALL,
        ref: {
          type: Node.TypeName.APP
        }
      }],
      data: TEST_APP_INSTANCE_INFO
    });
  });

  it(
    "throws an error on timeout",
    async () => {
      try {
        await provider.rejectInstall("foo");
      } catch (e) {
        e = e as JsonApi.ErrorsDocument;
        const error = e.errors[0];
        expect(error.status).toBe(EventType.ERROR);
        expect(error.code).toBe("request_timeout");
      }
    },
    NODE_REQUEST_TIMEOUT + 1000 // This could be done with fake timers.
  );

  it("throws an error when subscribing to an unknown event", async () => {
    expect.assertions(3);

    ["on", "once", "off"].forEach(methodName => {
      expect(() => provider[methodName]("fakeEvent", () => {})).toThrowError(
        '"fakeEvent" is not a valid event'
      );
    });
  });

  // describe("Node methods", () => {
  //   it("can install an app instance", async () => {
  //     expect.assertions(4);
  //     nodeProvider.onMethodRequest(Node.MethodName.INSTALL, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.INSTALL);
  //       expect((request.operations[0].params as Node.InstallParams).appInstanceId).toBe(
  //         TEST_APP_INSTANCE_INFO.id
  //       );
  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.INSTALL,
  //           ref: {
  //             type: Node.TypeName.APP
  //           }
  //         }],
  //         data: TEST_APP_INSTANCE_INFO
  //       });
  //     });
  //     const appInstance = await provider.install(TEST_APP_INSTANCE_INFO.id || "");
  //     expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
  //     expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.attributes.appId);
  //   });

  //   it("can install an app instance virtually", async () => {
  //     expect.assertions(7);

  //     nodeProvider.onMethodRequest(Node.MethodName.INSTALL_VIRTUAL, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.INSTALL_VIRTUAL);
  //       const params = request.operations[0].params as Node.InstallVirtualParams;
  //       expect(params.appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
  //       expect(params.intermediaries).toBe(expectedIntermediary);

  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.INSTALL_VIRTUAL,
  //           ref: {
  //             type: Node.TypeName.APP
  //           }
  //         }],
  //         data: TEST_APP_INSTANCE_INFO
  //       });
  //     });
  //     const appInstance = await provider.installVirtual(
  //       TEST_APP_INSTANCE_INFO.id || "",
  //       expectedIntermediary
  //     );
  //     expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
  //     expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.attributes.appId);
  //     expect(appInstance.isVirtual).toBeTruthy();
  //     expect(appInstance.intermediaries).toBe(expectedIntermediary);
  //   });

  //   it("can reject installation proposals", async () => {
  //     nodeProvider.onMethodRequest(Node.MethodName.REJECT_INSTALL, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.REJECT_INSTALL);
  //       const { appInstanceId } = request.operations[0].params as Node.RejectInstallParams;
  //       expect(appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.REJECT,
  //           ref: {
  //             type: Node.TypeName.PROPOSAL
  //           }
  //         }],
  //         data: {
  //           type: Node.TypeName.PROPOSAL,
  //           relationships: {},
  //           attributes: {
  //             appInstanceId
  //           }
  //         }
  //       });
  //     });
  //     await provider.rejectInstall(TEST_APP_INSTANCE_INFO.id || "");
  //   });

  //   it("can create a channel between two parties", async () => {
  //     nodeProvider.onMethodRequest(Node.MethodName.CREATE_CHANNEL, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.CREATE_CHANNEL);
  //       expect(request.data.attributes.owners).toEqual(TEST_XPUBS);
  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.ADD,
  //           ref: {
  //             type: Node.TypeName.CHANNEL
  //           }
  //         }],
  //         data: []
  //       });
  //     });
  //     await provider.createChannel(TEST_XPUBS);
  //   });

  //   it("can deposit eth to a channel", async () => {
  //     const channel = await provider.createChannel(TEST_XPUBS);
  //     const amount = ethers.utils.bigNumberify(".01");
  //     nodeProvider.onMethodRequest(Node.MethodName.DEPOSIT, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.DEPOSIT);
  //       expect(request.data.attributes.multisigAddress).toEqual(channel.multisigAddress);
  //       expect(request.data.attributes.amount).toEqual(amount);
  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.DEPOSIT,
  //           ref: {
  //             type: Node.TypeName.CHANNEL
  //           }
  //         }],
  //         data: []
  //       });
  //     });
  //     await provider.deposit(channel.multisigAddress, amount);
  //   });

  //   it("can withdraw eth from a channel", async () => {
  //     const channel = await provider.createChannel(TEST_XPUBS);
  //     const amount = ethers.utils.bigNumberify(".01");
  //     nodeProvider.onMethodRequest(Node.MethodName.WITHDRAW, request => {
  //       if (!request.operations || !request.meta || Array.isArray(request.data)) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.WITHDRAW);
  //       expect(request.data.attributes.multisigAddress).toEqual(channel.multisigAddress);
  //       expect(request.data.attributes.amount).toEqual(amount);
  //       nodeProvider.simulateMessageFromNode({
  //         meta: {
  //           requestId: request.meta.requestId
  //         },
  //         operations: [{
  //           op: Node.OpName.WITHDRAW,
  //           ref: {
  //             type: Node.TypeName.CHANNEL
  //           }
  //         }],
  //         data: []
  //       });
  //     });
  //     await provider.withdraw(channel.multisigAddress, amount);
  //   });

  //   it("can query for a channel's freeBalance", async () => {
  //     const channel = await provider.createChannel(TEST_XPUBS);
  //     nodeProvider.onMethodRequest(Node.MethodName.GET_FREE_BALANCE_STATE, request => {
  //       if (!request.operations || !request.meta) return;
  //       expect(request.operations[0].ref.type).toBe(Node.MethodName.GET_FREE_BALANCE_STATE);
  //       nodeProvider.simulateMessageFromNode({
  //         operations: [{
  //           op: Node.OpName.GET_FREE_BALANCE_STATE,
  //           ref: {
  //             type: Node.TypeName.CHANNEL
  //           }
  //         }],
  //         data: TEST_APP_INSTANCE_INFO
  //       });
  //     });
  //     await provider.getFreeBalanceState(channel.multisigAddress);
  //   });
  // });

  // describe("Node events", () => {
  //   it("can unsubscribe from events", async done => {
  //     const callback = (e: CounterfactualEvent) => {
  //       done.fail("Unsubscribed event listener was fired");
  //     };
  //     provider.on(EventType.REJECT_INSTALL, callback);
  //     provider.off(EventType.REJECT_INSTALL, callback);
  //     nodeProvider.simulateMessageFromNode({
  //       operations: [{
  //         op: Node.OpName.REJECT,
  //         ref: {
  //           type: Node.TypeName.PROPOSAL
  //         }
  //       }],
  //       data: TEST_APP_INSTANCE_INFO
  //     });
  //     setTimeout(done, 100);
  //   });

  //   it("can subscribe to rejectInstall events", async () => {
  //     expect.assertions(3);
  //     provider.once(EventType.REJECT_INSTALL, e => {
  //       expect(e.type).toBe(EventType.REJECT_INSTALL);
  //       const appInstance = (e.data as RejectInstallEventData).appInstance;
  //       expect(appInstance).toBeInstanceOf(AppInstance);
  //       expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
  //     });
  //     nodeProvider.simulateMessageFromNode({
  //       operations: [{
  //         op: Node.OpName.REJECT,
  //         ref: {
  //           type: Node.TypeName.PROPOSAL
  //         }
  //       }],
  //       data: TEST_APP_INSTANCE_INFO
  //     });
  //   });

  //   it("can subscribe to install events", async () => {
  //     expect.assertions(3);
  //     provider.once(EventType.INSTALL, e => {
  //       expect(e.type).toBe(EventType.INSTALL);
  //       const appInstance = (e.data as InstallEventData).appInstance;
  //       expect(appInstance).toBeInstanceOf(AppInstance);
  //       expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
  //     });

  //     await provider.getOrCreateAppInstance(
  //       TEST_APP_INSTANCE_INFO.id || ''
  //     );

  //     nodeProvider.simulateMessageFromNode({
  //       operations: [{
  //         op: Node.OpName.INSTALL,
  //         ref: {
  //           type: Node.TypeName.APP
  //         }
  //       }],
  //       data: TEST_APP_INSTANCE_INFO
  //     });
  //   });
  // });

  // describe("AppInstance management", () => {
  //   it("can expose the same AppInstance instance for a unique app instance ID", async () => {
  //     expect.assertions(1);
  //     let savedInstance: AppInstance;
  //     provider.on(EventType.REJECT_INSTALL, e => {
  //       const eventInstance = (e.data as RejectInstallEventData).appInstance;
  //       if (!savedInstance) {
  //         savedInstance = eventInstance;
  //       } else {
  //         expect(savedInstance).toBe(eventInstance);
  //       }
  //     });
  //     const msg = {
  //       operations: [{
  //         op: Node.OpName.REJECT,
  //         ref: {
  //           type: Node.TypeName.PROPOSAL
  //         }
  //       }],
  //       data: TEST_APP_INSTANCE_INFO
  //     };
  //     nodeProvider.simulateMessageFromNode(msg);
  //     nodeProvider.simulateMessageFromNode(msg);
  //   });

  //   it("can load app instance details on-demand", async () => {
  //     expect.assertions(4);

  //     provider.on(EventType.UPDATE_STATE, e => {
  //       expect((e.data as InstallEventData).appInstance.id).toBe(
  //         TEST_APP_INSTANCE_INFO.id
  //       );
  //     });

  //     nodeProvider.simulateMessageFromNode({
  //       operations: [{
  //         op: Node.OpName.UPDATE_STATE,
  //         ref: {
  //           type: Node.TypeName.APP
  //         }
  //       }],
  //       data: {
  //         id: TEST_APP_INSTANCE_INFO.id,
  //         type: Node.TypeName.APP,
  //         attributes: {
  //           newState: "3"
  //         },
  //         relationships: {}
  //       }
  //     });
  //     expect(nodeProvider.postedMessages).toHaveLength(1);
  //     const detailsRequest = nodeProvider
  //       .postedMessages[0];
  //     if (!detailsRequest.operations || !detailsRequest.meta) return;
  //     expect(detailsRequest.operations[0].ref.type).toBe(
  //       Node.MethodName.GET_APP_INSTANCE_DETAILS
  //     );
  //     expect(
  //       (detailsRequest.operations[0].params as Node.GetAppInstanceDetailsParams)
  //         .appInstanceId
  //     ).toBe(TEST_APP_INSTANCE_INFO.id);
  //     nodeProvider.simulateMessageFromNode({
  //       meta: {
  //         requestId: detailsRequest.meta.requestId
  //       },
  //       operations: [{
  //         op: Node.OpName.GET_STATE,
  //         ref: {
  //           type: Node.TypeName.APP,
  //           id: TEST_APP_INSTANCE_INFO.id
  //         }
  //       }],
  //       data: TEST_APP_INSTANCE_INFO
  //     });
  //     // NOTE: For some reason the event won't fire unless we wait for a bit
  //     await new Promise(r => setTimeout(r, 50));
  //   });
  // });
});
