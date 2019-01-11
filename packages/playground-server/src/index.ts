import { Log, LogLevel } from "logepi";

import mountApi from "./api";
import "./node";

Log.setOutputLevel((process.env.API_LOG_LEVEL as LogLevel) || "info");

(async () => {
  const api = mountApi();
  const port = process.env.PORT || 9000;
  await api.listen(port);
  Log.info("API is now ready", { tags: { port } });
})();

export * from "./types";
