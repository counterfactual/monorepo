import { Protocol } from "../types";

import { INSTALL_PROTOCOL } from "./install";
import { METACHANNEL_INSTALL_APP_PROTOCOL } from "./metachannel-install-app";
import { SETUP_PROTOCOL } from "./setup";
import { UNINSTALL_PROTOCOL } from "./uninstall";
import { UPDATE_PROTOCOL } from "./update";

export function getProtocolFromName(protocolName: Protocol) {
  switch (protocolName) {
    case Protocol.Setup:
      return SETUP_PROTOCOL;
    case Protocol.Install:
      return INSTALL_PROTOCOL;
    case Protocol.SetState:
      return UPDATE_PROTOCOL;
    case Protocol.Uninstall:
      return UNINSTALL_PROTOCOL;
    case Protocol.MetaChannelInstallApp:
      return METACHANNEL_INSTALL_APP_PROTOCOL;
    default:
      throw Error(`Received invalid protocol type ${protocolName}`);
  }
}

export {
  INSTALL_PROTOCOL,
  METACHANNEL_INSTALL_APP_PROTOCOL,
  SETUP_PROTOCOL,
  UNINSTALL_PROTOCOL,
  UPDATE_PROTOCOL
};
