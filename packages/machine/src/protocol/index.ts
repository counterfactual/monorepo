import { Protocol } from "../types";

import { INSTALL_PROTOCOL } from "./install";
import { INSTALL_VIRTUAL_APP_PROTOCOL } from "./install-virtual-app";
import { SETUP_PROTOCOL } from "./setup";
import { UNINSTALL_PROTOCOL } from "./uninstall";
import { UPDATE_PROTOCOL } from "./update";

const protocolsByName = {
  [Protocol.Setup]: SETUP_PROTOCOL,
  [Protocol.Install]: INSTALL_PROTOCOL,
  [Protocol.Update]: UPDATE_PROTOCOL,
  [Protocol.Uninstall]: UNINSTALL_PROTOCOL,
  [Protocol.InstallVirtualApp]: INSTALL_VIRTUAL_APP_PROTOCOL
};

export function getProtocolFromName(protocolName: Protocol) {
  if (!(protocolName in protocolsByName)) {
    throw Error(`Received invalid protocol type ${protocolName}`);
  }
  return protocolsByName[protocolName];
}

export {
  INSTALL_PROTOCOL,
  INSTALL_VIRTUAL_APP_PROTOCOL,
  SETUP_PROTOCOL,
  UNINSTALL_PROTOCOL,
  UPDATE_PROTOCOL
};
