import {
  AssetType,
  ETHBucketAppState,
  ETHBucketParties,
  ETHBucketParty,
  Node
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";
import Queue from "p-queue";

import { AppInstance } from "../../../models";
import { getETHFreeBalanceAddress } from "../../../node";
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
    const { store, publicIdentifier: senderIdentifier } = requestHandler;
    const { transfers } = params;
    if (transfers.length === 0) {
      return Promise.reject(ERRORS.TRANSFER_PARAM_CANNOT_BE_EMPTY);
    }

    if (transfers.map(transfer => transfer.to).includes(senderIdentifier)) {
      return Promise.reject(ERRORS.CANT_TRANSFER_TO_SENDER(senderIdentifier));
    }

    const freeBalance = await getFreeBalance(
      store,
      senderIdentifier,
      // TODO: generalize for n-party channel
      transfers[0].to
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
      publicIdentifier: senderIdentifier,
      instructionExecutor
    } = requestHandler;
    const { transfers } = params;

    // TODO: generalize for n-party channel
    const receipientIdentifier = transfers[0].to;
    const freeBalance = await getFreeBalance(
      store,
      senderIdentifier,
      receipientIdentifier
    );

    const newState = updateFreeBalanceState(
      freeBalance,
      senderIdentifier,
      transfers
    );

    await runUpdateStateProtocol(
      freeBalance.identityHash,
      store,
      instructionExecutor,
      senderIdentifier,
      receipientIdentifier,
      newState
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

  // TODO: generalize asset type
  return channel.getFreeBalanceFor(AssetType.ETH);
}

/**
 *
 * @param senderIdentifier The identifier of the Node sending the funds.
 * @param transferObj The struct defining the identifier -> amount mapping
 *        that the sender uses to send funds to other parties of the channel.
 * @param store
 */
function updateFreeBalanceState(
  freeBalance: AppInstance,
  senderIdentifier: string,
  transfersObj: ETHBucketAppState
): ETHBucketAppState {
  // TODO: generalize asset type
  const senderAddress = getETHFreeBalanceAddress(senderIdentifier);

  const transfers: Map<string, BigNumber> = transfersObj.reduce(
    (map, party) => {
      if (party.to !== senderIdentifier) {
        map.set(
          getETHFreeBalanceAddress(party.to),
          new BigNumber(party.amount._hex)
        );
      }
      return map;
    },
    new Map()
  );

  const balances: ETHBucketParties = (freeBalance.state as ETHBucketAppState).reduce(
    (map, party) => {
      map.set(party.to, new BigNumber(party.amount._hex));
      return map;
    },
    new Map()
  );

  transfers.forEach((amount, to) => {
    const senderBalance = balances.get(senderAddress)!;
    const receipientBalance = balances.get(to)!;

    const remaningAmount = senderBalance.sub(amount);
    if (remaningAmount.lt(Zero)) {
      return Promise.reject(
        ERRORS.INVALID_BALANCE_FOR_FUND_TRANSFER(
          senderIdentifier,
          amount.toString(),
          Zero.sub(remaningAmount).toString()
        )
      );
    }
    balances.set(senderAddress, senderBalance.sub(amount));
    balances.set(to, receipientBalance.add(amount));
    return balances;
  });

  return Array.from(balances.entries()).map<ETHBucketParty>(
    (party: [string, BigNumber]): ETHBucketParty => {
      return {
        to: party[0],
        amount: {
          _hex: party[1].toHexString()
        }
      };
    }
  );
}
