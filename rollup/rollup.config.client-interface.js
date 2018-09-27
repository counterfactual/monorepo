import json from "rollup-plugin-json";

export default {
  input: "dist/cf.js/client-interface.js",
  output: {
    file: "build/js/client-interface.min.js",
    format: "iife",
    sourcemap: true,
		name: "ci",
		globals: {
			ethers: "ethers",
			lodash: "_",
			testUtils: "test-utils"
		}
  },
  plugins: [
    json({
      include: [
        "dist/contracts/build/contracts/*",
        "dist/contracts/networks/*"
      ],
      preferConst: true
    })
  ]
};
