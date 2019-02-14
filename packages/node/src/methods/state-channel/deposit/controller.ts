import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { DepositConfirmationMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromChannel } from "../../../utils";
import { ERRORS } from "../../errors";

import {
  installBalanceRefundApp,
  makeDeposit,
  uninstallBalanceRefundApp
} from "./operation";

/**
 * This deposits the specified amount into the multisig of the specified channel.
 */
export default async function depositController(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<Node.DepositResult> {
  const { store } = requestHandler;
  const { multisigAddress } = params;
  const channel = await store.getStateChannel(multisigAddress);

  if (
    channel.hasAppInstanceOfKind(requestHandler.networkContext.ETHBalanceRefund)
  ) {
    return Promise.reject(ERRORS.CANNOT_DEPOSIT);
  }

  await installBalanceRefundApp(requestHandler, params);

  const beforeDepositMultisigBalance = await requestHandler.provider.getBalance(
    multisigAddress
  );

  await makeDeposit(requestHandler, params);

  const afterDepositMultisigBalance = await requestHandler.provider.getBalance(
    multisigAddress
  );

  await uninstallBalanceRefundApp(
    requestHandler,
    params,
    beforeDepositMultisigBalance,
    afterDepositMultisigBalance
  );
  if (
    channel.hasAppInstanceOfKind(requestHandler.networkContext.ETHBalanceRefund)
  ) {
    return Promise.reject(ERRORS.ETH_BALANCE_REFUND_NOT_UNINSTALLED);
  }

  if (params.notifyCounterparty) {
    const [peerAddress] = await getPeersAddressFromChannel(
      requestHandler.publicIdentifier,
      store,
      multisigAddress
    );

    await requestHandler.messagingService.send(peerAddress, {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.DEPOSIT_CONFIRMED,
      data: {
        ...params,
        // This party shouldn't get notified by the peer node
        notifyCounterparty: false
      }
    } as DepositConfirmationMessage);
  }

  return {
    multisigBalance: await requestHandler.provider.getBalance(multisigAddress)
  };
}
