import { legacy } from "@counterfactual/cf.js";
import { NetworkContext } from "@counterfactual/types";

import {
  INSTALL_PROTOCOL,
  METACHANNEL_INSTALL_APP_PROTOCOL,
  SETUP_PROTOCOL,
  UNINSTALL_PROTOCOL,
  UPDATE_PROTOCOL
} from "./protocol";

import { Middleware } from "./middleware";
import { StateChannel } from "./models/state-channel";
import { Opcode } from "./opcodes";
import {
  Context,
  InstructionMiddlewareCallback,
  InternalMessage,
  Protocol
} from "./types";

export class InstructionExecutorConfig {
  constructor(
    readonly responseHandler: legacy.node.ResponseSink,
    readonly networkContext: NetworkContext,
    readonly state?: legacy.channel.StateChannelInfos
  ) {}
}

export class InstructionExecutor {
  public network: NetworkContext;
  /**
   * The object responsible for processing each Instruction in the Vm.
   */
  public middleware: Middleware;

  /**
   * The delegate handler we send responses to.
   */
  public responseHandler: legacy.node.ResponseSink;

  /**
   * The underlying state for the entire machine. All state here is a result of
   * a completed and commited protocol.
   */
  public state: StateChannel;

  constructor(config: InstructionExecutorConfig) {
    this.responseHandler = config.responseHandler;
    this.state = StateChannel.fromJson(config.state);
    this.network = config.networkContext;
    this.middleware = new Middleware();
  }

  public dispatchReceivedMessage(msg: legacy.node.ClientActionMessage) {
    const { protocol, instructions } = {
      [legacy.node.ActionName.SETUP]: [Protocol.Setup, SETUP_PROTOCOL[msg.seq]],
      [legacy.node.ActionName.INSTALL]: [
        Protocol.Install,
        INSTALL_PROTOCOL[msg.seq]
      ],
      [legacy.node.ActionName.UPDATE]: [
        Protocol.SetState,
        UPDATE_PROTOCOL[msg.seq]
      ],
      [legacy.node.ActionName.UNINSTALL]: [
        Protocol.Uninstall,
        UNINSTALL_PROTOCOL[msg.seq]
      ],
      [legacy.node.ActionName.INSTALL_METACHANNEL_APP]: [
        Protocol.MetaChannelInstallApp,
        METACHANNEL_INSTALL_APP_PROTOCOL[msg.seq]
      ]
    }[msg.action];

    if (protocol === undefined) {
      throw Error(`Received invalid protocol type ${msg}`);
    }

    this.runAndSendCompletedResponse(protocol, instructions, msg);
  }

  public runUpdateProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    appInstanceId: string,
    encodedAppState: string,
    appStateHash: legacy.utils.H256
  ) {
    this.runAndSendCompletedResponse(Protocol.SetState, UPDATE_PROTOCOL[0], {
      appInstanceId,
      multisigAddress,
      fromAddress,
      toAddress,
      action: legacy.node.ActionName.UPDATE,
      data: {
        encodedAppState,
        appStateHash
      },
      seq: 0
    });
  }

  public runUninstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    peerAmounts: legacy.utils.PeerBalance[],
    appInstanceId: string
  ) {
    this.runAndSendCompletedResponse(
      Protocol.Uninstall,
      UNINSTALL_PROTOCOL[0],
      {
        appInstanceId,
        multisigAddress,
        fromAddress,
        toAddress,
        action: legacy.node.ActionName.UNINSTALL,
        data: {
          peerAmounts
        },
        seq: 0
      }
    );
  }

  public runInstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    installData: legacy.app.InstallData
  ) {
    this.runAndSendCompletedResponse(Protocol.Install, INSTALL_PROTOCOL[0], {
      multisigAddress,
      toAddress,
      fromAddress,
      action: legacy.node.ActionName.INSTALL,
      data: installData,
      seq: 0
    });
  }

  public runSetupProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string
  ) {
    this.runAndSendCompletedResponse(Protocol.Setup, SETUP_PROTOCOL[0], {
      multisigAddress,
      toAddress,
      fromAddress,
      seq: 0,
      action: legacy.node.ActionName.SETUP
    });
  }

  // FIXME: Untested
  public runInstallMetachannelAppProtocol(
    fromAddress: string,
    toAddress: string,
    intermediaryAddress: string,
    multisigAddress: string
  ) {
    this.runAndSendCompletedResponse(
      Protocol.MetaChannelInstallApp,
      METACHANNEL_INSTALL_APP_PROTOCOL[0],
      {
        multisigAddress,
        toAddress,
        fromAddress,
        seq: 0,
        action: legacy.node.ActionName.INSTALL_METACHANNEL_APP,
        data: {
          initiating: fromAddress,
          responding: toAddress,
          intermediary: intermediaryAddress
        }
      }
    );
  }

  public async runAndSendCompletedResponse(
    actionName: Protocol,
    instructions: (Opcode | Function)[],
    clientMessage: legacy.node.ClientActionMessage
  ) {
    const ret = await runAll(actionName, instructions, clientMessage, this);
    this.sendResponse(legacy.node.ResponseStatus.COMPLETED);
    return ret;
  }

  public sendResponse(status: legacy.node.ResponseStatus) {
    this.responseHandler.sendResponse(new legacy.node.Response(status));
  }

  public register(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }
}

async function runAll(
  actionName: Protocol,
  instructions: (Opcode | Function)[],
  clientMessage: legacy.node.ClientActionMessage,
  instructionExecutor: InstructionExecutor
): Promise<StateChannel> {
  let instructionPointer = 0;

  const context = {
    network: instructionExecutor.network,
    outbox: [],
    inbox: []
  } as Context;

  while (instructionPointer < instructions.length) {
    try {
      const instruction = instructions[instructionPointer];

      if (typeof instruction === "function") {
        const message: InternalMessage = {
          actionName,
          clientMessage,
          opCode: Object.create(null)
        };

        const state = instructionExecutor.state;

        instruction.call(null, message, context, state);

        instructionPointer += 1;
      } else {
        const message: InternalMessage = {
          actionName,
          clientMessage,
          opCode: instruction
        };

        await instructionExecutor.middleware.run(message, context);
        instructionPointer += 1;
      }
    } catch (e) {
      // TODO: We should have custom error types for things like
      throw Error(
        `While executing op number ${instructionPointer} at seq ${
          clientMessage.seq
        } of protocol ${actionName}, execution failed with the following error. ${
          e.stack
        }`
      );
    }
  }

  if (context.proposedStateTransition === undefined) {
    throw Error("State transition was computed to be undefined :(");
  }

  return context.proposedStateTransition;
}
