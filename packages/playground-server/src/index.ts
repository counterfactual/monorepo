import mountApi from "./api";
import node from "./node";

(async () => {
  const api = mountApi(node);
  await api.listen(9000);
  console.log("API listening on :9000");
  console.log("Node address:", node.address);
})();

export * from "./types";
