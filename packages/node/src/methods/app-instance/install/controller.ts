import { Node } from "@counterfactual/types";
// import { Contract } from "ethers";
// import { BigNumber, defaultAbiCoder } from "ethers/utils";
import Queue from "p-queue";

// import { ProposedAppInstanceInfo } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { InstallMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromAppInstanceID } from "../../../utils";
import { NodeController } from "../../controller";
import { INTERPRETER_NOT_SPECIFIED } from "../../errors";
// import {
//   INVALID_INSTALL,
//   INVALID_INSTALL_WITH_SELF,
//   INVALID_NUMBER_OF_PARTIES_FOR_INSTALL
// } from "../../errors";

import { install } from "./operation";

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export default class InstallController extends NodeController {
  public static readonly methodName = Node.MethodName.INSTALL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.InstallParams
  ): Promise<Queue[]> {
    const { store, networkContext } = requestHandler;
    const { appInstanceId } = params;
    const appInstanceInfo = await store.getProposedAppInstanceInfo(
      appInstanceId
    );

    if (!appInstanceInfo.interpreterAddress) {
      return Promise.reject(INTERPRETER_NOT_SPECIFIED);
    }

    const interpreters = new Set([
      networkContext.ETHInterpreter,
      networkContext.TwoPartyEthAsLump
    ]);

    if (!interpreters.has(appInstanceInfo.interpreterAddress)) {
      return Promise.reject("Unrecognized interpreter address");
    }

    // try {
    //   validateInitialOutcome(
    //     app,
    //     interpreterAddress,
    //     appInstanceInfo,
    //     publicIdentifier,
    //     networkContext
    //   );
    // } catch (e) {
    //   return Promise.reject(e);
    // }

    const sc = await store.getChannelFromAppInstanceID(appInstanceId);

    return [
      requestHandler.getShardedQueue(
        await store.getMultisigAddressFromAppInstanceID(sc.multisigAddress)
      )
    ];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.InstallParams
  ): Promise<Node.InstallResult> {
    const {
      store,
      instructionExecutor,
      publicIdentifier,
      messagingService
    } = requestHandler;

    const [respondingAddress] = await getPeersAddressFromAppInstanceID(
      requestHandler.publicIdentifier,
      requestHandler.store,
      params.appInstanceId
    );

    const appInstanceInfo = await install(
      store,
      instructionExecutor,
      publicIdentifier,
      respondingAddress,
      params
    );

    const installApprovalMsg: InstallMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.INSTALL,
      data: { params }
    };

    await messagingService.send(respondingAddress, installApprovalMsg);

    return {
      appInstance: appInstanceInfo
    };
  }
}

// FIXME: only handles two party validation
// function validateInitialOutcome(
//   app: Contract,
//   interpreterAddress: string,
//   appInstanceInfo: ProposedAppInstanceInfo,
//   publicIdentifier: string,
//   networkContext: NetworkContext
// ) {
//   if (interpreterAddress === networkContext.ETHInterpreter) {
//     validateEthInterpreterOutcome(app, interpreterAddress, appInstanceInfo);
//   }
//
//   // else it's the TwoPartyEthAsLump, no computeOutcome is needed
//   // as the transfers are derived from the params argument to the interpreter
//   // if (outcomeAtInitialState.sum() !== [aDec, bBdec].sum()) {
//   //   throw eror ( invalid params given)
//   // }
// }

// function validateEthInterpreterOutcome(
//   app: Contract,
//   interpreterAddress: string,
//   appInstanceInfo: ProposedAppInstanceInfo
// ) {
//   console.log("validating");
//   const outcomeBytes = (app.functions.computeOutcome(
//     appInstanceInfo.initialState
//   ),
//   interpreterAddress);
//
//   // FIXME: specify type for this
//   let transfers: {
//     to: string;
//     amount: BigNumber;
//   }[];
//
//   transfers = defaultAbiCoder.decode(
//     ["tuple(address to, uint256 amount)[] transfers"],
//     outcomeBytes
//   ).transfers;
//
//   if (transfers.length !== 2) {
//     throw Error(INVALID_NUMBER_OF_PARTIES_FOR_INSTALL);
//   }
//
//   if (
//     transfers[0].to === transfers[1].to ||
//     appInstanceInfo.proposedByIdentifier ===
//       appInstanceInfo.proposedToIdentifier
//   ) {
//     throw Error(INVALID_INSTALL_WITH_SELF);
//   }
//
//   if (transfers[0].to === appInstanceInfo.proposedByIdentifier) {
//     if (
//       !transfers[0].amount.eq(appInstanceInfo.myDeposit) ||
//       !transfers[1].amount.eq(appInstanceInfo.peerDeposit)
//     ) {
//       throw Error(INVALID_INSTALL);
//     }
//   }
//
//   if (transfers[0].to === appInstanceInfo.proposedToIdentifier) {
//     if (
//       !transfers[0].amount.eq(appInstanceInfo.peerDeposit) ||
//       !transfers[1].amount.eq(appInstanceInfo.myDeposit)
//     ) {
//       throw Error(INVALID_INSTALL);
//     }
//   }
// }
//
