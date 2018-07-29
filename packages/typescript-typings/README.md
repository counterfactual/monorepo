# Counterfactual Typings <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" /> 

Type repository for external packages used by Counterfactual's Typescript code.

## Installation

```bash
yarn add -D @counterfactual/typings
```

## Usage

Add the following line within an `compilerOptions` section of your `tsconfig.json`

```json
"typeRoots": ["node_modules/@counterfactual/typings/types", "node_modules/@types"]
```

This will allow the TS compiler to first look into that repo and then fallback to DT types.

### Install dependencies

If you don't have yarn workspaces enabled (Yarn < v1.0) - enable them:

```bash
yarn config set workspaces-experimental true
```

Then install dependencies

```bash
yarn install
```

### Build

To build this package and all other monorepo packages that it depends on, run the following from the monorepo root directory:

```bash
PKG=@counterfactual/typings yarn build
```

Or continuously rebuild on change:

```bash
PKG=@counterfactual/typings yarn watch
```

### Clean

```bash
yarn clean
```

### Lint

```bash
yarn lint
```
