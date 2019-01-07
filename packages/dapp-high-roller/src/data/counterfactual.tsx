import { createProviderConsumer } from "@stencil/state-tunnel";

import NodeProvider from "./node-provider";

export interface State {
  // NodeProvider interface
  nodeProvider: NodeProvider;

  // CF.js instance
  cfjs: any;
}

export default createProviderConsumer<State>(
  {
    nodeProvider: new NodeProvider(),
    cfjs: null
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
