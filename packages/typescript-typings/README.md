# [@counterfactual/typescript-typings](https://github.com/counterfactual/monorepo/packages/typescript-typings) <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

Type repository for external packages used by Counterfactual's Typescript code. This is automatically imported by all packages in the monorepo as a kind of stub for any packages we need that are not typed in the way that we would like.

## Installation

```bash
yarn add -D @counterfactual/typescript-typings
```

## Usage

Add the following line within an `compilerOptions` section of your `tsconfig.json`

```json
"typeRoots": ["node_modules/@counterfactual/typescript-typings/types", "node_modules/@types"]
```
