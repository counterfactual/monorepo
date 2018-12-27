import { createProviderConsumer } from "@stencil/state-tunnel";

export interface State {
  network?: string;
}

export default createProviderConsumer<State>({}, (subscribe, child) => (
  <context-consumer subscribe={subscribe} renderer={child} />
));
