import { Config } from "@stencil/core";
import { sass } from "@stencil/sass";
import replace from "rollup-plugin-replace";

// https://stenciljs.com/docs/config

export const config: Config = {
  devServer: {
    port: 3334
  },
  globalStyle: "src/global/app.css",
  outputTargets: [
    {
      type: "www",
      serviceWorker: null
    }
  ],
  plugins: [
    sass({
      injectGlobalPaths: [
        "src/global/variables.scss",
        "src/global/box-sizing.scss",
        "src/global/reset.scss",
        "src/global/typography.scss",
        "src/global/layout.scss",
        "src/global/responsive.scss",
        "src/global/button.scss"
      ]
    }),
    replace({
      "ENV:API_HOST": process.env.API_HOST || "http://localhost:9000"
    })
  ],
  excludeSrc: ["node_modules/playground-server/src"]
};
