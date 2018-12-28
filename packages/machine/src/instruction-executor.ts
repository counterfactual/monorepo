import { NetworkContext } from "@counterfactual/types";

import { Middleware } from "./middleware";
import { StateChannel } from "./models";
import { Opcode } from "./opcodes";
import { getProtocolFromName } from "./protocol";
import {
  InstallData,
  MetaChannelInstallAppData,
  ProtocolMessage,
  UninstallData,
  UpdateData
} from "./protocol-types-tbd";
import {
  Context,
  Instruction,
  InstructionMiddlewareCallback,
  Protocol
} from "./types";

function genericProtocolMessageFields(sc: StateChannel) {
  return {
    multisigAddress: sc.multisigAddress,
    // TODO: Figure out how to fetch these
    fromAddress: "0x0",
    toAddress: "0x0",
    seq: 0,
    signature: undefined
  };
}

export class InstructionExecutor {
  public middleware: Middleware;

  constructor(public readonly network: NetworkContext) {
    this.middleware = new Middleware();
  }

  public register(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }

  public async dispatchReceivedMessage(msg: ProtocolMessage, sc: StateChannel) {
    const protocol = getProtocolFromName(msg.protocol);
    const step = protocol[msg.seq];
    if (step === undefined) {
      throw Error(
        `Received invalid seq ${msg.seq} for protocol ${msg.protocol}`
      );
    }
    return this.runProtocol(sc, step, msg);
  }

  public async runUpdateProtocol(sc: StateChannel, params: UpdateData) {
    const protocol = Protocol.Update;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runUninstallProtocol(sc: StateChannel, params: UninstallData) {
    const protocol = Protocol.Uninstall;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runInstallProtocol(sc: StateChannel, params: InstallData) {
    const protocol = Protocol.Install;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runSetupProtocol(sc: StateChannel) {
    const protocol = Protocol.Setup;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      protocol,
      params: {},
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runInstallVirtualAppProtocol(
    sc: StateChannel,
    params: MetaChannelInstallAppData
  ) {
    const protocol = Protocol.InstallVirtualApp;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  private async runProtocol(
    sc: StateChannel,
    instructions: Instruction[],
    msg: ProtocolMessage
  ) {
    const context: Context = {
      network: this.network,
      outbox: [],
      inbox: [],
      stateChannel: sc,
      operation: undefined,
      signature: undefined
    };

    let instructionPointer = 0;

    while (instructionPointer < instructions.length) {
      const instruction = instructions[instructionPointer];
      try {
        if (typeof instruction === "function") {
          // TODO: it might be possible to not have to pass in sc
          instruction.call(null, msg, context, sc);
        } else {
          await this.middleware.run(msg, instruction, context);
        }
        instructionPointer += 1;
      } catch (e) {
        throw Error(
          `While executing op number ${instructionPointer} at seq ${
            msg.seq
          } of protocol ${
            msg.protocol
          }, execution failed with the following error. ${e.stack}`
        );
      }
    }

    if (context.stateChannel === undefined) {
      throw Error("State transition was computed to be undefined :(");
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       object and the computed new state channel object at this point
    //       probably useful!
    //
    // const diff = sc.diff(context.stateChannel)

    return context.stateChannel;
  }
}
