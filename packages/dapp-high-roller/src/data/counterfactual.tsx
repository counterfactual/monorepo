import { createProviderConsumer } from "@stencil/state-tunnel";

export default createProviderConsumer<any>(
  {
    account: {},
    opponent: {},
    standalone: false,
    appInstance: null,
    appFactory: null,
    cfProvider: null,
    intermediary: null,
    excludeFromMatchmake: [],
    updateAppInstance: () => {},
    updateAppFactory: () => {},
    updateUser: () => {},
    updateOpponent: () => {},
    updateCfProvider: () => {},
    updateIntermediary: () => {},
    updateExcludeFromMatchmake: () => {}
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
