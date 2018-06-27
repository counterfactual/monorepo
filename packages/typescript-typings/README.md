## @counterfactual/typings

Type repository for external packages used by Counterfactual.

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

## Contributing

We welcome improvements and fixes from the wider community! To report bugs within this package, please create an issue in this repository.

Please read our [contribution guidelines](../../CONTRIBUTING.md) before getting started.

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