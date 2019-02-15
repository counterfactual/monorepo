import { NetworkContext } from "@counterfactual/types";

import { Opcode, Protocol } from "./enums";
import { MiddlewareContainer } from "./middleware";
import { StateChannel } from "./models";
import { getProtocolFromName } from "./protocol";
import {
  Context,
  InstallParams,
  InstallVirtualAppParams,
  Instruction,
  Middleware,
  ProtocolMessage,
  SetupParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
  WithdrawParams
} from "./types";

export class InstructionExecutor {
  public middlewares: MiddlewareContainer;

  constructor(public readonly network: NetworkContext) {
    this.middlewares = new MiddlewareContainer();
  }

  public register(scope: Opcode, method: Middleware) {
    this.middlewares.add(scope, method);
  }

  /// Starts executing a protocol in response to a message received. This
  /// function should not be called with messages that are waited for by
  /// `IO_SEND_AND_WAIT`
  public async runProtocolWithMessage(
    msg: ProtocolMessage,
    sc: Map<string, StateChannel>
  ) {
    const protocol = getProtocolFromName(msg.protocol);
    const step = protocol[msg.seq];
    if (step === undefined) {
      throw Error(
        `Received invalid seq ${msg.seq} for protocol ${msg.protocol}`
      );
    }
    return this.runProtocol(sc, step, msg);
  }

  public async runUpdateProtocol(
    sc: Map<string, StateChannel>,
    params: UpdateParams
  ) {
    const protocol = Protocol.Update;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingXpub,
      toAddress: params.respondingXpub
    });
  }

  public async runUninstallProtocol(
    sc: Map<string, StateChannel>,
    params: UninstallParams
  ) {
    const protocol = Protocol.Uninstall;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingXpub,
      toAddress: params.respondingXpub
    });
  }

  public async runInstallProtocol(
    sc: Map<string, StateChannel>,
    params: InstallParams
  ) {
    const protocol = Protocol.Install;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingXpub,
      toAddress: params.respondingXpub
    });
  }

  public async runSetupProtocol(params: SetupParams) {
    const protocol = Protocol.Setup;
    return this.runProtocol(
      new Map<string, StateChannel>(),
      getProtocolFromName(protocol)[0],
      {
        protocol,
        params,
        seq: 0,
        fromAddress: params.initiatingXpub,
        toAddress: params.respondingXpub
      }
    );
  }

  public async runWithdrawProtocol(sc: StateChannel, params: WithdrawParams) {
    const protocol = Protocol.Withdraw;
    return this.runProtocol(
      new Map<string, StateChannel>([[sc.multisigAddress, sc]]),
      getProtocolFromName(protocol)[0],
      {
        protocol,
        params,
        seq: 0,
        fromAddress: params.initiatingXpub,
        toAddress: params.respondingXpub
      }
    );
  }

  public async runInstallVirtualAppProtocol(
    sc: Map<string, StateChannel>,
    params: InstallVirtualAppParams
  ) {
    const protocol = Protocol.InstallVirtualApp;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingXpub,
      toAddress: params.intermediaryXpub
    });
  }

  public async runUninstallVirtualAppProtocol(
    sc: Map<string, StateChannel>,
    params: UninstallVirtualAppParams
  ) {
    const protocol = Protocol.UninstallVirtualApp;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingXpub,
      toAddress: params.intermediaryXpub
    });
  }

  private async runProtocol(
    stateChannelsMap: Map<string, StateChannel>,
    instructions: Instruction[],
    msg: ProtocolMessage
  ): Promise<Map<string, StateChannel>> {
    const context: Context = {
      stateChannelsMap,
      network: this.network,
      outbox: [],
      inbox: [],
      commitments: [],
      signatures: [],
      middlewareArgs: []
    };

    let instructionPointer = 0;

    while (instructionPointer < instructions.length) {
      const instruction = instructions[instructionPointer];
      try {
        if (typeof instruction === "function") {
          instruction.call(null, msg, context);
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

    if (context.stateChannelsMap === undefined) {
      throw Error(
        `After protocol ${
          msg.protocol
        } executed, expected context.stateChannel to be set, but it is undefined`
      );
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       objects and the new state channel objects at this point
    //       probably useful!
    return context.stateChannelsMap;
  }
}
