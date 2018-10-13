# Counterfactual Configs <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

Config repository for external packages used by Counterfactual's Typescript code.

## Installation

```bash
yarn add -D @counterfactual/configs
```

## Usage

For the Typescript compiler options, add the following line within the `extends` section of your `tsconfig.json`

```json
"extends": "./node_modules/@counterfactual/configs/tsconfigs/base-tsconfig",
```

For the Typescript linter options, add the following line within the `extends` section of your `tslint.json`

```json
"extends": ["@counterfactual/configs/tslints/base-tslint"]
```
