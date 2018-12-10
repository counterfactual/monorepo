import { INSTALL_FLOW } from "./flows/install";
import { METACHANNEL_INSTALL_APP_FLOW } from "./flows/metachannel-install-app";
import { SETUP_FLOW } from "./flows/setup";
import { UNINSTALL_FLOW } from "./flows/uninstall";
import { UPDATE_FLOW } from "./flows/update";
import { Protocol } from "./types";

export const FLOWS = {
  [Protocol.SetState]: UPDATE_FLOW,
  [Protocol.Setup]: SETUP_FLOW,
  [Protocol.Install]: INSTALL_FLOW,
  [Protocol.Uninstall]: UNINSTALL_FLOW,
  [Protocol.MetaChannelInstallApp]: METACHANNEL_INSTALL_APP_FLOW
};
