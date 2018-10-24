import { ActionName, ProposerActionsHash } from "../../types";
import { InstallProposer } from "./install-proposer";
import { SetupProposer } from "./setup-proposer";
import { UninstallProposer } from "./uninstall-proposer";
import { UpdateProposer } from "./update-proposer";

export const ProposerActions: ProposerActionsHash = {
  [ActionName.UPDATE]: UpdateProposer,
  [ActionName.INSTALL]: InstallProposer,
  [ActionName.UNINSTALL]: UninstallProposer,
  [ActionName.SETUP]: SetupProposer
};
