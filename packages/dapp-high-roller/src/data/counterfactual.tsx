import { createProviderConsumer } from "@stencil/state-tunnel";

export interface State {
  // NodeProvider interface
  nodeProvider: any;

  // CF.js instance
  cfjs: any;
}

export default createProviderConsumer<State>(
  {
    nodeProvider: null,
    cfjs: null
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
