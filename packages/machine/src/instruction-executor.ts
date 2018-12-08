import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { ActionExecution } from "./action";
import { FLOWS } from "./instructions";
import { Middleware } from "./middleware/middleware";
import { ProtocolOperation } from "./middleware/protocol-operation/types";
import { Node } from "./node";
import { Opcode } from "./opcodes";
import {
  InstructionMiddlewareCallback,
  NetworkContext,
  StateProposal
} from "./types";

export class InstructionExecutorConfig {
  constructor(
    readonly responseHandler: legacy.node.ResponseSink,
    readonly networkContext: NetworkContext,
    readonly state?: legacy.channel.StateChannelInfos
  ) {}
}

export class InstructionExecutor {
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
  public node: Node;

  constructor(config: InstructionExecutorConfig) {
    this.responseHandler = config.responseHandler;
    this.node = new Node(config.state || {}, config.networkContext);
    this.middleware = new Middleware(this.node);
  }

  public dispatchReceivedMessage(msg: legacy.node.ClientActionMessage) {
    this.execute(
      new ActionExecution(msg.action, FLOWS[msg.action][msg.seq], msg, this)
    );
  }

  public runUpdateProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    appInstanceId: string,
    encodedAppState: string,
    appStateHash: legacy.utils.H256
  ) {
    this.execute(
      new ActionExecution(
        legacy.node.ActionName.UPDATE,
        FLOWS[legacy.node.ActionName.UPDATE][0],
        {
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
        },
        this
      )
    );
  }

  public runUninstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    peerAmounts: legacy.utils.PeerBalance[],
    appInstanceId: string
  ) {
    this.execute(
      new ActionExecution(
        legacy.node.ActionName.UNINSTALL,
        FLOWS[legacy.node.ActionName.UNINSTALL][0],
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
        },
        this
      )
    );
  }

  public runInstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    installData: legacy.app.InstallData
  ) {
    this.execute(
      new ActionExecution(
        legacy.node.ActionName.INSTALL,
        FLOWS[legacy.node.ActionName.INSTALL][0],
        {
          multisigAddress,
          toAddress,
          fromAddress,
          action: legacy.node.ActionName.INSTALL,
          data: installData,
          seq: 0
        },
        this
      )
    );
  }

  public runSetupProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string
  ) {
    this.execute(
      new ActionExecution(
        legacy.node.ActionName.SETUP,
        FLOWS[legacy.node.ActionName.SETUP][0],
        {
          multisigAddress,
          toAddress,
          fromAddress,
          seq: 0,
          action: legacy.node.ActionName.SETUP
        },
        this
      )
    );
  }

  public runInstallMetachannelAppProtocol(
    fromAddress: string,
    toAddress: string,
    intermediaryAddress: string,
    multisigAddress: string
  ) {
    this.execute(
      new ActionExecution(
        legacy.node.ActionName.INSTALL_METACHANNEL_APP,
        FLOWS[legacy.node.ActionName.INSTALL_METACHANNEL_APP][0],
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
        },
        this
      )
    );
  }

  public async execute(execution: ActionExecution) {
    await this.run(execution);
  }

  public async run(execution: ActionExecution) {
    const ret = await execution.runAll();
    this.sendResponse(legacy.node.ResponseStatus.COMPLETED);
    return ret;
  }

  public sendResponse(status: legacy.node.ResponseStatus) {
    this.responseHandler.sendResponse(new legacy.node.Response(status));
  }

  public mutateState(state: legacy.channel.StateChannelInfos) {
    Object.assign(this.node.channelStates, state);
  }

  public register(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }
}

export interface IntermediateResults {
  outbox: legacy.node.ClientActionMessage[];
  inbox: legacy.node.ClientActionMessage[];
  proposedStateTransition?: StateProposal;
  operation?: ProtocolOperation;
  signature?: ethers.utils.Signature;
}

export interface Context {
  intermediateResults: IntermediateResults;
  instructionExecutor: InstructionExecutor;
}
