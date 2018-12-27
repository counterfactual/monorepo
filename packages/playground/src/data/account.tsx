import { createProviderConsumer } from "@stencil/state-tunnel";

export interface State {
  balance?: number;
  username?: string;
  email?: string;
  address?: string;
  updateAccount?: (e) => void;
}

export default createProviderConsumer<State>({}, (subscribe, child) => (
  <context-consumer subscribe={subscribe} renderer={child} />
));
