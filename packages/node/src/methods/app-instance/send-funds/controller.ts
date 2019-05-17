import { AssetType, ETHBucketAppState, Node } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";
import Queue from "p-queue";

import { AppInstance } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { hashOfOrderedPublicIdentifiers } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";
import { runUpdateStateProtocol } from "../update-state/controller";

export default class SendFundsController extends NodeController {
  public static readonly methodName = Node.MethodName.SEND_FUNDS;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.SendFundsParams
  ): Promise<Queue[]> {
    const { store, publicIdentifier } = requestHandler;
    const { receipientIdentifier } = params;

    const freeBalance = await getFreeBalance(
      store,
      publicIdentifier,
      receipientIdentifier
    );

    return [
      requestHandler.getShardedQueue(
        await store.getMultisigAddressFromAppInstanceID(
          freeBalance.identityHash
        )
      )
    ];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.SendFundsParams
  ): Promise<Node.TakeActionResult> {
    const {
      store,
      publicIdentifier: myIdentifier,
      instructionExecutor
    } = requestHandler;
    const { amount, receipientIdentifier } = params;

    const freeBalance = await getFreeBalance(
      store,
      myIdentifier,
      receipientIdentifier
    );

    const state = freeBalance.state as ETHBucketAppState;
    if (
      state.alice === myIdentifier &&
      (await transferIsValid(amount, state.aliceBalance, myIdentifier))
    ) {
      state.aliceBalance = state.aliceBalance.sub(amount);
      state.bobBalance = state.bobBalance.add(amount);
    } else if (await transferIsValid(amount, state.bobBalance, myIdentifier)) {
      state.bobBalance = state.bobBalance.sub(amount);
      state.aliceBalance = state.aliceBalance.add(amount);
    }

    await runUpdateStateProtocol(
      freeBalance.identityHash,
      store,
      instructionExecutor,
      myIdentifier,
      receipientIdentifier,
      state
    );

    const appInstance = await store.getAppInstance(freeBalance.identityHash);

    return { newState: appInstance.state };
  }
}

async function getFreeBalance(
  store: Store,
  myIdentifier: string,
  receipientIdentifier: string
): Promise<AppInstance> {
  const ownersHash = hashOfOrderedPublicIdentifiers([
    myIdentifier,
    receipientIdentifier
  ]);
  const channel = await store.getStateChannel(
    await store.getMultisigAddressFromOwnersHash(ownersHash)
  );

  // TODO: handle for other asset types
  return channel.getFreeBalanceFor(AssetType.ETH);
}

async function transferIsValid(
  amount: BigNumber,
  balance: BigNumber,
  identifier: string
): Promise<boolean> {
  const remaningAmount = balance.sub(amount);
  if (remaningAmount.lt(Zero)) {
    const missingAmount = Zero.sub(remaningAmount);
    return Promise.reject(
      ERRORS.INVALID_BALANCE_FOR_FUND_TRANSFER(
        identifier,
        amount.toString(),
        missingAmount.toString()
      )
    );
  }
  return true;
}
