import { Node } from "@counterfactual/types";

import {
  createMultisig,
  getAllChannelAddresses,
  getInstalledAppInstances,
  getProposedAppInstances,
  handleGetAppInstanceState,
  installAppInstance,
  proposeAppInstanceInstall,
  proposeAppInstanceVirtualInstall
} from "./methods";

export const methodNameToImplementation = {
  [Node.MethodName.CREATE_MULTISIG]: createMultisig,
  [Node.MethodName.GET_APP_INSTANCES]: getInstalledAppInstances,
  [Node.MethodName.GET_CHANNEL_ADDRESSES]: getAllChannelAddresses,
  [Node.MethodName.GET_PROPOSED_APP_INSTANCES]: getProposedAppInstances,
  [Node.MethodName.GET_STATE]: handleGetAppInstanceState,
  [Node.MethodName.INSTALL]: installAppInstance,
  [Node.MethodName.PROPOSE_INSTALL_VIRTUAL]: proposeAppInstanceVirtualInstall,
  [Node.MethodName.PROPOSE_INSTALL]: proposeAppInstanceInstall
};
