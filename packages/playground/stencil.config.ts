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
      "ENV:API_HOST": process.env.API_HOST || "http://localhost:9000",
      "ENV:TIER": process.env.TIER || "production",
      "ENV:FIREBASE_SERVER_HOST": process.env.FIREBASE_SERVER_HOST || "",
      "ENV:FIREBASE_SERVER_PORT": process.env.FIREBASE_SERVER_PORT || "",
      "ENV:FIREBASE_API_KEY": process.env.FIREBASE_API_KEY || "",
      "ENV:FIREBASE_AUTH_DOMAIN": process.env.FIREBASE_AUTH_DOMAIN || "",
      "ENV:FIREBASE_DATABASE_URL": process.env.FIREBASE_DATABASE_URL || "",
      "ENV:FIREBASE_MESSAGING_SENDER_ID":
        process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      "ENV:FIREBASE_PROJECT_ID": process.env.FIREBASE_PROJECT_ID || "",
      "ENV:FIREBASE_STORAGE_BUCKET": process.env.FIREBASE_STORAGE_BUCKET || ""
    })
  ],
  excludeSrc: ["node_modules/playground-server/src"]
};
