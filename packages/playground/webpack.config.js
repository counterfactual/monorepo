const path = require("path");
const fs = require("fs");

const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  mode: "development",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts"],
    modules: ["src", "node_modules"]
  },
  devServer: {
    contentBase: ["./dist"],
    watchContentBase: true
  },
  output: {
    filename: "playground.js",
    path: path.resolve(__dirname, "dist")
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Playground",
      template: "public/index.html",
      webComponents: fs.readFileSync("./dist/web-components.html")
    })
  ]
};
