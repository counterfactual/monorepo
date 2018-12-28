import api from "./api";
import node from "./node";

(async () => {
  await api.listen(9000);
  console.log("API listening on :9000");
  console.log("Node address:", node.address);
})();
