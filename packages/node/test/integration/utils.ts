import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import {
  AppABIEncodings,
  AppInstanceJson,
  AppInstanceProposal,
  ContractABI,
  Node as NodeTypes,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { One, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import {
  CreateChannelMessage,
  InstallVirtualMessage,
  jsonRpcDeserialize,
  JsonRpcResponse,
  Node,
  NODE_EVENTS,
  ProposeMessage,
  ProposeVirtualMessage,
  Rpc
} from "../../src";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  FreeBalanceState
} from "../../src/models/free-balance";

import {
  initialEmptyTTTState,
  tttActionEncoding,
  tttStateEncoding
} from "./tic-tac-toe";

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
  const req = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.CREATE_CHANNEL,
    params: {
      owners: xpubs
    }
  });
  const response = await node.rpcRouter.dispatch(req);
  const result = response.result as NodeTypes.CreateChannelTransactionResult;
  return result.transactionHash;
}

/**
 * Wrapper method making the call to the given node to get the list of
 * multisig addresses the node is aware of.
 * @param node
 * @returns list of multisig addresses
 */
export async function getChannelAddresses(node: Node): Promise<Set<string>> {
  const req: NodeTypes.MethodRequest = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_CHANNEL_ADDRESSES,
    params: {} as NodeTypes.CreateChannelParams
  };
  const response: NodeTypes.MethodResponse = await node.call(req.type, req);
  const result = response.result as NodeTypes.GetChannelAddressesResult;
  return new Set(result.multisigAddresses);
}

export async function getInstalledAppInstance(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceJson> {
  const allAppInstances = await getInstalledAppInstances(node);
  return allAppInstances.filter(appInstance => {
    return appInstance.identityHash === appInstanceId;
  })[0];
}

export async function getAppInstanceProposal(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceProposal> {
  const req = {
    requestId: generateUUID(),
    type: NodeTypes.MethodName.GET_PROPOSED_APP_INSTANCE,
    params: {
      appInstanceId
    }
  };
  const response = await node.call(req.type, req);
  return (response.result as NodeTypes.GetProposedAppInstanceResult)
    .appInstance;
}

export async function getFreeBalanceState(
  node: Node,
  multisigAddress: string,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<NodeTypes.GetFreeBalanceStateResult> {
  const req = jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_FREE_BALANCE_STATE,
    params: {
      multisigAddress,
      tokenAddress
    },
    jsonrpc: "2.0"
  });
  const response = (await node.rpcRouter.dispatch(req)) as JsonRpcResponse;
  return response.result.result as NodeTypes.GetFreeBalanceStateResult;
}

export async function getInstalledAppInstances(
  node: Node
): Promise<AppInstanceJson[]> {
  const request = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_APP_INSTANCES,
    params: {} as NodeTypes.GetAppInstancesParams
  });
  const response = (await node.rpcRouter.dispatch(request)) as JsonRpcResponse;
  const result = response.result.result as NodeTypes.GetAppInstancesResult;
  return result.appInstances;
}

export async function getProposedAppInstances(
  node: Node
): Promise<AppInstanceProposal[]> {
  const request = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_PROPOSED_APP_INSTANCES,
    params: {} as NodeTypes.GetProposedAppInstancesParams
  });
  const response = (await node.rpcRouter.dispatch(request)) as JsonRpcResponse;
  const result = response.result
    .result as NodeTypes.GetProposedAppInstancesResult;
  return result.appInstances;
}

export function makeDepositRequest(
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

export function makeWithdrawRequest(
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

export function makeInstallRequest(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.InstallParams,
    jsonrpc: "2.0"
  });
}

export function makeRejectInstallRequest(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.REJECT_INSTALL,
    params: {
      appInstanceId
    } as NodeTypes.RejectInstallParams,
    jsonrpc: "2.0"
  });
}

export function makeTTTProposalRequest(
  proposedByIdentifier: string,
  proposedToIdentifier: string,
  appDefinition: string,
  state: SolidityABIEncoderV2Type = {},
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  const initialState =
    Object.keys(state).length !== 0 ? state : initialEmptyTTTState();

  const params: NodeTypes.ProposeInstallParams = {
    proposedToIdentifier,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress,
    appDefinition,
    initialState,
    abiEncodings: {
      stateEncoding: tttStateEncoding,
      actionEncoding: tttActionEncoding
    } as AppABIEncodings,
    timeout: One,
    outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
  };

  return jsonRpcDeserialize({
    params,
    id: Date.now(),
    method: NodeTypes.RpcMethodName.PROPOSE_INSTALL,
    jsonrpc: "2.0"
  });
}

export function makeInstallVirtualRequest(
  appInstanceId: string,
  intermediaries: string[]
): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId,
      intermediaries
    } as NodeTypes.InstallVirtualParams,
    id: Date.now(),
    method: NodeTypes.RpcMethodName.INSTALL_VIRTUAL,
    jsonrpc: "2.0"
  });
}

export function makeTTTVirtualProposalRequest(
  proposedByIdentifier: string,
  proposedToIdentifier: string,
  intermediaries: string[],
  appDefinition: string,
  initialState: SolidityABIEncoderV2Type = {},
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  const installProposalParams = makeTTTProposalRequest(
    proposedByIdentifier,
    proposedToIdentifier,
    appDefinition,
    initialState,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  ).parameters as NodeTypes.ProposeInstallParams;

  const installVirtualParams: NodeTypes.ProposeInstallVirtualParams = {
    ...installProposalParams,
    intermediaries
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
export async function confirmProposedAppInstanceOnNode(
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

export function confirmProposedVirtualAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstance: AppInstanceProposal,
  nonInitiatingNode: boolean = false
) {
  confirmProposedAppInstanceOnNode(
    methodParams,
    proposedAppInstance,
    nonInitiatingNode
  );
  const proposalParams = methodParams as NodeTypes.ProposeInstallVirtualParams;
  expect(proposalParams.intermediaries).toEqual(
    proposedAppInstance.intermediaries
  );
}

export function generateGetStateRequest(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId
    },
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_STATE,
    jsonrpc: "2.0"
  });
}

export function generateTakeActionRequest(
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

export function generateUninstallRequest(appInstanceId: string): Rpc {
  return jsonRpcDeserialize({
    params: {
      appInstanceId
    } as NodeTypes.UninstallParams,
    id: Date.now(),
    jsonrpc: "2.0",
    method: NodeTypes.RpcMethodName.UNINSTALL
  });
}

export function generateUninstallVirtualRequest(
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

export async function sleep(timeInMilliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, timeInMilliseconds));
}

export async function collateralizeChannel(
  node1: Node,
  node2: Node,
  multisigAddress: string,
  amount: BigNumber = One,
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<void> {
  const depositReq = makeDepositRequest(multisigAddress, amount, tokenAddress);
  node1.on(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {});
  node2.on(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {});
  await node1.rpcRouter.dispatch(depositReq);
  await node2.rpcRouter.dispatch(depositReq);
}

export async function createChannel(nodeA: Node, nodeB: Node): Promise<string> {
  return new Promise(async (resolve, reject) => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async (msg: CreateChannelMessage) => {
      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
      expect(await getInstalledAppInstances(nodeB)).toEqual([]);
      resolve(msg.data.multisigAddress);
    });

    // trigger channel creation but only resolve with the multisig address
    // as acknowledged by the node
    getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
}

export async function installTTTApp(
  nodeA: Node,
  nodeB: Node,
  initialState?: SolidityABIEncoderV2Type
): Promise<string> {
  const initialTTTState: SolidityABIEncoderV2Type = initialState
    ? initialState
    : initialEmptyTTTState();

  return new Promise(async (resolve, reject) => {
    const appInstanceInstallationProposalRequest = makeTTTProposalRequest(
      nodeA.publicIdentifier,
      nodeB.publicIdentifier,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
      initialTTTState
    );

    nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
      confirmProposedAppInstanceOnNode(
        appInstanceInstallationProposalRequest.parameters,
        await getAppInstanceProposal(nodeA, appInstanceId)
      );

      const installRequest = makeInstallRequest(msg.data.appInstanceId);
      await nodeB.rpcRouter.dispatch(installRequest);
    });

    nodeA.on(NODE_EVENTS.INSTALL, async () => {
      const appInstanceNodeA = await getInstalledAppInstance(
        nodeA,
        appInstanceId
      );
      const appInstanceNodeB = await getInstalledAppInstance(
        nodeB,
        appInstanceId
      );
      expect(appInstanceNodeA).toEqual(appInstanceNodeB);
      resolve(appInstanceId);
    });

    const response = await nodeA.rpcRouter.dispatch(
      appInstanceInstallationProposalRequest
    );

    const { appInstanceId } = response.result
      .result as NodeTypes.ProposeInstallResult;
  });
}

export async function installTTTAppVirtual(
  nodeA: Node,
  nodeB: Node,
  nodeC: Node,
  initialState?: SolidityABIEncoderV2Type
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    nodeA.on(
      NODE_EVENTS.INSTALL_VIRTUAL,
      async (msg: InstallVirtualMessage) => {
        resolve(msg.data.params.appInstanceId);
      }
    );

    nodeC.on(
      NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
      async (msg: ProposeVirtualMessage) => {
        const installReq = makeInstallVirtualRequest(
          msg.data.appInstanceId,
          msg.data.params.intermediaries
        );
        await nodeC.rpcRouter.dispatch(installReq);
      }
    );

    await makeTTTVirtualProposal(nodeA, nodeC, nodeB, initialState);
  });
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
): Promise<SolidityABIEncoderV2Type> {
  const getStateReq = generateGetStateRequest(appInstanceId);
  const getStateResult = await nodeA.rpcRouter.dispatch(getStateReq);
  return (getStateResult.result.result as NodeTypes.GetStateResult).state;
}

export async function makeTTTVirtualProposal(
  nodeA: Node,
  nodeC: Node,
  nodeB: Node,
  initialState: SolidityABIEncoderV2Type = {}
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallVirtualParams;
}> {
  const virtualAppInstanceProposalRequest = makeTTTVirtualProposalRequest(
    nodeA.publicIdentifier,
    nodeC.publicIdentifier,
    [nodeB.publicIdentifier],
    (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
    initialState,
    One,
    CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    Zero,
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );
  const params = virtualAppInstanceProposalRequest.parameters as NodeTypes.ProposeInstallVirtualParams;
  const {
    result: {
      result: { appInstanceId }
    }
  } = await nodeA.rpcRouter.dispatch(
    jsonRpcDeserialize({
      params,
      jsonrpc: "2.0",
      method: NodeTypes.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
      id: Date.now()
    })
  );
  expect(appInstanceId).toBeDefined();
  return { appInstanceId, params };
}

export function installTTTVirtual(
  node: Node,
  appInstanceId: string,
  intermediaries: string[]
) {
  const installVirtualReq = makeInstallVirtualRequest(
    appInstanceId,
    intermediaries
  );
  node.rpcRouter.dispatch(installVirtualReq);
}

export function makeInstallCall(node: Node, appInstanceId: string) {
  const installRequest = makeInstallRequest(appInstanceId);
  node.rpcRouter.dispatch(installRequest);
}

export async function makeVirtualProposeCall(
  nodeA: Node,
  nodeC: Node,
  nodeB: Node
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallVirtualParams;
}> {
  const virtualAppInstanceProposalRequest = makeTTTVirtualProposalRequest(
    nodeA.publicIdentifier,
    nodeC.publicIdentifier,
    [nodeB.publicIdentifier],
    (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
  );

  const response = await nodeA.rpcRouter.dispatch(
    virtualAppInstanceProposalRequest
  );

  return {
    appInstanceId: (response.result as NodeTypes.ProposeInstallVirtualResult)
      .appInstanceId,
    params: virtualAppInstanceProposalRequest.parameters as NodeTypes.ProposeInstallVirtualParams
  };
}

export async function makeProposeCall(
  nodeA: Node,
  nodeB: Node,
  appDefinition: string = (global[
    "networkContext"
  ] as NetworkContextForTestSuite).TicTacToeApp,
  state: SolidityABIEncoderV2Type = {},
  initiatorDeposit: BigNumber = Zero,
  initiatorDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  responderDeposit: BigNumber = Zero,
  responderDepositTokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallParams;
}> {
  const appInstanceProposalReq = makeTTTProposalRequest(
    nodeA.publicIdentifier,
    nodeB.publicIdentifier,
    appDefinition,
    state,
    initiatorDeposit,
    initiatorDepositTokenAddress,
    responderDeposit,
    responderDepositTokenAddress
  );

  const {
    result: {
      result: { appInstanceId }
    }
  } = await nodeA.rpcRouter.dispatch(appInstanceProposalReq);

  return {
    appInstanceId,
    params: appInstanceProposalReq.parameters as NodeTypes.ProposeInstallParams
  };
}

export function createFreeBalanceStateWithFundedTokenAmounts(
  addresses: string[],
  amount: BigNumber,
  tokenAddresses: string[]
): FreeBalanceState {
  const balancesIndexedByToken = {};
  tokenAddresses.forEach(tokenAddress => {
    balancesIndexedByToken[tokenAddress] = addresses.map(to => ({
      to,
      amount
    }));
  });

  return {
    balancesIndexedByToken,
    activeAppsMap: {}
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
