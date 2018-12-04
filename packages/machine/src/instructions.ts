import * as cf from "@counterfactual/cf.js";

import { INSTALL_FLOW } from "./flows/install";
import { METACHANNEL_INSTALL_APP_FLOW } from "./flows/metachannel-install-app";
import { SETUP_FLOW } from "./flows/setup";
import { UNINSTALL_FLOW } from "./flows/uninstall";
import { UPDATE_FLOW } from "./flows/update";

export const FLOWS = {
  [cf.legacy.node.ActionName.UPDATE]: UPDATE_FLOW,
  [cf.legacy.node.ActionName.SETUP]: SETUP_FLOW,
  [cf.legacy.node.ActionName.INSTALL]: INSTALL_FLOW,
  [cf.legacy.node.ActionName.UNINSTALL]: UNINSTALL_FLOW,
  [cf.legacy.node.ActionName
    .INSTALL_METACHANNEL_APP]: METACHANNEL_INSTALL_APP_FLOW
};
