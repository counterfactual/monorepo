import * as cf from "@counterfactual/cf.js";

import { ProposerActionsHash } from "../../types";

import { InstallProposer } from "./install-proposer";
import { SetupProposer } from "./setup-proposer";
import { UninstallProposer } from "./uninstall-proposer";
import { UpdateProposer } from "./update-proposer";

export const PROPOSER_ACTIONS: ProposerActionsHash = {
  [cf.legacy.node.ActionName.UPDATE]: UpdateProposer,
  [cf.legacy.node.ActionName.INSTALL]: InstallProposer,
  [cf.legacy.node.ActionName.UNINSTALL]: UninstallProposer,
  [cf.legacy.node.ActionName.SETUP]: SetupProposer
};
