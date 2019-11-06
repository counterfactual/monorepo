import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { CreateChannelMessage, NODE_EVENTS } from "../../../types";
import { getCreate2MultisigAddress } from "../../../utils";
import { NodeController } from "../../controller";

/**
 * This instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the deterministical calculation of the multisig contract's
 * address. This also deploys the multisig contract to chain though it's not
 * strictly needed to deploy it here as per
 * https://github.com/counterfactual/monorepo/issues/1183.
 *
 * This then sends the details of this multisig to the peer with whom the multisig
 * is owned and the multisig's _address_ is sent as an event
 * to whoever subscribed to the `NODE_EVENTS.CREATE_CHANNEL` event on the Node.
 */
export default class CreateChannelController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.CREATE_CHANNEL)
  public executeMethod = super.executeMethod;

  protected async getRequiredLockNames(): Promise<string[]> {
    return [Node.RpcMethodName.CREATE_CHANNEL];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Node.CreateChannelTransactionResult> {
    const { owners } = params;
    const { networkContext, store } = requestHandler;

    const multisigAddress = getCreate2MultisigAddress(
      owners,
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    // Check if the database has stored the relevant data for this state channel
    if (!(await store.hasStateChannel(multisigAddress))) {
      await this.handleDeployedMultisigOnChain(
        multisigAddress,
        requestHandler,
        params
      );
    }

    return { multisigAddress };
  }

  private async handleDeployedMultisigOnChain(
    multisigAddress: string,
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ) {
    const { owners } = params;
    const { publicIdentifier, protocolRunner, outgoing } = requestHandler;

    const [responderXpub] = owners.filter(x => x !== publicIdentifier);

    await protocolRunner.runSetupProtocol({
      multisigAddress,
      responderXpub,
      initiatorXpub: publicIdentifier
    });

    const msg: CreateChannelMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.CREATE_CHANNEL,
      data: {
        multisigAddress,
        owners,
        counterpartyXpub: responderXpub
      } as Node.CreateChannelResult
    };

    outgoing.emit(NODE_EVENTS.CREATE_CHANNEL, msg);
  }
}
