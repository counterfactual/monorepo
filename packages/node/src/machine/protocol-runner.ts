import { NetworkContext } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import uuid from "uuid";

import { StateChannel } from "../models";
import { getProtocolFromName } from "../protocol";
import { Store } from "../store";

import { Opcode, Protocol } from "./enums";
import { MiddlewareContainer } from "./middleware";
import {
  Context,
  InstallParams,
  InstallVirtualAppParams,
  Middleware,
  ProposeInstallParams,
  ProtocolMessage,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
  WithdrawParams
} from "./types";

/**
Type-level mapping from Protocol to Protocol Param
For e.g., ParamTypeOf<Protocol.Install> = InstallParams
This syntax is preferred according to https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#conditional-types
**/
// tslint:disable
type ParamTypeOf<T extends Protocol> = T extends Protocol.Install
  ? InstallParams
  : T extends Protocol.Update
  ? UpdateParams
  : T extends Protocol.Uninstall
  ? UninstallParams
  : T extends Protocol.InstallVirtualApp
  ? InstallVirtualAppParams
  : T extends Protocol.UninstallVirtualApp
  ? UninstallVirtualAppParams
  : T extends Protocol.TakeAction
  ? TakeActionParams
  : T extends Protocol.Withdraw
  ? WithdrawParams
  : T extends Protocol.Propose
  ? ProposeInstallParams
  : never;
// tslint:enable

function firstRecipientFromProtocolName(protocolName: Protocol) {
  if (
    [Protocol.UninstallVirtualApp, Protocol.InstallVirtualApp].indexOf(
      protocolName
    ) !== -1
  ) {
    return "intermediaryXpub";
  }
  if (
    [
      Protocol.Update,
      Protocol.Uninstall,
      Protocol.TakeAction,
      Protocol.Install,
      Protocol.Withdraw,
      Protocol.Propose
    ].indexOf(protocolName) !== -1
  ) {
    return "responderXpub";
  }
  throw Error(
    `Unknown protocolName ${protocolName} passed to firstRecipientFromProtocolName`
  );
}

export class ProtocolRunner {
  public middlewares: MiddlewareContainer;

  constructor(
    private readonly store: Store,
    private readonly network: NetworkContext,
    private readonly provider: BaseProvider
  ) {
    this.middlewares = new MiddlewareContainer();
  }

  public register(scope: Opcode, method: Middleware) {
    this.middlewares.add(scope, method);
  }

  /// Starts executing a protocol in response to a message received. This
  /// function should not be called with messages that are waited for by
  /// `IO_SEND_AND_WAIT`
  public async runProtocolWithMessage(msg: ProtocolMessage) {
    const protocol = getProtocolFromName(msg.protocol);
    const step = protocol[msg.seq];
    if (step === undefined) {
      throw Error(
        `Received invalid seq ${msg.seq} for protocol ${msg.protocol}`
      );
    }
    return this.runProtocol(step, msg);
  }

  public async initiateProtocol<T extends Protocol>(
    protocolName: T,
    params: ParamTypeOf<T>
  ) {
    return this.runProtocol(getProtocolFromName(protocolName)[0], {
      params,
      protocol: protocolName,
      processID: uuid.v1(),
      seq: 0,
      toXpub: params[firstRecipientFromProtocolName(protocolName)],
      customData: {}
    });
  }

  public async runSetupProtocol(params: SetupParams) {
    const protocol = Protocol.Setup;
    return this.runProtocol(getProtocolFromName(protocol)[0], {
      protocol,
      params,
      processID: uuid.v1(),
      seq: 0,
      toXpub: params.responderXpub,
      customData: {}
    });
  }

  private async runProtocol(
    instruction: (context: Context) => AsyncIterableIterator<any>,
    message: ProtocolMessage
  ) {
    const context: Context = {
      message,
      stateChannelsMap: await this.store.getStateChannelsMap(),
      network: this.network,
      provider: this.provider
    };

    let lastMiddlewareRet: any = undefined;
    const process = instruction(context);
    while (true) {
      const ret = await process.next(lastMiddlewareRet);
      if (ret.done) {
        break;
      }
      const [opcode, ...args] = ret.value;
      lastMiddlewareRet = await this.middlewares.run(opcode, args);
    }
  }
}
