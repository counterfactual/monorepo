import { createProviderConsumer } from "@stencil/state-tunnel";

import NodeProvider from "./node-provider";
import { cf } from "./types";

export interface State {
  // NodeProvider interface
  nodeProvider: NodeProvider;

  // CF.js instance
  cfProvider: cf.Provider;
}

export default createProviderConsumer<State>(
  {
    nodeProvider: new NodeProvider(),
    cfProvider: {} as cf.Provider
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
