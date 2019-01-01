import mountApi from "./api";
import node from "./node";

(async () => {
  const api = mountApi(node);
  const { PLAYGROUND_SERVER_PORT } = process.env;
  await api.listen(PLAYGROUND_SERVER_PORT);
  console.log(`API listening on :${PLAYGROUND_SERVER_PORT}`);
  console.log("Node address:", node.address);
})();

export * from "./types";
