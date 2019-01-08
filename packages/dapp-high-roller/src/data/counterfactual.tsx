import { createProviderConsumer } from "@stencil/state-tunnel";

import { cf } from "./types";


export default createProviderConsumer<any>(
  {
    appFactory: {} as cf.Provider
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
