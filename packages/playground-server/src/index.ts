import mountApi from "./api";
import node from "./node";

(async () => {
  const api = mountApi(node);
  const port = process.env.PORT || 9000;
  await api.listen(port);
  console.log(`API listening on :${port}`);
  console.log("Node address:", node.address);
})();

export * from "./types";
