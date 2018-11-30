import { Config } from "@stencil/core";
import { sass } from '@stencil/sass';

// https://stenciljs.com/docs/config

export const config: Config = {
  globalStyle: "src/global/app.css",
  plugins: [
    sass({
      injectGlobalPaths: [
        'src/global/variables.scss',
        'src/global/box-sizing.scss',
        'src/global/reset.scss',
        'src/global/typography.scss',
        'src/global/layout.scss'
      ]
    })
  ]
};
