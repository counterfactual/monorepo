import { Config } from "@stencil/core";
import { sass } from "@stencil/sass";

import { resolve } from "path";

// https://stenciljs.com/docs/config

export const config: Config = {
  globalStyle: "src/global/app.scss",
  plugins: [sass({ injectGlobalPaths: ["src/global/app.scss"] })],
  testing: {
    setupTestFrameworkScriptFile: resolve(__dirname, "jest-setup.js"),
    setupFiles: ["./test-setup.js"]
  }
};
