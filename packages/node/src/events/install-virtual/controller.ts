import { ERRORS } from "../../methods/errors";
import { RequestHandler } from "../../request-handler";
import { InstallVirtualMessage } from "../../types";

export default async function installEventController(
  requestHandler: RequestHandler,
  msg: InstallVirtualMessage
) {
  const store = requestHandler.store;

  const { appInstanceId } = msg.data.params;

  if (!appInstanceId || !appInstanceId.trim()) {
    throw new Error(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

  return appInstanceInfo;
}
