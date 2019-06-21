import { NetworkContext } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import uuid from "uuid";

import { AppInstance, StateChannel } from "../models";
import { getProtocolFromName } from "../protocol";
import { getChannelFromCounterparty } from "../protocol/utils/get-channel-from-counterparty";

import { Opcode, Protocol } from "./enums";
import { MiddlewareContainer } from "./middleware";
import {
  InstallParams,
  InstallVirtualAppParams,
  Middleware,
  ProtocolContext,
  ProtocolMessage,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
  WithdrawParams
} from "./types";
import { virtualChannelKey } from "./virtual-app-key";

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

    let extraContext: Partial<ProtocolContext>;

    if (msg.protocol === Protocol.Setup) {
      extraContext = {};
    } else if ([Protocol.Update, Protocol.TakeAction].includes(msg.protocol)) {
      const { multisigAddress, appIdentityHash } = msg.params as
        | TakeActionParams
        | UpdateParams;

      extraContext = {
        appInstance: sc.get(multisigAddress)!.getAppInstance(appIdentityHash)
      };
    } else if (
      [Protocol.Install, Protocol.Uninstall, Protocol.Withdraw].includes(
        msg.protocol
      )
    ) {
      const { multisigAddress } = msg.params as
        | InstallParams
        | UninstallParams
        | WithdrawParams;

      extraContext = {
        stateChannel: sc.get(multisigAddress)
      };
    } else if (
      [Protocol.InstallVirtualApp, Protocol.UninstallVirtualApp].includes(
        msg.protocol
      )
    ) {
      const {
        initiatingXpub,
        respondingXpub,
        intermediaryXpub
      } = msg.params as InstallVirtualAppParams | UninstallVirtualAppParams;

      const key = virtualChannelKey(
        [initiatingXpub, respondingXpub],
        intermediaryXpub
      );

      if (msg.seq === 0) {
        extraContext = {
          stateChannelWithIntermediary: getChannelFromCounterparty(
            sc,
            initiatingXpub,
            intermediaryXpub
          ),
          stateChannelWithCounterparty: sc.get(key)
        };
      } else if (msg.seq === 1) {
        extraContext = {
          stateChannelWithInitiating: getChannelFromCounterparty(
            sc,
            intermediaryXpub,
            initiatingXpub
          ),
          stateChannelWithResponding: getChannelFromCounterparty(
            sc,
            intermediaryXpub,
            respondingXpub
          ),
          stateChannelWithCounterparty: sc.get(key)
        };
      } else if (msg.seq === 2) {
        extraContext = {
          stateChannelWithIntermediary: getChannelFromCounterparty(
            sc,
            respondingXpub,
            intermediaryXpub
          ),
          stateChannelWithCounterparty: sc.get(key)
        };
      } else {
        throw new Error(`Seq number given was out of range: seq = ${msg.seq}`);
      }
    } else {
      throw new Error(
        `Protocol specified was invalid: protocol = ${msg.protocol}`
      );
    }

    return this.runProtocol(extraContext, step, msg);
  }

  public async runUpdateProtocol(
    appInstance: AppInstance,
    params: UpdateParams
  ) {
    const protocol = Protocol.Update;
    return this.runProtocol({ appInstance }, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      protocolExecutionID: uuid.v1(),
      seq: 0,
      toXpub: params.respondingXpub
    });
  }

  public async runTakeActionProtocol(
    appInstance: AppInstance,
    params: TakeActionParams
  ) {
    const protocol = Protocol.TakeAction;
    return this.runProtocol({ appInstance }, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      protocolExecutionID: uuid.v1(),
      seq: 0,
      toXpub: params.respondingXpub
    });
  }

  public async runUninstallProtocol(
    stateChannel: StateChannel,
    params: UninstallParams
  ) {
    const protocol = Protocol.Uninstall;
    return this.runProtocol(
      { stateChannel },
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        protocolExecutionID: uuid.v1(),
        seq: 0,
        toXpub: params.respondingXpub
      }
    );
  }

  public async runInstallProtocol(
    stateChannel: StateChannel,
    params: InstallParams
  ) {
    const protocol = Protocol.Install;
    return this.runProtocol(
      { stateChannel },
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        protocolExecutionID: uuid.v1(),
        seq: 0,
        toXpub: params.respondingXpub
      }
    );
  }

  public async runSetupProtocol(params: SetupParams) {
    const protocol = Protocol.Setup;
    return this.runProtocol({}, getProtocolFromName(protocol)[0], {
      protocol,
      params,
      protocolExecutionID: uuid.v1(),
      seq: 0,
      toXpub: params.respondingXpub
    });
  }

  public async runWithdrawProtocol(
    stateChannel: StateChannel,
    params: WithdrawParams
  ) {
    const protocol = Protocol.Withdraw;
    return this.runProtocol(
      { stateChannel },
      getProtocolFromName(protocol)[0],
      {
        protocol,
        params,
        protocolExecutionID: uuid.v1(),
        seq: 0,
        toXpub: params.respondingXpub
      }
    );
  }

  public async runInstallVirtualAppProtocol(
    stateChannelWithIntermediary: StateChannel,
    stateChannelWithCounterparty: StateChannel | undefined,
    params: InstallVirtualAppParams
  ) {
    const protocol = Protocol.InstallVirtualApp;
    return this.runProtocol(
      {
        stateChannelWithIntermediary,
        stateChannelWithCounterparty
      },
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        protocolExecutionID: uuid.v1(),
        seq: 0,
        toXpub: params.intermediaryXpub
      }
    );
  }

  public async runUninstallVirtualAppProtocol(
    stateChannelWithIntermediary: StateChannel,
    stateChannelWithCounterparty: StateChannel,
    params: UninstallVirtualAppParams
  ) {
    const protocol = Protocol.UninstallVirtualApp;
    return this.runProtocol(
      {
        stateChannelWithIntermediary,
        stateChannelWithCounterparty
      },
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        protocolExecutionID: uuid.v1(),
        seq: 0,
        toXpub: params.intermediaryXpub
      }
    );
  }

  private async runProtocol(
    extraContext: Partial<ProtocolContext>,
    instruction: (context: ProtocolContext) => AsyncIterableIterator<any>,
    message: ProtocolMessage
  ): Promise<ProtocolContext> {
    const context = {
      message,
      network: this.network,
      provider: this.provider,
      ...extraContext
    } as ProtocolContext;

    const it = instruction(context);

    let lastMiddlewareRet: any = undefined;

    while (true) {
      const ret = await it.next(lastMiddlewareRet);
      if (ret.done) break;
      const [opcode, ...args] = ret.value;
      lastMiddlewareRet = await this.middlewares.run(opcode, args);
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       objects and the new state channel objects at this point
    //       probably useful!
    return context;
  }
}
