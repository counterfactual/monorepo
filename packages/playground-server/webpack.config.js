const webpack = require("webpack");
const path = require("path");

module.exports = {
  /**
   * This allows to use a non-minified version of the dist filed.
   */
  mode: "development",

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },

  resolve: {
    extensions: [".ts", ".js"]
  },

  /**
   * A Node module called "node-formidable" attempts to redefine "require",
   * making the netlify-lambda build process break. Setting this global to "false"
   * fixes it. See the attached links for more information.
   *
   * @see https://github.com/netlify/netlify-lambda/issues/64#issuecomment-429625359
   * @see https://github.com/felixge/node-formidable/issues/337#issuecomment-153408479
   */
  plugins: [new webpack.DefinePlugin({ "global.GENTLY": false })]
};
