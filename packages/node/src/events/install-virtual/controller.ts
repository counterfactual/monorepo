import { RequestHandler } from "../../request-handler";
import { InstallVirtualMessage } from "../../types";

export default async function installEventController(
  requestHandler: RequestHandler,
  msg: InstallVirtualMessage
) {
  console.error("no-op");
}
