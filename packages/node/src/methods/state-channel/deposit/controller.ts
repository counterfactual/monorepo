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
  console.log("got deposit call: ", params);
  const { store } = requestHandler;
  const { multisigAddress } = params;
  const channel = await store.getStateChannel(multisigAddress);

  console.log(1);
  console.log(channel);
  if (
    channel.hasAppInstanceOfKind(requestHandler.networkContext.ETHBalanceRefund)
  ) {
    return Promise.reject(ERRORS.CANNOT_DEPOSIT);
  }

  console.log(2);
  await installBalanceRefundApp(requestHandler, params);

  const beforeDepositMultisigBalance = await requestHandler.provider.getBalance(
    multisigAddress
  );
  console.log("balance before deposit: ", beforeDepositMultisigBalance);
  console.log(3);

  console.log("making deposit");
  await makeDeposit(requestHandler, params);
  console.log("made deposit");

  const afterDepositMultisigBalance = await requestHandler.provider.getBalance(
    multisigAddress
  );
  console.log("balance after deposit: ", afterDepositMultisigBalance);

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
  console.log("uninstalled balanced refund");

  const [peerAddress] = await getPeersAddressFromChannel(
    requestHandler.publicIdentifier,
    store,
    multisigAddress
  );

  console.log("now sending counter party deposit call");

  await requestHandler.messagingService.send(peerAddress, {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.DEPOSIT_CONFIRMED,
    data: params
  } as DepositConfirmationMessage);

  return {
    multisigBalance: await requestHandler.provider.getBalance(multisigAddress)
  };
}
