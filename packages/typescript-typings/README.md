# Counterfactual Typings <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

Type repository for external packages used by Counterfactual's Typescript code.

## Installation

```bash
yarn add -D @counterfactual/typescript-typings
```

## Usage

Add the following line within an `compilerOptions` section of your `tsconfig.json`

```json
"typeRoots": ["node_modules/@counterfactual/typescript-typings/types", "node_modules/@types"]
```
