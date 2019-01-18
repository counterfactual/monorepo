import { installVirtual } from "../../methods/app-instance/install-virtual/operation";
import { RequestHandler } from "../../request-handler";
import { InstallVirtualMessage } from "../../types";

export default async function installEventController(
  requestHandler: RequestHandler,
  msg: InstallVirtualMessage
) {
  await installVirtual(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.address,
    msg.from,
    msg.data.params
  );
}
