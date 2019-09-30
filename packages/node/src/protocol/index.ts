import { Protocol } from "../machine/enums";
import { ProtocolExecutionFlow } from "../machine/types";

import { INSTALL_PROTOCOL } from "./install";
import { INSTALL_VIRTUAL_APP_PROTOCOL } from "./install-virtual-app";
import { PROPOSE_PROTOCOL } from "./propose";
import { SETUP_PROTOCOL } from "./setup";
import { TAKE_ACTION_PROTOCOL } from "./take-action";
import { UNINSTALL_PROTOCOL } from "./uninstall";
import { UNINSTALL_VIRTUAL_APP_PROTOCOL } from "./uninstall-virtual-app";
import { UPDATE_PROTOCOL } from "./update";
import { WITHDRAW_PROTOCOL } from "./withdraw";

const protocolsByName = {
  [Protocol.Install]: INSTALL_PROTOCOL,
  [Protocol.InstallVirtualApp]: INSTALL_VIRTUAL_APP_PROTOCOL,
  [Protocol.Propose]: PROPOSE_PROTOCOL,
  [Protocol.Setup]: SETUP_PROTOCOL,
  [Protocol.TakeAction]: TAKE_ACTION_PROTOCOL,
  [Protocol.Uninstall]: UNINSTALL_PROTOCOL,
  [Protocol.UninstallVirtualApp]: UNINSTALL_VIRTUAL_APP_PROTOCOL,
  [Protocol.Update]: UPDATE_PROTOCOL,
  [Protocol.Withdraw]: WITHDRAW_PROTOCOL
};

export function getProtocolFromName(
  protocolName: Protocol
): ProtocolExecutionFlow {
  if (!(protocolName in protocolsByName)) {
    throw Error(`Received invalid protocol type ${protocolName}`);
  }
  return protocolsByName[protocolName];
}

export {
  INSTALL_PROTOCOL,
  INSTALL_VIRTUAL_APP_PROTOCOL,
  SETUP_PROTOCOL,
  TAKE_ACTION_PROTOCOL,
  UNINSTALL_PROTOCOL,
  UPDATE_PROTOCOL,
  PROPOSE_PROTOCOL,
  WITHDRAW_PROTOCOL
};
