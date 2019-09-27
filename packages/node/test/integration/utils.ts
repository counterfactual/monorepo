import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/DolphinCoin.json";
import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import {
  AppABIEncodings,
  AppInstanceJson,
  AppInstanceProposal,
  ContractABI,
  Node as NodeTypes,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { One, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import {
  CreateChannelMessage,
  InstallMessage,
  InstallVirtualMessage,
  jsonRpcDeserialize,
  JsonRpcResponse,
  Node,
  NODE_EVENTS,
  ProposeMessage,
  Rpc,
  UninstallMessage,
  UninstallVirtualMessage
} from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";

import { initialLinkedState, linkedAbiEncodings } from "./linked-transfer";
import {
  initialSimpleTransferState,
  simpleTransferAbiEncodings
} from "./simple-transfer";
import { initialEmptyTTTState, tttAbiEncodings } from "./tic-tac-toe";
import {
  initialTransferState,
  transferAbiEncodings
} from "./unidirectional-transfer";

interface AppContext {
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  initialState: SolidityValueType;
  outcomeType: OutcomeType;
}

const {
  TicTacToeApp,
  SimpleTransferApp,
  UnidirectionalLinkedTransferApp,
  UnidirectionalTransferApp
} = global["networkContext"] as NetworkContextForTestSuite;

/**
 * Even though this function returns a transaction hash, the calling Node
 * will receive an event (CREATE_CHANNEL) that should be subscribed to to
 * ensure a channel has been instantiated and to get its multisig address
 * back in the event data.
 */
export async function getMultisigCreationTransactionHash(
  node: Node,
  xpubs: string[]
): Promise<string> {
  const {
    result: {
      result: { transactionHash }
    }
  } = await node.rpcRouter.dispatch({
    id: Date.now(),
    methodName: NodeTypes.RpcMethodName.CREATE_CHANNEL,
    parameters: {
      owners: xpubs
    }
  });

  return transactionHash;
}

/**
 * Wrapper method making the call to the given node to get the list of
 * multisig addresses the node is aware of.
 * @param node
 * @returns list of multisig addresses
 */
export async function getChannelAddresses(node: Node): Promise<Set<string>> {
  const {
    result: {
      result: { multisigAddresses }
    }
  } = await node.rpcRouter.dispatch({
    id: Date.now(),
    methodName: NodeTypes.RpcMethodName.GET_CHANNEL_ADDRESSES,
    parameters: {}
  });

  return new Set(multisigAddresses);
}

export async function getAppInstance(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceJson> {
  const {
    result: {
      result: { appInstance }
    }
  } = await node.rpcRouter.dispatch({
    id: Date.now(),
    methodName: NodeTypes.RpcMethodName.GET_APP_INSTANCE_DETAILS,
    parameters: {
      appInstanceId
    }
  });

  return appInstance;
}

export async function getAppInstanceProposal(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceProposal> {
  const candidates = (await getProposedAppInstances(node)).filter(proposal => {
    return proposal.identityHash === appInstanceId;
  });

  if (candidates.length === 0) {
    throw new Error("Could not find proposal");
  }

  if (candidates.length > 1) {
    throw new Error("Failed to match exactly one proposed app instance");
  }

  return candidates[0];
}

export async function getFreeBalanceState(
  node: Node,
  multisigAddress: string,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<NodeTypes.GetFreeBalanceStateResult> {
  const {
    result: { result }
  } = await node.rpcRouter.dispatch({
    id: Date.now(),
    methodName: NodeTypes.RpcMethodName.GET_FREE_BALANCE_STATE,
    parameters: {
      multisigAddress,
      tokenAddress
    }
  });

  return result;
}

export async function getTokenIndexedFreeBalanceStates(
  node: Node,
  multisigAddress: string
): Promise<NodeTypes.GetTokenIndexedFreeBalanceStatesResult> {
  const {
    result: { result }
  } = await node.rpcRouter.dispatch({
    id: Date.now(),
    methodName: NodeTypes.RpcMethodName.GET_TOKEN_INDEXED_FREE_BALANCE_STATES,
    parameters: {
      multisigAddress
    }
  });

  return result as NodeTypes.GetTokenIndexedFreeBalanceStatesResult;
}

export async function getInstalledAppInstances(
  node: Node
): Promise<AppInstanceJson[]> {
  const rpc = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_APP_INSTANCES,
    params: {} as NodeTypes.GetAppInstancesParams
  });
  const response = (await node.rpcRouter.dispatch(rpc)) as JsonRpcResponse;
  const result = response.result.result as NodeTypes.GetAppInstancesResult;
  return result.appInstances;
}

export async function getProposedAppInstances(
  node: Node
): Promise<AppInstanceProposal[]> {
  const rpc = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_PROPOSED_APP_INSTANCES,
    params: {} as NodeTypes.GetProposedAppInstancesParams
  });
  const response = (await node.rpcRouter.dispatch(rpc)) as JsonRpcResponse;
  const result = response.result
    .result as NodeTypes.GetProposedAppInstancesResult;
  return result.appInstances;
}

export async function deposit(
  node: Node,
  multisigAddress: string,
  amount: BigNumber = One,
  tokenAddress?: string
) {
  const depositReq = constructDepositRpc(multisigAddress, amount, tokenAddress);

  await node.rpcRouter.dispatch(depositReq);
}

export async function deployStateDepositHolder(
  node: Node,
  multisigAddress: string
) {
  const response = await node.rpcRouter.dispatch({
    methodName: NodeTypes.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER,
    parameters: {
      multisigAddress
    } as NodeTypes.DeployStateDepositHolderParams
  });

  const result = response.result
    .result as NodeTypes.DeployStateDepositHolderResult;

  return result.transactionHash;
}

export function constructDepositRpc(
  multisigAddress: string,
  amount: BigNumber,
  tokenAddress?: string
): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.DEPOSIT,
    params: {
      multisigAddress,
      amount,
      tokenAddress
    } as NodeTypes.DepositParams,
    jsonrpc: "2.0"
  });
}

export function constructWithdrawCommitmentRpc(
  multisigAddress: string,
  amount: BigNumber,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  recipient?: string
): Rpc {
  const withdrawCommitmentReq = constructWithdrawRpc(
    multisigAddress,
    amount,
    tokenAddress,
    recipient
  );

  withdrawCommitmentReq.methodName =
    NodeTypes.RpcMethodName.WITHDRAW_COMMITMENT;
  return withdrawCommitmentReq;
}

export function constructWithdrawRpc(
  multisigAddress: string,
  amount: BigNumber,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  recipient?: string
): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.WITHDRAW,
    params: {
      tokenAddress,
      multisigAddress,
      amount,
      recipient
    } as NodeTypes.WithdrawParams,
    jsonrpc: "2.0"
  });
}

export function constructInstallRpc(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.InstallParams,
    jsonrpc: "2.0"
  });
}

export function constructRejectInstallRpc(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.REJECT_INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.RejectInstallParams,
    jsonrpc: "2.0"
  });
}

export function constructAppProposalRpc(
  proposedToIdentifier: string,
  appDefinition: string,
  abiEncodings: AppABIEncodings,
  initialState: SolidityValueType,
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  const { outcomeType } = getAppContext(appDefinition, initialState);
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.PROPOSE_INSTALL,
    jsonrpc: "2.0",
    params: {
      proposedToIdentifier,
      initiatorDeposit,
      initiatorDepositTokenAddress,
      responderDeposit,
      responderDepositTokenAddress,
      appDefinition,
      initialState,
      abiEncodings,
      outcomeType,
      timeout: One
    } as NodeTypes.ProposeInstallParams
  });
}

export function constructInstallVirtualRpc(
  appInstanceId: string,
  intermediaryIdentifier: string
): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId,
      intermediaryIdentifier
    } as NodeTypes.InstallVirtualParams,
    id: Date.now(),
    method: NodeTypes.RpcMethodName.INSTALL_VIRTUAL,
    jsonrpc: "2.0"
  });
}

export function constructVirtualProposalRpc(
  proposedToIdentifier: string,
  intermediaryIdentifier: string,
  appDefinition: string,
  abiEncodings: AppABIEncodings,
  initialState: SolidityValueType = {},
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  const installProposalParams = constructAppProposalRpc(
    proposedToIdentifier,
    appDefinition,
    abiEncodings,
    initialState,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  ).parameters as NodeTypes.ProposeInstallParams;

  const installVirtualParams: NodeTypes.ProposeInstallVirtualParams = {
    ...installProposalParams,
    intermediaryIdentifier
  };

  return jsonRpcDeserialize({
    params: installVirtualParams,
    id: Date.now(),
    method: NodeTypes.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
    jsonrpc: "2.0"
  });
}

/**
 * @param proposalParams The parameters of the installation proposal.
 * @param appInstanceProposal The proposed app instance contained in the Node.
 */
export async function confirmProposedAppInstance(
  methodParams: NodeTypes.MethodParams,
  appInstanceProposal: AppInstanceProposal,
  nonInitiatingNode: boolean = false
) {
  const proposalParams = methodParams as NodeTypes.ProposeInstallParams;
  expect(proposalParams.abiEncodings).toEqual(appInstanceProposal.abiEncodings);
  expect(proposalParams.appDefinition).toEqual(
    appInstanceProposal.appDefinition
  );

  if (nonInitiatingNode) {
    expect(proposalParams.initiatorDeposit).toEqual(
      appInstanceProposal.responderDeposit
    );
    expect(proposalParams.responderDeposit).toEqual(
      appInstanceProposal.initiatorDeposit
    );
  } else {
    expect(proposalParams.initiatorDeposit).toEqual(
      appInstanceProposal.initiatorDeposit
    );
    expect(proposalParams.responderDeposit).toEqual(
      appInstanceProposal.responderDeposit
    );
  }
  expect(proposalParams.timeout).toEqual(appInstanceProposal.timeout);
  // TODO: uncomment when getState is implemented
  // expect(proposalParams.initialState).toEqual(appInstanceInitialState);
}

export function confirmProposedVirtualAppInstance(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstance: AppInstanceProposal,
  nonInitiatingNode: boolean = false
) {
  confirmProposedAppInstance(
    methodParams,
    proposedAppInstance,
    nonInitiatingNode
  );
  const proposalParams = methodParams as NodeTypes.ProposeInstallVirtualParams;
  expect(proposalParams.intermediaryIdentifier).toEqual(
    proposedAppInstance.intermediaryIdentifier
  );
}

export function constructGetStateRpc(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId
    },
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_STATE,
    jsonrpc: "2.0"
  });
}

export function constructTakeActionRpc(
  appInstanceId: string,
  action: any
): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId,
      action
    } as NodeTypes.TakeActionParams,
    id: Date.now(),
    jsonrpc: "2.0",
    method: NodeTypes.RpcMethodName.TAKE_ACTION
  });
}

export function constructGetAppsRpc(): Rpc {
  return jsonRpcDeserialize({
    params: {},
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_APP_INSTANCES,
    jsonrpc: "2.0"
  });
}

export function constructUninstallRpc(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId
    } as NodeTypes.UninstallParams,
    id: Date.now(),
    jsonrpc: "2.0",
    method: NodeTypes.RpcMethodName.UNINSTALL
  });
}

export function constructUninstallVirtualRpc(
  appInstanceId: string,
  intermediaryIdentifier: string
): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId,
      intermediaryIdentifier
    } as NodeTypes.UninstallVirtualParams,
    id: Date.now(),
    jsonrpc: "2.0",
    method: NodeTypes.RpcMethodName.UNINSTALL_VIRTUAL
  });
}

export async function collateralizeChannel(
  multisigAddress: string,
  node1: Node,
  node2?: Node,
  amount: BigNumber = One,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<void> {
  const depositReq = constructDepositRpc(multisigAddress, amount, tokenAddress);
  await node1.rpcRouter.dispatch(depositReq);
  if (!node2) return;
  await node2.rpcRouter.dispatch(depositReq);
}

export async function createChannel(nodeA: Node, nodeB: Node): Promise<string> {
  return new Promise(async resolve => {
    nodeB.on(NODE_EVENTS.CREATE_CHANNEL, async (msg: CreateChannelMessage) => {
      expect(await getInstalledAppInstances(nodeB)).toEqual([]);
      resolve(msg.data.multisigAddress);
    });

    // trigger channel creation but only resolve with the multisig address
    // as acknowledged by the node
    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);

    expect(await getInstalledAppInstances(nodeA)).toEqual([]);
  });
}

// NOTE: Do not run this concurrently, it won't work
export async function installApp(
  nodeA: Node,
  nodeB: Node,
  appDefinition: string,
  initialState?: SolidityValueType,
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<[string, NodeTypes.ProposeInstallParams]> {
  const appContext = getAppContext(appDefinition, initialState);

  const installationProposalRpc = constructAppProposalRpc(
    nodeB.publicIdentifier,
    appContext.appDefinition,
    appContext.abiEncodings,
    appContext.initialState,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  );

  const proposedParams = installationProposalRpc.parameters as NodeTypes.ProposeInstallParams;

  return new Promise(async resolve => {
    nodeB.once(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
      const {
        data: { appInstanceId }
      } = msg;

      // Sanity-check
      confirmProposedAppInstance(
        installationProposalRpc.parameters,
        await getAppInstanceProposal(nodeA, appInstanceId)
      );

      nodeA.once(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
        if (msg.data.params.appInstanceId === appInstanceId) {
          const appInstanceId = msg.data.params.appInstanceId;
          const appInstanceNodeA = await getAppInstance(nodeA, appInstanceId);
          const appInstanceNodeB = await getAppInstance(nodeB, appInstanceId);
          expect(appInstanceNodeA).toEqual(appInstanceNodeB);
          resolve([appInstanceId, proposedParams]);
        }
      });

      await nodeB.rpcRouter.dispatch(
        constructInstallRpc(msg.data.appInstanceId)
      );
    });

    const response = await nodeA.rpcRouter.dispatch(installationProposalRpc);

    const { appInstanceId } = response.result
      .result as NodeTypes.ProposeInstallResult;
    return appInstanceId;
  });
}

export async function installVirtualApp(
  nodeA: Node,
  nodeB: Node,
  nodeC: Node,
  appDefinition: string,
  initialState?: SolidityValueType,
  assetId?: string,
  initiatorDeposit?: BigNumber,
  responderDeposit?: BigNumber
): Promise<string> {
  nodeC.on(
    NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
    async ({ data: { appInstanceId: eventAppInstanceId } }: ProposeMessage) => {
      const {
        appInstanceId,
        params: { intermediaryIdentifier }
      } = await proposal;
      if (eventAppInstanceId === appInstanceId) {
        nodeC.rpcRouter.dispatch(
          constructInstallVirtualRpc(appInstanceId, intermediaryIdentifier)
        );
      }
    }
  );

  const proposal = makeVirtualProposal(
    nodeA,
    nodeC,
    nodeB,
    appDefinition,
    initialState,
    assetId,
    initiatorDeposit,
    responderDeposit
  );

  return new Promise((resolve: (appInstanceId: string) => void) =>
    nodeA.once(
      NODE_EVENTS.INSTALL_VIRTUAL,
      async ({
        data: {
          params: { appInstanceId: eventAppInstanceId }
        }
      }: InstallVirtualMessage) => {
        const { appInstanceId } = await proposal;
        if (eventAppInstanceId === appInstanceId) resolve(appInstanceId);
      }
    )
  );
}

export async function confirmChannelCreation(
  nodeA: Node,
  nodeB: Node,
  ownersPublicIdentifiers: string[],
  data: NodeTypes.CreateChannelResult
) {
  const openChannelsNodeA = await getChannelAddresses(nodeA);
  const openChannelsNodeB = await getChannelAddresses(nodeB);

  expect(openChannelsNodeA.has(data.multisigAddress)).toBeTruthy();
  expect(openChannelsNodeB.has(data.multisigAddress)).toBeTruthy();
  expect(data.owners).toEqual(ownersPublicIdentifiers);
}

export async function confirmAppInstanceInstallation(
  proposedParams: NodeTypes.ProposeInstallParams,
  appInstance: AppInstanceJson
) {
  expect(appInstance.appInterface.addr).toEqual(proposedParams.appDefinition);
  expect(appInstance.appInterface.stateEncoding).toEqual(
    proposedParams.abiEncodings.stateEncoding
  );
  expect(appInstance.appInterface.actionEncoding).toEqual(
    proposedParams.abiEncodings.actionEncoding
  );
  expect(appInstance.defaultTimeout).toEqual(proposedParams.timeout.toNumber());
  expect(appInstance.latestState).toEqual(proposedParams.initialState);
}

export async function getState(
  nodeA: Node,
  appInstanceId: string
): Promise<SolidityValueType> {
  const getStateReq = constructGetStateRpc(appInstanceId);
  const getStateResult = await nodeA.rpcRouter.dispatch(getStateReq);
  return (getStateResult.result.result as NodeTypes.GetStateResult).state;
}

export async function makeVirtualProposal(
  nodeA: Node,
  nodeC: Node,
  nodeB: Node,
  appDefinition: string,
  initialState?: SolidityValueType,
  assetId?: string,
  initiatorDeposit?: BigNumber,
  responderDeposit?: BigNumber
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallVirtualParams;
}> {
  const appContext = getAppContext(appDefinition, initialState);

  const virtualProposalRpc = constructVirtualProposalRpc(
    nodeC.publicIdentifier,
    nodeB.publicIdentifier,
    appContext.appDefinition,
    appContext.abiEncodings,
    appContext.initialState,
    initiatorDeposit || One,
    assetId || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    responderDeposit || Zero,
    assetId || CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

  const params = virtualProposalRpc.parameters as NodeTypes.ProposeInstallVirtualParams;

  const {
    result: {
      result: { appInstanceId }
    }
  } = await nodeA.rpcRouter.dispatch({
    parameters: params,
    methodName: NodeTypes.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
    id: Date.now()
  });

  return { appInstanceId, params };
}

export async function installTTTVirtual(
  node: Node,
  appInstanceId: string,
  intermediaryIdentifier: string
) {
  return await node.rpcRouter.dispatch(
    constructInstallVirtualRpc(appInstanceId, intermediaryIdentifier)
  );
}

export async function makeInstallCall(node: Node, appInstanceId: string) {
  return await node.rpcRouter.dispatch(constructInstallRpc(appInstanceId));
}

export async function makeVirtualProposeCall(
  nodeA: Node,
  nodeC: Node,
  nodeB: Node,
  appDefinition: string,
  initialState?: SolidityValueType
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallVirtualParams;
}> {
  const appContext = getAppContext(appDefinition, initialState);

  const virtualProposalRpc = constructVirtualProposalRpc(
    nodeC.publicIdentifier,
    nodeB.publicIdentifier,
    appContext.appDefinition,
    appContext.abiEncodings,
    appContext.initialState
  );

  const response = await nodeA.rpcRouter.dispatch(virtualProposalRpc);

  return {
    appInstanceId: (response.result as NodeTypes.ProposeInstallVirtualResult)
      .appInstanceId,
    params: virtualProposalRpc.parameters as NodeTypes.ProposeInstallVirtualParams
  };
}

export function makeProposeCall(
  nodeB: Node,
  appDefinition: string,
  initialState?: SolidityValueType,
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  const appContext = getAppContext(appDefinition, initialState);
  return constructAppProposalRpc(
    nodeB.publicIdentifier,
    appContext.appDefinition,
    appContext.abiEncodings,
    appContext.initialState,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  );
}

export async function makeAndSendProposeCall(
  nodeA: Node,
  nodeB: Node,
  appDefinition: string,
  initialState?: SolidityValueType,
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallParams;
}> {
  const installationProposalRpc = makeProposeCall(
    nodeB,
    appDefinition,
    initialState,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  );

  const {
    result: {
      result: { appInstanceId }
    }
  } = await nodeA.rpcRouter.dispatch(installationProposalRpc);

  return {
    appInstanceId,
    params: installationProposalRpc.parameters as NodeTypes.ProposeInstallParams
  };
}

/**
 * @return the ERC20 token balance of the receiver
 */
export async function transferERC20Tokens(
  toAddress: string,
  tokenAddress: string = global["networkContext"]["DolphinCoin"],
  contractABI: ContractABI = DolphinCoin.abi,
  amount: BigNumber = One
): Promise<BigNumber> {
  const deployerAccount = new Wallet(
    global["fundedPrivateKey"],
    new JsonRpcProvider(global["ganacheURL"])
  );

  const contract = new Contract(tokenAddress, contractABI, deployerAccount);

  const balanceBefore: BigNumber = await contract.functions.balanceOf(
    toAddress
  );

  await contract.functions.transfer(toAddress, amount);
  const balanceAfter: BigNumber = await contract.functions.balanceOf(toAddress);

  expect(balanceAfter.sub(balanceBefore)).toEqual(amount);

  return balanceAfter;
}

export function getAppContext(
  appDefinition: string,
  initialState?: SolidityValueType,
  senderAddress?: string, // needed for both types of transfer apps
  receiverAddress?: string // needed for both types of transfer apps
): AppContext {
  const checkForAddresses = () => {
    const missingAddr = !senderAddress || !receiverAddress;
    if (missingAddr && !initialState) {
      throw new Error(
        "Must have sender and redeemer addresses to generate initial state for either transfer app context"
      );
    }
  };

  switch (appDefinition) {
    case TicTacToeApp:
      return {
        appDefinition,
        abiEncodings: tttAbiEncodings,
        initialState: initialState || initialEmptyTTTState(),
        outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
      };

    case UnidirectionalTransferApp:
      checkForAddresses();
      return {
        appDefinition,
        initialState:
          initialState ||
          initialTransferState(senderAddress!, receiverAddress!),
        abiEncodings: transferAbiEncodings,
        outcomeType: OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER
      };

    case UnidirectionalLinkedTransferApp:
      checkForAddresses();
      // TODO: need a better way to return the action info that generated
      // the linked hash as well
      const { state } = initialLinkedState(senderAddress!, receiverAddress!);
      return {
        appDefinition,
        initialState: initialState || state,
        abiEncodings: linkedAbiEncodings,
        outcomeType: OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER
      };

    case SimpleTransferApp:
      checkForAddresses();
      return {
        appDefinition,
        initialState:
          initialState ||
          initialSimpleTransferState(senderAddress!, receiverAddress!),
        abiEncodings: simpleTransferAbiEncodings,
        outcomeType: OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER
      };

    default:
      throw new Error(
        `Proposing the specified app is not supported: ${appDefinition}`
      );
  }
}

export async function uninstallVirtualApp(
  node: Node,
  counterparty: Node,
  intermediaryPubId: string,
  appId: string
): Promise<string> {
  const rpc = constructUninstallVirtualRpc(appId, intermediaryPubId);
  return new Promise(async resolve => {
    counterparty.once(
      NODE_EVENTS.UNINSTALL_VIRTUAL,
      (msg: UninstallVirtualMessage) => {
        resolve(msg.data.appInstanceId);
      }
    );
    await node.rpcRouter.dispatch(rpc);
  });
}

export async function takeAppAction(node: Node, appId: string, action: any) {
  const res = await node.rpcRouter.dispatch(
    constructTakeActionRpc(appId, action)
  );
  return res.result.result;
}

export async function uninstallApp(
  node: Node,
  counterparty: Node,
  appId: string
): Promise<string> {
  return new Promise(async resolve => {
    counterparty.once(NODE_EVENTS.UNINSTALL, (msg: UninstallMessage) => {
      resolve(msg.data.appInstanceId);
    });
    await node.rpcRouter.dispatch(constructUninstallRpc(appId));
  });
}

export async function getApps(node: Node): Promise<AppInstanceJson[]> {
  return (await node.rpcRouter.dispatch(constructGetAppsRpc())).result.result
    .appInstances;
}
