import { AppInstanceInfo, Node } from "@counterfactual/types";
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

import { TEST_OWNERS, TEST_XPUBS, TestNodeProvider } from "./fixture";

describe("CF.js Provider", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    id: "TEST_ID",
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appDefinition: "0x1515151515151515151515151515151515151515",
    myDeposit: Zero,
    peerDeposit: Zero,
    timeout: Zero,
    proposedByIdentifier: TEST_XPUBS[0],
    proposedToIdentifier: TEST_XPUBS[1]
  };

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("throws generic errors coming from Node", async () => {
    expect.assertions(2);

    nodeProvider.onMethodRequest(
      Node.MethodName.GET_FREE_BALANCE_STATE,
      request => {
        expect(request.type).toBe(Node.MethodName.GET_FREE_BALANCE_STATE);

        nodeProvider.simulateMessageFromNode({
          requestId: request.requestId,
          type: Node.ErrorType.ERROR,
          data: { errorName: "music_too_loud", message: "Music too loud" }
        });
      }
    );

    try {
      await provider.getFreeBalanceState("foo");
    } catch (e) {
      expect(e.data.message).toBe("Music too loud");
    }
  });

  it("throws an error on message type mismatch", async () => {
    expect.assertions(2);

    nodeProvider.onMethodRequest(
      Node.MethodName.GET_FREE_BALANCE_STATE,
      request => {
        expect(request.type).toBe(Node.MethodName.GET_FREE_BALANCE_STATE);

        nodeProvider.simulateMessageFromNode({
          requestId: request.requestId,
          type: Node.MethodName.PROPOSE_INSTALL,
          result: { appInstanceId: "" }
        });
      }
    );

    try {
      await provider.getFreeBalanceState("foo");
    } catch (e) {
      expect(e.data.errorName).toBe("unexpected_message_type");
    }
  });

  it("emits an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.INSTALL,
      requestId: "test",
      result: {
        appInstanceId: ""
      }
    });
  });

  it(
    "throws an error on timeout",
    async () => {
      try {
        await provider.getFreeBalanceState("foo");
      } catch (err) {
        expect(err.type).toBe(EventType.ERROR);
        expect(err.data.errorName).toBe("request_timeout");
      }
    },
    NODE_REQUEST_TIMEOUT + 1000 // This could be done with fake timers.
  );

  describe("Node methods", () => {
    it("can install an app instance", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.MethodName.INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.INSTALL);
        expect((request.params as Node.InstallParams).appInstanceId).toBe(
          TEST_APP_INSTANCE_INFO.id
        );
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.INSTALL,
          requestId: request.requestId,
          result: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        });
      });
      const appInstance = await provider.install(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
    });

    it("can install an app instance virtually", async () => {
      expect.assertions(7);
      const expectedIntermediaries = [
        "0x6001600160016001600160016001600160016001"
      ];

      nodeProvider.onMethodRequest(Node.MethodName.INSTALL_VIRTUAL, request => {
        expect(request.type).toBe(Node.MethodName.INSTALL_VIRTUAL);
        const params = request.params as Node.InstallVirtualParams;
        expect(params.appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
        expect(params.intermediaries).toBe(expectedIntermediaries);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.INSTALL_VIRTUAL,
          requestId: request.requestId,
          result: {
            appInstance: {
              intermediaries: expectedIntermediaries,
              ...TEST_APP_INSTANCE_INFO
            }
          }
        });
      });
      const appInstance = await provider.installVirtual(
        TEST_APP_INSTANCE_INFO.id,
        expectedIntermediaries
      );
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
      expect(appInstance.isVirtual).toBeTruthy();
      expect(appInstance.intermediaries).toBe(expectedIntermediaries);
    });

    it("can reject installation proposals", async () => {
      nodeProvider.onMethodRequest(Node.MethodName.REJECT_INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.REJECT_INSTALL);
        const { appInstanceId } = request.params as Node.RejectInstallParams;
        expect(appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.REJECT_INSTALL,
          requestId: request.requestId,
          result: {}
        });
      });
      await provider.rejectInstall(TEST_APP_INSTANCE_INFO.id);
    });

    it("can create a channel between two parties", async () => {
      expect.assertions(3);

      const transactionHash =
        "0x58e5a0fc7fbc849eddc100d44e86276168a8c7baaa5604e44ba6f5eb8ba1b7eb";

      nodeProvider.onMethodRequest(Node.MethodName.CREATE_CHANNEL, request => {
        expect(request.type).toBe(Node.MethodName.CREATE_CHANNEL);
        const { owners } = request.params as Node.CreateChannelParams;
        expect(owners).toBe(TEST_OWNERS);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.CREATE_CHANNEL,
          requestId: request.requestId,
          result: {
            transactionHash
          }
        });
      });

      const response = await provider.createChannel(TEST_OWNERS);
      expect(response).toEqual(transactionHash);
    });

    it("can deposit eth to a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.MethodName.DEPOSIT, request => {
        expect(request.type).toBe(Node.MethodName.DEPOSIT);
        const params = request.params as Node.DepositParams;
        expect(params.multisigAddress).toEqual(multisigAddress);
        expect(params.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.DEPOSIT,
          requestId: request.requestId,
          result: {}
        });
      });

      await provider.deposit(multisigAddress, amount);
    });

    it("can withdraw eth from a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.MethodName.WITHDRAW, request => {
        expect(request.type).toBe(Node.MethodName.WITHDRAW);
        const params = request.params as Node.WithdrawParams;
        expect(params.multisigAddress).toEqual(multisigAddress);
        expect(params.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.WITHDRAW,
          requestId: request.requestId,
          result: {}
        });
      });

      await provider.withdraw(multisigAddress, amount, TEST_OWNERS[0]);
    });

    it("can query for a channel's freeBalance", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(
        Node.MethodName.GET_FREE_BALANCE_STATE,
        request => {
          expect(request.type).toBe(Node.MethodName.GET_FREE_BALANCE_STATE);
          const params = request.params as Node.GetFreeBalanceStateParams;
          expect(params.multisigAddress).toEqual(multisigAddress);

          nodeProvider.simulateMessageFromNode({
            type: Node.MethodName.GET_FREE_BALANCE_STATE,
            requestId: request.requestId,
            result: {
              [TEST_OWNERS[0]]: amount
            }
          });
        }
      );

      const response = await provider.getFreeBalanceState(multisigAddress);
      expect(response[TEST_OWNERS[0]]).toEqual(amount);
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
        type: Node.MethodName.REJECT_INSTALL,
        requestId: "1",
        result: {
          appInstanceId: "TEST"
        }
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
        type: Node.EventName.REJECT_INSTALL,
        data: {
          appInstance: TEST_APP_INSTANCE_INFO
        }
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
        TEST_APP_INSTANCE_INFO.id,
        TEST_APP_INSTANCE_INFO
      );

      nodeProvider.simulateMessageFromNode({
        type: Node.EventName.INSTALL,
        data: {
          appInstanceId: TEST_APP_INSTANCE_INFO.id
        }
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
        type: Node.EventName.REJECT_INSTALL,
        data: {
          appInstance: TEST_APP_INSTANCE_INFO
        }
      };
      nodeProvider.simulateMessageFromNode(msg);
      nodeProvider.simulateMessageFromNode(msg);
    });
  });
});
