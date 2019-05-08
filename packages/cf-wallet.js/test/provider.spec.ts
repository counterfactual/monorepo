import {
  AppInstanceInfo,
  AssetType,
  JsonApi,
  Node
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";

import { AppInstance } from "../src/app-instance";
import { NODE_REQUEST_TIMEOUT, Provider } from "../src/provider";
import {
  CounterfactualEvent,
  ErrorEventData,
  EventType,
  InstallEventData,
  RejectInstallEventData
} from "../src/types";
import { deriveMethodName } from "../src/utils";

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
    nodeProvider.onMethodRequest(
      Node.JsonApiMethodName.REJECT_INSTALL,
      request => {
        if (!request.operations || !request.meta) return;
        expect(request.operations[0].op).toBe(Node.OpName.REJECT);
        expect(request.operations[0].ref.type).toBe(Node.TypeName.PROPOSAL);

        nodeProvider.simulateMessageFromNode({
          meta: {
            requestId: request.meta.requestId
          },
          operations: [
            {
              op: Node.OpName.INSTALL,
              ref: {
                type: Node.TypeName.PROPOSAL
              }
            }
          ],
          data: {
            type: Node.TypeName.PROPOSAL,
            relationships: {},
            attributes: {
              appInstanceId: ""
            }
          }
        });
      }
    );

    try {
      await provider.rejectInstall("foo");
    } catch (e) {
      expect(e.errors[0].code).toBe("unexpected_message_type");
    }
  });

  it("emits an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, e => {
      const data = e.data as ErrorEventData;
      expect(e.type).toBe(EventType.ERROR);
      expect(data.errorName).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      meta: {
        requestId: "test"
      },
      operations: [
        {
          op: Node.OpName.INSTALL,
          ref: {
            type: Node.TypeName.APP
          }
        }
      ],
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

  describe("Node methods", () => {
    it("can install an app instance", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.JsonApiMethodName.INSTALL, request => {
        if (!request.operations || !request.meta) return;
        expect(deriveMethodName(request.operations[0])).toBe(
          Node.JsonApiMethodName.INSTALL
        );
        expect(request.operations[0].ref.id).toBe(TEST_APP_INSTANCE_INFO.id);
        const response = Object.assign(request, {
          data: TEST_APP_INSTANCE_INFO
        });
        nodeProvider.simulateMessageFromNode(response);
      });
      const appInstance = await provider.install(
        TEST_APP_INSTANCE_INFO.id || ""
      );
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.attributes.appId);
    });

    it("can install an app instance virtually", async () => {
      expect.assertions(7);

      nodeProvider.onMethodRequest(
        Node.JsonApiMethodName.INSTALL_VIRTUAL,
        request => {
          if (
            !request.operations ||
            !request.meta ||
            !request.operations[0].data
          ) {
            return;
          }
          expect(deriveMethodName(request.operations[0])).toBe(
            Node.JsonApiMethodName.INSTALL_VIRTUAL
          );
          expect(request.operations[0].ref.id).toBe(TEST_APP_INSTANCE_INFO.id);
          expect(
            request.operations[0].data.attributes.intermediaryIdentifier
          ).toBe(expectedIntermediary);

          const response = Object.assign(request, {
            data: TEST_APP_INSTANCE_INFO
          });
          nodeProvider.simulateMessageFromNode(response);
        }
      );
      const appInstance = await provider.installVirtual(
        TEST_APP_INSTANCE_INFO.id || "",
        expectedIntermediary
      );
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.attributes.appId);
      expect(appInstance.isVirtual).toBeTruthy();
      expect(appInstance.intermediaries).toBe(expectedIntermediary);
    });

    it("can reject installation proposals", async () => {
      expect.assertions(2);

      nodeProvider.onMethodRequest(
        Node.JsonApiMethodName.REJECT_INSTALL,
        request => {
          if (
            !request.operations ||
            !request.meta ||
            !request.operations[0].data
          ) {
            return;
          }
          expect(deriveMethodName(request.operations[0])).toBe(
            Node.JsonApiMethodName.REJECT_INSTALL
          );
          expect(request.operations[0].data.attributes.appInstanceId).toBe(
            TEST_APP_INSTANCE_INFO.id
          );

          const response = Object.assign(request, {
            data: TEST_APP_INSTANCE_INFO
          });
          nodeProvider.simulateMessageFromNode(response);
        }
      );
      await provider.rejectInstall(TEST_APP_INSTANCE_INFO.id || "");
    });

    it("can create a channel between two parties", async () => {
      expect.assertions(3);

      nodeProvider.onMethodRequest(
        Node.JsonApiMethodName.CREATE_CHANNEL,
        request => {
          if (
            !request.operations ||
            !request.meta ||
            !request.operations[0].data
          ) {
            return;
          }
          expect(deriveMethodName(request.operations[0])).toBe(
            Node.JsonApiMethodName.CREATE_CHANNEL
          );
          expect(request.operations[0].data.attributes.owners).toEqual(
            TEST_XPUBS
          );

          const response = Object.assign(request, {
            data: request.operations[0].data
          });
          nodeProvider.simulateMessageFromNode(response);
        }
      );

      const response = await provider.createChannel(TEST_XPUBS);
      expect(response.owners).toEqual(TEST_XPUBS);
    });

    it("can deposit eth to a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "multisig_address";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.JsonApiMethodName.DEPOSIT, request => {
        if (
          !request.operations ||
          !request.meta ||
          !request.operations[0].data
        ) {
          return;
        }
        expect(deriveMethodName(request.operations[0])).toBe(
          Node.JsonApiMethodName.DEPOSIT
        );
        expect(request.operations[0].data.attributes.multisigAddress).toEqual(
          multisigAddress
        );
        expect(request.operations[0].data.attributes.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode(request);
      });

      await provider.deposit(multisigAddress, amount);
    });

    it("can withdraw eth from a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "multisig_address";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.JsonApiMethodName.WITHDRAW, request => {
        if (
          !request.operations ||
          !request.meta ||
          !request.operations[0].data
        ) {
          return;
        }
        expect(deriveMethodName(request.operations[0])).toBe(
          Node.JsonApiMethodName.WITHDRAW
        );
        expect(request.operations[0].data.attributes.multisigAddress).toEqual(
          multisigAddress
        );
        expect(request.operations[0].data.attributes.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode(request);
      });

      await provider.withdraw(multisigAddress, amount);
    });

    it("can query for a channel's freeBalance", async () => {
      expect.assertions(3);

      const multisigAddress = "multisig_address";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(
        Node.JsonApiMethodName.GET_FREE_BALANCE_STATE,
        request => {
          if (
            !request.operations ||
            !request.meta ||
            !request.operations[0].data
          ) {
            return;
          }
          expect(deriveMethodName(request.operations[0])).toBe(
            Node.JsonApiMethodName.GET_FREE_BALANCE_STATE
          );
          expect(request.operations[0].data.attributes.multisigAddress).toEqual(
            multisigAddress
          );

          const response = Object.assign(request, {
            data: {
              id: "foo",
              type: Node.TypeName.CHANNEL,
              attributes: {
                address: amount
              },
              relationships: {}
            }
          });
          nodeProvider.simulateMessageFromNode(response);
        }
      );

      const response = await provider.getFreeBalanceState(multisigAddress);
      expect(response.address).toEqual(amount);
    });
  });

  describe("Node events", () => {
    it("can unsubscribe from events", async done => {
      const callback = (e: CounterfactualEvent) => {
        done.fail("Unsubscribed event listener was fired");
      };
      provider.on(EventType.REJECT_INSTALL, callback);
      provider.off(EventType.REJECT_INSTALL, callback);
      nodeProvider.simulateMessageFromNode({
        operations: [
          {
            op: Node.OpName.REJECT,
            ref: {
              type: Node.TypeName.PROPOSAL
            }
          }
        ],
        data: TEST_APP_INSTANCE_INFO
      });
      setTimeout(done, 100);
    });

    it("can subscribe to rejectInstall events", async () => {
      expect.assertions(3);
      provider.once(EventType.REJECT_INSTALL, e => {
        expect(e.type).toBe(EventType.REJECT_INSTALL);
        const appInstance = (e.data as RejectInstallEventData).appInstance;
        expect(appInstance).toBeInstanceOf(AppInstance);
        expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      });
      nodeProvider.simulateMessageFromNode({
        operations: [
          {
            op: Node.OpName.REJECT,
            ref: {
              type: Node.TypeName.PROPOSAL
            }
          }
        ],
        data: TEST_APP_INSTANCE_INFO
      });
    });

    it("can subscribe to install events", async () => {
      expect.assertions(3);
      provider.once(EventType.INSTALL, e => {
        expect(e.type).toBe(EventType.INSTALL);
        const appInstance = (e.data as InstallEventData).appInstance;
        expect(appInstance).toBeInstanceOf(AppInstance);
        expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      });

      await provider.getOrCreateAppInstance(
        TEST_APP_INSTANCE_INFO.id || "",
        TEST_APP_INSTANCE_INFO.attributes as AppInstanceInfo
      );

      nodeProvider.simulateMessageFromNode({
        operations: [
          {
            op: Node.OpName.INSTALL,
            ref: {
              type: Node.TypeName.APP
            }
          }
        ],
        data: TEST_APP_INSTANCE_INFO
      });
    });
  });

  describe("AppInstance management", () => {
    it("can expose the same AppInstance instance for a unique app instance ID", async () => {
      expect.assertions(1);
      let savedInstance: AppInstance;
      provider.on(EventType.REJECT_INSTALL, e => {
        const eventInstance = (e.data as RejectInstallEventData).appInstance;
        if (!savedInstance) {
          savedInstance = eventInstance;
        } else {
          expect(savedInstance).toBe(eventInstance);
        }
      });
      const msg = {
        operations: [
          {
            op: Node.OpName.REJECT,
            ref: {
              type: Node.TypeName.PROPOSAL
            }
          }
        ],
        data: TEST_APP_INSTANCE_INFO
      };
      nodeProvider.simulateMessageFromNode(msg);
      nodeProvider.simulateMessageFromNode(msg);
    });
  });
});
