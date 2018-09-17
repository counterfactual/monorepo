import json from "rollup-plugin-json";

export default {
	input: "dist/test/wallet/wallet.js",
	output: {
		file: "build/js/wallet.min.js",
		format: "iife",
		sourcemap: true,
		name: "wa"
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
