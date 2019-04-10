import { NetworkContext } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";

import { Opcode, Protocol } from "./enums";
import { MiddlewareContainer } from "./middleware";
import { StateChannel } from "./models";
import { getProtocolFromName } from "./protocol";
import {
  Context,
  InstallParams,
  InstallVirtualAppParams,
  Middleware,
  ProtocolMessage,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
  WithdrawParams
} from "./types";

export class InstructionExecutor {
  public middlewares: MiddlewareContainer;

  constructor(
    public readonly network: NetworkContext,
    public readonly provider: BaseProvider
  ) {
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
      toXpub: params.respondingXpub
    });
  }

  public async runTakeActionProtocol(
    sc: Map<string, StateChannel>,
    params: TakeActionParams
  ) {
    const protocol = Protocol.TakeAction;
    return this.runProtocol(sc, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      toXpub: params.respondingXpub
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
      toXpub: params.respondingXpub
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
      toXpub: params.respondingXpub
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
        toXpub: params.respondingXpub
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
        toXpub: params.respondingXpub
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
      toXpub: params.intermediaryXpub
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
      toXpub: params.intermediaryXpub
    });
  }

  private async runProtocol(
    stateChannelsMap: Map<string, StateChannel>,
    instruction: (context: Context) => AsyncIterableIterator<any>,
    message: ProtocolMessage
  ): Promise<Map<string, StateChannel>> {
    const context: Context = {
      message,
      stateChannelsMap,
      network: this.network,
      provider: this.provider
    };

    let lastMiddlewareRet: any = undefined;
    const it = instruction(context);
    while (true) {
      const ret = await it.next(lastMiddlewareRet);
      if (ret.done) {
        break;
      }
      const [opcode, ...args] = ret.value;
      lastMiddlewareRet = await this.middlewares.run(opcode, args);
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       objects and the new state channel objects at this point
    //       probably useful!
    return context.stateChannelsMap;
  }
}
