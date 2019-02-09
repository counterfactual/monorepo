import { RequestHandler } from "../../request-handler";
import { UninstallMessage } from "../../types";

export default async function uninstallEventController(
  requestHandler: RequestHandler,
  nodeMsg: UninstallMessage
) {
  console.log("no-op");
}
