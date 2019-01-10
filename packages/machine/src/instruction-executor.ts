import { NetworkContext } from "@counterfactual/types";

import { MiddlewareContainer } from "./middleware";
import { StateChannel } from "./models";
import { Opcode } from "./opcodes";
import { getProtocolFromName } from "./protocol";
import {
  InstallParams,
  InstallVirtualAppParams,
  ProtocolMessage,
  UninstallParams,
  UpdateParams
} from "./protocol-types-tbd";
import { Context, Instruction, Middleware, Protocol } from "./types";

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
  public middlewares: MiddlewareContainer;

  constructor(public readonly network: NetworkContext) {
    this.middlewares = new MiddlewareContainer();
  }

  public register(scope: Opcode, method: Middleware) {
    this.middlewares.add(scope, method);
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

  public async runUpdateProtocol(sc: StateChannel, params: UpdateParams) {
    const protocol = Protocol.Update;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runUninstallProtocol(sc: StateChannel, params: UninstallParams) {
    const protocol = Protocol.Uninstall;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      ...genericProtocolMessageFields(sc)
    });
  }

  public async runInstallProtocol(sc: StateChannel, params: InstallParams) {
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
    params: InstallVirtualAppParams
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
      commitment: undefined,
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
          await this.middlewares.run(msg, instruction, context);
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
      throw Error(
        `After protocol ${
          msg.protocol
        } executed, expected context.stateChannel to be set, but it is undefined`
      );
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       object and the computed new state channel object at this point
    //       probably useful!
    //
    // const diff = sc.diff(context.stateChannel)

    return context.stateChannel;
  }
}
