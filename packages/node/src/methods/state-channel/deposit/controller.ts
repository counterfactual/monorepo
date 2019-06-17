import ERC20 from "@counterfactual/contracts/build/ERC20.json";
import { Node } from "@counterfactual/types";
import { Contract } from "ethers";
import { BigNumber } from "ethers/utils";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { DepositConfirmationMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromChannel } from "../../../utils";
import { NodeController } from "../../controller";
import {
  CANNOT_DEPOSIT,
  INSUFFICIENT_ERC20_FUNDS,
  INSUFFICIENT_FUNDS
} from "../../errors";

import {
  installBalanceRefundApp,
  makeDeposit,
  uninstallBalanceRefundApp
} from "./operation";

export default class DepositController extends NodeController {
  public static readonly methodName = Node.MethodName.DEPOSIT;

  @jsonRpcMethod("chan_deposit")
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<Queue[]> {
    return [requestHandler.getShardedQueue(params.multisigAddress)];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<void> {
    const { store, provider } = requestHandler;
    const { multisigAddress, amount, tokenAddress } = params;

    const channel = await store.getStateChannel(multisigAddress);

    if (
      channel.hasAppInstanceOfKind(
        requestHandler.networkContext.ETHBalanceRefundApp
      )
    ) {
      return Promise.reject(CANNOT_DEPOSIT);
    }

    const address = await requestHandler.getSignerAddress();

    if (tokenAddress) {
      const contract = new Contract(tokenAddress, ERC20.abi, provider);
      const balance: BigNumber = await contract.functions.balanceOf(address);
      if (balance.lt(amount)) {
        return Promise.reject(INSUFFICIENT_ERC20_FUNDS(address));
      }
    } else {
      const balanceOfSigner = await provider.getBalance(address);

      if (balanceOfSigner.lt(amount)) {
        return Promise.reject(`${INSUFFICIENT_FUNDS}: ${address}`);
      }
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<Node.DepositResult> {
    const {
      store,
      provider,
      messagingService,
      publicIdentifier,
      outgoing
    } = requestHandler;
    const { multisigAddress } = params;

    await installBalanceRefundApp(requestHandler, params);

    const depositSucceeded = await makeDeposit(requestHandler, params);

    await uninstallBalanceRefundApp(requestHandler, params);

    if (depositSucceeded) {
      if (params.notifyCounterparty) {
        const [peerAddress] = await getPeersAddressFromChannel(
          publicIdentifier,
          store,
          multisigAddress
        );

        await messagingService.send(peerAddress, {
          from: publicIdentifier,
          type: NODE_EVENTS.DEPOSIT_CONFIRMED,
          data: {
            ...params,
            // This party shouldn't get notified by the peer node
            notifyCounterparty: false
          }
        } as DepositConfirmationMessage);
      }

      outgoing.emit(NODE_EVENTS.DEPOSIT_CONFIRMED);
    }

    return {
      multisigBalance: await provider.getBalance(multisigAddress)
    };
  }
}
