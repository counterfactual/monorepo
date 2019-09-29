import { AppInstanceInfo, Node } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";
import { JsonRpcNotification } from "rpc-server";

import { AppInstance } from "../src/app-instance";
import { NODE_REQUEST_TIMEOUT, Provider } from "../src/provider";
import {
  ErrorEventData,
  EventType,
  InstallEventData,
  RejectInstallEventData
} from "../src/types";

import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  TEST_OWNERS,
  TEST_XPUBS,
  TestNodeProvider
} from "./fixture";

describe("CF.js Provider", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    identityHash: "TEST_ID",
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appDefinition: "0x1515151515151515151515151515151515151515",
    initiatorDeposit: Zero,
    responderDeposit: Zero,
    timeout: Zero,
    proposedByIdentifier: TEST_XPUBS[0],
    proposedToIdentifier: TEST_XPUBS[1],
    initiatorDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    responderDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
  };

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("throws generic errors coming from Node", async () => {
    expect.assertions(1);

    nodeProvider.onMethodRequest(
      Node.RpcMethodName.GET_FREE_BALANCE_STATE,
      request => {
        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          id: request.id as number,
          result: {
            type: Node.ErrorType.ERROR,
            data: { errorName: "music_too_loud", message: "Music too loud" }
          }
        });
      }
    );

    try {
      await provider.getFreeBalanceState("foo");
    } catch (e) {
      expect(e.result.data.message).toBe("Music too loud");
    }
  });

  it("emits an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      jsonrpc: "2.0",
      id: 123,
      result: {
        type: Node.RpcMethodName.INSTALL,
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
    NODE_REQUEST_TIMEOUT + 1000
  );

  describe("Node methods", () => {
    it("can install an app instance", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.RpcMethodName.INSTALL, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.INSTALL);
        expect((request.parameters as Node.InstallParams).appInstanceId).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            result: {
              appInstance: TEST_APP_INSTANCE_INFO
            },
            type: Node.RpcMethodName.INSTALL
          },
          id: request.id as number
        });
      });
      const appInstance = await provider.install(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.identityHash).toBe(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
    });

    it("can install an app instance virtually", async () => {
      expect.assertions(7);
      const expectedHubIdentifier =
        "0x6001600160016001600160016001600160016001";

      nodeProvider.onMethodRequest(
        Node.RpcMethodName.INSTALL_VIRTUAL,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.INSTALL_VIRTUAL);
          const params = request.parameters as Node.InstallVirtualParams;
          expect(params.appInstanceId).toBe(
            TEST_APP_INSTANCE_INFO.identityHash
          );
          expect(params.intermediaryIdentifier).toBe(expectedHubIdentifier);

          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              result: {
                appInstance: {
                  intermediaryIdentifier: expectedHubIdentifier,
                  ...TEST_APP_INSTANCE_INFO
                }
              },
              type: Node.RpcMethodName.INSTALL_VIRTUAL
            },
            id: request.id as number
          });
        }
      );
      const appInstance = await provider.installVirtual(
        TEST_APP_INSTANCE_INFO.identityHash,
        expectedHubIdentifier
      );
      expect(appInstance.identityHash).toBe(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
      expect(appInstance.isVirtual).toBeTruthy();
      expect(appInstance.intermediaryIdentifier).toBe(expectedHubIdentifier);
    });

    it("can reject installation proposals", async () => {
      nodeProvider.onMethodRequest(
        Node.RpcMethodName.REJECT_INSTALL,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.REJECT_INSTALL);
          const {
            appInstanceId
          } = request.parameters as Node.RejectInstallParams;
          expect(appInstanceId).toBe(TEST_APP_INSTANCE_INFO.identityHash);
          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              type: Node.RpcMethodName.REJECT_INSTALL,
              result: {}
            },
            id: request.id as number
          });
        }
      );
      await provider.rejectInstall(TEST_APP_INSTANCE_INFO.identityHash);
    });

    it("can create a channel between two parties", async () => {
      expect.assertions(3);

      const multisigAddress = "0x6001600160016001600160016001600160016001";

      nodeProvider.onMethodRequest(
        Node.RpcMethodName.CREATE_CHANNEL,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.CREATE_CHANNEL);
          const { owners } = request.parameters as Node.CreateChannelParams;
          expect(owners).toBe(TEST_OWNERS);
          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              result: {
                multisigAddress
              },
              type: Node.RpcMethodName.CREATE_CHANNEL
            },
            id: request.id
          });
        }
      );

      const response = await provider.createChannel(TEST_OWNERS);
      expect(response).toEqual(multisigAddress);
    });

    it("can deploy a multisig between two parties", async () => {
      expect.assertions(3);

      const transactionHash =
        "0x58e5a0fc7fbc849eddc100d44e86276168a8c7baaa5604e44ba6f5eb8ba1b7eb";

      const multisigAddress = "0x6001600160016001600160016001600160016001";

      nodeProvider.onMethodRequest(
        Node.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER,
        request => {
          expect(request.methodName).toBe(
            Node.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER
          );
          const {
            multisigAddress: testMultisigAddress
          } = request.parameters as Node.DeployStateDepositHolderParams;
          expect(testMultisigAddress).toBe(multisigAddress);
          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              result: {
                transactionHash
              },
              type: Node.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER
            },
            id: request.id
          });
        }
      );

      const response = await provider.deployStateDepositHolder(multisigAddress);
      expect(response).toEqual(transactionHash);
    });

    it("can deposit eth to a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.RpcMethodName.DEPOSIT, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.DEPOSIT);
        const params = request.parameters as Node.DepositParams;
        expect(params.multisigAddress).toEqual(multisigAddress);
        expect(params.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            type: Node.RpcMethodName.DEPOSIT
          },
          id: request.id
        });
      });

      await provider.deposit(multisigAddress, amount);
    });

    it("can withdraw eth from a channel", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(Node.RpcMethodName.WITHDRAW, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.WITHDRAW);
        const params = request.parameters as Node.WithdrawParams;
        expect(params.multisigAddress).toEqual(multisigAddress);
        expect(params.amount).toEqual(amount);

        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            type: Node.RpcMethodName.WITHDRAW
          }
        });
      });

      await provider.withdraw(multisigAddress, amount, TEST_OWNERS[0]);
    });

    it("can query for a channel's freeBalance", async () => {
      expect.assertions(3);

      const multisigAddress = "0x931d387731bbbc988b312206c74f77d004d6b84b";
      const amount = bigNumberify(1);

      nodeProvider.onMethodRequest(
        Node.RpcMethodName.GET_FREE_BALANCE_STATE,
        request => {
          expect(request.methodName).toBe(
            Node.RpcMethodName.GET_FREE_BALANCE_STATE
          );
          const params = request.parameters as Node.GetFreeBalanceStateParams;
          expect(params.multisigAddress).toEqual(multisigAddress);

          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            id: request["id"],
            result: {
              type: Node.RpcMethodName.GET_FREE_BALANCE_STATE,
              result: {
                [TEST_OWNERS[0]]: amount
              }
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
      const callback = () => done.fail("Unsubscribed event listener was fired");
      provider.on(EventType.REJECT_INSTALL, callback);
      provider.off(EventType.REJECT_INSTALL, callback);
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.RpcMethodName.REJECT_INSTALL,
          appInstanceId: "TEST"
        }
      });
      setTimeout(done, 100);
    });

    it("can subscribe to rejectInstall events", async () => {
      expect.assertions(2);
      provider.once(EventType.REJECT_INSTALL, e => {
        const appInstance = (e.data as RejectInstallEventData).appInstance;
        expect(appInstance).toBeInstanceOf(AppInstance);
        expect(appInstance.identityHash).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
      });
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.REJECT_INSTALL,
          data: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        }
      });
    });

    it("can subscribe to install events", async () => {
      expect.assertions(2);
      provider.once(EventType.INSTALL, e => {
        const appInstance = (e.data as InstallEventData).appInstance;
        expect(appInstance).toBeInstanceOf(AppInstance);
        expect(appInstance.identityHash).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
      });

      await provider.getOrCreateAppInstance(
        TEST_APP_INSTANCE_INFO.identityHash,
        TEST_APP_INSTANCE_INFO
      );

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.INSTALL,
          data: {
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
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
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.REJECT_INSTALL,
          data: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        }
      } as JsonRpcNotification;
      nodeProvider.simulateMessageFromNode(msg);
      nodeProvider.simulateMessageFromNode(msg);
    });
  });
});
