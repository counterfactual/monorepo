# [High Roller Bot](https://github.com/counterfactual/monorepo/packages/high-roller-bot) <img align="right" src="../../logo.svg" height="80px" />

The High Roller Bot

## Usage

To run the bot:

```shell
yarn start
```

To make the bot deposit funds into its channel with the Playground, simply prefix `yarn start` with `DEPOSIT_AMOUNT=<amount>`.

Environment Variables

| Variable         | Purpose                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `DEPOSIT_AMOUNT` | The amount the bot should deposit. The bot will not deposit anything if this is not set.              |
| `DELAY_SECONDS`  | The number of seconds to wait when polling for account creation & counter party deposit confirmation. |
