import json from "rollup-plugin-json";
import resolve from "rollup-plugin-node-resolve";

export default {
	input: "dist/examples/counter/index.js",
	output: {
		file: "build/js/counter.min.js",
		format: "iife",
		sourcemap: true,
		name: "counter",
		globals: {
			ethers: "ethers"
		}
	},
	external: ["ethers"],
	plugins: [json(), resolve()]
};
