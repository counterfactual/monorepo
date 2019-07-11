import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import {
  Address,
  AppABIEncodings,
  AppInstanceInfo,
  ContractABI,
  NetworkContext,
  networkContextProps,
  Node as NodeTypes,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Contract, Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
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
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
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
): Promise<Address> {
  const req = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.CREATE_CHANNEL,
    params: {
      owners: xpubs
    }
  });
  const response = (await node.rpcRouter.dispatch(req)) as JsonRpcResponse;
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

export async function getInstalledAppInstances(
  node: Node
): Promise<AppInstanceInfo[]> {
  return getApps(node, APP_INSTANCE_STATUS.INSTALLED);
}

export async function getInstalledAppInstanceInfo(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceInfo> {
  const allAppInstanceInfos = await getApps(
    node,
    APP_INSTANCE_STATUS.INSTALLED
  );
  return allAppInstanceInfos.filter(appInstanceInfo => {
    return appInstanceInfo.identityHash === appInstanceId;
  })[0];
}

export async function getProposedAppInstances(
  node: Node
): Promise<AppInstanceInfo[]> {
  return getApps(node, APP_INSTANCE_STATUS.PROPOSED);
}

export async function getProposedAppInstanceInfo(
  node: Node,
  appInstanceId: string
): Promise<AppInstanceInfo> {
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

export async function getApps(
  node: Node,
  appInstanceStatus: APP_INSTANCE_STATUS
): Promise<AppInstanceInfo[]> {
  let request: Rpc;
  let response: JsonRpcResponse;
  let result;
  if (appInstanceStatus === APP_INSTANCE_STATUS.INSTALLED) {
    request = jsonRpcDeserialize({
      jsonrpc: "2.0",
      id: Date.now(),
      method: NodeTypes.RpcMethodName.GET_APP_INSTANCES,
      params: {} as NodeTypes.GetAppInstancesParams
    });
    response = (await node.rpcRouter.dispatch(request)) as JsonRpcResponse;
    result = response.result.result as NodeTypes.GetAppInstancesResult;
    return result.appInstances;
  }
  request = jsonRpcDeserialize({
    jsonrpc: "2.0",
    id: Date.now(),
    method: NodeTypes.RpcMethodName.GET_PROPOSED_APP_INSTANCES,
    params: {} as NodeTypes.GetProposedAppInstancesParams
  });
  response = (await node.rpcRouter.dispatch(request)) as JsonRpcResponse;
  result = response.result.result as NodeTypes.GetProposedAppInstancesResult;
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
  tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
): Rpc {
  return jsonRpcDeserialize({
    id: Date.now(),
    method: NodeTypes.RpcMethodName.WITHDRAW,
    params: {
      tokenAddress,
      multisigAddress,
      amount
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
  myDeposit: BigNumber = Zero,
  peerDeposit: BigNumber = Zero
): Rpc {
  const initialState =
    Object.keys(state).length !== 0 ? state : initialEmptyTTTState();

  const params: NodeTypes.ProposeInstallParams = {
    proposedToIdentifier,
    myDeposit,
    peerDeposit,
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
  intermediaries: Address[]
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
  myDeposit: BigNumber = Zero,
  peerDeposit: BigNumber = Zero
): Rpc {
  const installProposalParams = makeTTTProposalRequest(
    proposedByIdentifier,
    proposedToIdentifier,
    appDefinition,
    initialState,
    myDeposit,
    peerDeposit
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
 * @param proposedAppInstanceInfo The proposed app instance contained in the Node.
 */
export async function confirmProposedAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstanceInfo: AppInstanceInfo,
  nonInitiatingNode: boolean = false
) {
  const proposalParams = methodParams as NodeTypes.ProposeInstallParams;
  expect(proposalParams.abiEncodings).toEqual(
    proposedAppInstanceInfo.abiEncodings
  );
  expect(proposalParams.appDefinition).toEqual(
    proposedAppInstanceInfo.appDefinition
  );

  if (nonInitiatingNode) {
    expect(proposalParams.myDeposit).toEqual(
      proposedAppInstanceInfo.peerDeposit
    );
    expect(proposalParams.peerDeposit).toEqual(
      proposedAppInstanceInfo.myDeposit
    );
  } else {
    expect(proposalParams.myDeposit).toEqual(proposedAppInstanceInfo.myDeposit);
    expect(proposalParams.peerDeposit).toEqual(
      proposedAppInstanceInfo.peerDeposit
    );
  }
  expect(proposalParams.timeout).toEqual(proposedAppInstanceInfo.timeout);
  // TODO: uncomment when getState is implemented
  // expect(proposalParams.initialState).toEqual(appInstanceInitialState);
}

export function confirmProposedVirtualAppInstanceOnNode(
  methodParams: NodeTypes.MethodParams,
  proposedAppInstance: AppInstanceInfo,
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

const emptyNetworkMap = new Map(
  networkContextProps.map((i): [string, string] => [i, AddressZero])
);
export const EMPTY_NETWORK = Array.from(emptyNetworkMap.entries()).reduce(
  (main, [key, value]) => ({ ...main, [key]: value }),
  {}
) as NetworkContext;

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
  multisigAddress: string
): Promise<void> {
  const depositReq = makeDepositRequest(multisigAddress, One);
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

    await getMultisigCreationTransactionHash(nodeA, [
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
        await getProposedAppInstanceInfo(nodeA, appInstanceId)
      );

      const installRequest = makeInstallRequest(msg.data.appInstanceId);
      await nodeB.rpcRouter.dispatch(installRequest);
    });

    nodeA.on(NODE_EVENTS.INSTALL, async () => {
      const appInstanceNodeA = await getInstalledAppInstanceInfo(
        nodeA,
        appInstanceId
      );
      const appInstanceNodeB = await getInstalledAppInstanceInfo(
        nodeB,
        appInstanceId
      );
      expect(appInstanceNodeA).toEqual(appInstanceNodeB);
      resolve(appInstanceId);
    });

    const response = (await nodeA.rpcRouter.dispatch(
      appInstanceInstallationProposalRequest
    )) as JsonRpcResponse;

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
  appInstanceInfo: AppInstanceInfo
) {
  delete appInstanceInfo.proposedByIdentifier;
  delete appInstanceInfo.intermediaries;
  delete appInstanceInfo.identityHash;
  expect(appInstanceInfo).toEqual(proposedParams);
}

export async function getState(
  nodeA: Node,
  appInstanceId: string
): Promise<SolidityABIEncoderV2Type> {
  const getStateReq = generateGetStateRequest(appInstanceId);
  const getStateResult = (await nodeA.rpcRouter.dispatch(
    getStateReq
  )) as JsonRpcResponse;
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
    Zero
  );
  const params = virtualAppInstanceProposalRequest.parameters as NodeTypes.ProposeInstallVirtualParams;
  const response = (await nodeA.rpcRouter.dispatch(
    jsonRpcDeserialize({
      params,
      jsonrpc: "2.0",
      method: NodeTypes.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
      id: Date.now()
    })
  )) as JsonRpcResponse;
  const appInstanceId = (response.result
    .result as NodeTypes.ProposeInstallVirtualResult).appInstanceId;
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

  const response = (await nodeA.rpcRouter.dispatch(
    virtualAppInstanceProposalRequest
  )) as JsonRpcResponse;

  return {
    appInstanceId: (response.result as NodeTypes.ProposeInstallVirtualResult)
      .appInstanceId,
    params: virtualAppInstanceProposalRequest.parameters as NodeTypes.ProposeInstallVirtualParams
  };
}

export async function makeProposeCall(
  nodeA: Node,
  nodeB: Node
): Promise<{
  appInstanceId: string;
  params: NodeTypes.ProposeInstallParams;
}> {
  const appInstanceProposalReq = makeTTTProposalRequest(
    nodeA.publicIdentifier,
    nodeB.publicIdentifier,
    (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
    {},
    One,
    Zero
  );

  const response = (await nodeA.rpcRouter.dispatch(
    appInstanceProposalReq
  )) as JsonRpcResponse;
  return {
    appInstanceId: (response.result.result as NodeTypes.ProposeInstallResult)
      .appInstanceId,
    params: appInstanceProposalReq.parameters as NodeTypes.ProposeInstallParams
  };
}

export function sanitizeAppInstances(appInstances: AppInstanceInfo[]) {
  appInstances.forEach((appInstance: AppInstanceInfo) => {
    delete appInstance.myDeposit;
    delete appInstance.peerDeposit;
  });
}

export function createFreeBalanceStateWithFundedETHAmounts(
  addresses: string[],
  amount: BigNumber
): FreeBalanceState {
  return {
    activeAppsMap: {},
    balancesIndexedByToken: {
      [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: addresses.map(to => ({
        to,
        amount
      }))
    }
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
