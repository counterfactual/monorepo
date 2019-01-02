import mountApi from "./api";
import node from "./node";

(async () => {
  const api = mountApi(node);
  const { PORT } = process.env;
  await api.listen(PORT);
  console.log(`API listening on :${PORT}`);
  console.log("Node address:", node.address);
})();

export * from "./types";
