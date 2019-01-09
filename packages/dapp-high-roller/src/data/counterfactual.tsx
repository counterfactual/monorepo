import { createProviderConsumer } from "@stencil/state-tunnel";

import { AppInstance } from "./mock-app-instance";
import { cf } from "./types";

export default createProviderConsumer<any>(
  {
    appFactory: {} as cf.AppFactory,
    cfProvider: {} as cf.Provider,
    appInstance: {} as AppInstance,
    updateAppInstance: () => {}
    // appInstanceId: ""
    // proposeInstall: () => {},
    // install: () => {}
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
