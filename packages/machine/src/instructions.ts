import * as cf from "@counterfactual/cf.js";
import { UNINSTALL_FLOW } from "@counterfactual/machine/src/uninstall";

import { INSTALL_FLOW } from "./install";
import { METACHANNEL_INSTALL_APP_FLOW } from "./metachannel-install-app";
import { SETUP_FLOW } from "./setup";
import { UPDATE_FLOW } from "./update";

export const FLOWS = {
  [cf.legacy.node.ActionName.UPDATE]: UPDATE_FLOW,
  [cf.legacy.node.ActionName.SETUP]: SETUP_FLOW,
  [cf.legacy.node.ActionName.INSTALL]: INSTALL_FLOW,
  [cf.legacy.node.ActionName.UNINSTALL]: UNINSTALL_FLOW,
  [cf.legacy.node.ActionName
    .INSTALL_METACHANNEL_APP]: METACHANNEL_INSTALL_APP_FLOW
};
