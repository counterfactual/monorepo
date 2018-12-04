import { createProviderConsumer } from "@stencil/state-tunnel";

export interface State {
  // NddeProvider interface
  nodeProvider: any;

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
