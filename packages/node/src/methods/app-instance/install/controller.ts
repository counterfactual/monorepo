import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { Node, OutcomeType, NetworkContext } from "@counterfactual/types";
import { Contract } from "ethers";
import { BigNumber, defaultAbiCoder } from "ethers/utils";
import Queue from "p-queue";

import { getETHFreeBalanceAddress } from "../../../node";
import { RequestHandler } from "../../../request-handler";
import { InstallMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromAppInstanceID } from "../../../utils";
import { NodeController } from "../../controller";

import { install } from "./operation";
import { ProposedAppInstanceInfo } from "../../../models";

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
    const {
      store,
      provider,
      networkContext,
      publicIdentifier
    } = requestHandler;
    const { appInstanceId } = params;
    const appInstanceInfo = await store.getProposedAppInstanceInfo(
      appInstanceId
    );

    const app = new Contract(
      appInstanceInfo.id,
      CounterfactualApp.abi,
      provider
    );

    const outcomeType = (await app.functions.outcomeType()) as BigNumber;

    let interpreterAddress: string;

    switch (outcomeType.toNumber()) {
      case OutcomeType.ETH_TRANSFER: {
        interpreterAddress = networkContext.ETHInterpreter;
        break;
      }
      case OutcomeType.TWO_PARTY_OUTCOME: {
        interpreterAddress = networkContext.TwoPartyEthAsLump;
        break;
      }
      default: {
        return Promise.reject("Unrecognized interpreter address");
      }
    }

    validateInitialOutcome(
      app,
      interpreterAddress,
      appInstanceInfo,
      publicIdentifier,
      networkContext
    );

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

function validateInitialOutcome(
  app: Contract,
  interpreterAddress: string,
  appInstanceInfo: ProposedAppInstanceInfo,
  publicIdentifier: string,
  networkContext: NetworkContext
) {
  const outcomeBytes = (app.functions.computeOutcome(
    appInstanceInfo.initialState
  ),
  interpreterAddress);

  let outcome;
  if (interpreterAddress === networkContext.ETHInterpreter) {
    outcome = defaultAbiCoder.decode(
      ["tuple(address to, uint256 amount)[]"],
      outcome
    );
  }

  outcome = defaultAbiCoder.decode(
    ["tuple(address to, uint256 amount)[]"],
    outcome
  );

  // if (outcomeAtInitialState.sum() !== [aDec, bBdec].sum()) {
  //   throw eror ( invalid params given)
  // }
}
