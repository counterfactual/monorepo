# [Playground Server](https://github.com/counterfactual/monorepo/packages/playground-server) <img align="right" src="../../logo.svg" height="80px" />

The Playground Server provides several services for the Playground, including:

- _Account login and registration_
- _Matchmaking_, used to provide a multiplayer experience for the demo dApps.
- _Multisig creation_, to enable deposits on the onboarding flow

## Usage

While the server can run as a stand-alone app:

```shell
yarn start
```

It makes more sense to execute it along with the full Playground stack from the monorepo:

```shell
yarn run:playground
```

You'll need a database (local or remote) to store account data there. By default, we recommend using [PostgreSQL](https://www.postgresql.org/), but since we connect to it via [Knex](http://knexjs.org), you can configure any database you want.

## Testing

You can run tests at any time using:

```shell
yarn test
```

Instead of using the regular Postgre

## Environment settings

Unlike other projects, the Server relies on a [`.env-cmdrc`](./.env-cmdrc) which allows to configure multiple environments in the same file. See [env-cmd](https://www.npmjs.com/package/env-cmd#rc-file-usage)'s reference for more information on how it works.
