import ERC20 from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ERC20.json";
import { Node } from "@counterfactual/types";
import { Contract } from "ethers";
import { BigNumber } from "ethers/utils";
import { jsonRpcMethod } from "rpc-server";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { DepositConfirmationMessage, NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";
import {
  CANNOT_DEPOSIT,
  FAILED_TO_GET_ERC20_BALANCE,
  INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT,
  INSUFFICIENT_FUNDS
} from "../../errors";

import {
  installBalanceRefundApp,
  makeDeposit,
  uninstallBalanceRefundApp
} from "./operation";

export default class DepositController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.DEPOSIT)
  public executeMethod = super.executeMethod;

  protected async getRequiredLockNames(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<string[]> {
    return [params.multisigAddress];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<void> {
    const { store, provider, networkContext } = requestHandler;
    const { multisigAddress, amount, tokenAddress: tokenAddressParam } = params;

    const tokenAddress = tokenAddressParam || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const channel = await store.getStateChannel(multisigAddress);

    if (channel.hasAppInstanceOfKind(networkContext.CoinBalanceRefundApp)) {
      throw Error(CANNOT_DEPOSIT);
    }

    const address = await requestHandler.getSignerAddress();

    if (tokenAddress !== CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
      const contract = new Contract(tokenAddress, ERC20.abi, provider);

      let balance: BigNumber;
      try {
        balance = await contract.functions.balanceOf(address);
      } catch (e) {
        throw Error(FAILED_TO_GET_ERC20_BALANCE(tokenAddress, address));
      }

      if (balance.lt(amount)) {
        throw Error(
          INSUFFICIENT_ERC20_FUNDS_TO_DEPOSIT(tokenAddress, amount, balance)
        );
      }
    } else {
      const balanceOfSigner = await provider.getBalance(address);

      if (balanceOfSigner.lt(amount)) {
        throw Error(`${INSUFFICIENT_FUNDS}: ${address}`);
      }
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<Node.DepositResult> {
    const { outgoing, provider, publicIdentifier } = requestHandler;
    const { multisigAddress, tokenAddress } = params;

    params.tokenAddress = tokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    await installBalanceRefundApp(requestHandler, params);
    await makeDeposit(requestHandler, params);
    await uninstallBalanceRefundApp(requestHandler, params);

    outgoing.emit(NODE_EVENTS.DEPOSIT_CONFIRMED, {
      from: publicIdentifier,
      type: NODE_EVENTS.DEPOSIT_CONFIRMED,
      data: params
    });

    return {
      multisigBalance: await provider.getBalance(multisigAddress)
    };
  }
}
