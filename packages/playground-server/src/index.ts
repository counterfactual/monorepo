import mountApi from "./api";
import "./node";

(async () => {
  const api = mountApi();
  const port = process.env.PORT || 9000;
  await api.listen(port);
  console.log(`API listening on :${port}`);
})();

export * from "./types";
