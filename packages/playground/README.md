# [Playground Demo](https://github.com/counterfactual/monorepo/tree/master/packages/playground) <img align="right" src="../../logo.svg" height="80px" />

This is an environment to run dApps (state channel-based decentralized applications) using [CF.js](../cf.js). It allows to showcase different demo apps, presenting a variety of use cases where state channels are applicable.

You can see the app online at https://playground.counterfactual.com.

## How do I run the Playground?

### Requirements 📋️

Make sure your dependency tree and package builds is up-to-date. Run the following command at the monorepo's root directory:

```shell
yarn && yarn build
```

In order for the Playground to run at your workstation, you'll need:

- A PostgreSQL database (>= 10.x)
- A BIP39 mnemonic for the Server's funds account

Check on the [Playground Server requirements](../playground-server/README.md#usage) **before** running the Playground.

### Running the Playground 🎪

You can use the following command at the monorepo's root to run the following Playground components:

```shell
yarn run:playground
```

This command will run:

- The Playground app itself (this package)
- The [Playground Server](../playground-server)
- The [High Roller](../dapp-high-roller) and [Tic-Tac-Toe](../dapp-tic-tac-toe) dApps

### Playing with bots 🤖

In order to play either High Roller or Tic-Tac-Toe locally, you'll need to run a bot package. You can run a bot package by running its own `yarn start` command on its directory. Refer either to the [High Roller](../high-roller-bot/README.md) or [Tic-Tac-Toe](../tic-tac-toe-bot/README.md)'s README files for any specific setup required by the bot.

Once you have a bot up and running, you'll need to setup the Playground to _force-matchmake_ with the bot's account. Since matchmaking works by choosing random users, it might not select the bot user when you click "Play" on the dApp.

In order to force-matchmake, the Playground listens to a flag that can be set via Local Storage, called `playground:matchmakeWith`.

Open the Playground's local URL, `http://localhost:3334` and on your devtools's console, run the following command:

```js
// Use "HighRollerBot" or "TicTacToeBot" as value
window.localStorage.setItem("playground:matchmakeWith", "<BotName>");
```

Refresh the page and you should see a ⚠️ **Using dev flags** message in the header. If you click it, it'll bring up a modal. It should reflect the value you set with the command mentioned above.

Now you're ready to play with a bot! 🤖

If you want to stop force-matchmaking, simply delete the flag by clicking the "Unset" action on the "Using dev flags" modal or by entering this command at your browser's console:

```js
window.localStorage.removeItem("playground:matchmakeWith");
```

Be sure to refresh the page to apply the changes.

### Playing with a specific user 👪️

You can use the same procedure described before to matchmake with a particular player. In order to do so, instead of using HighRollerBot or TicTacToe as the value of the flag, set it to the player's **username**.

## Known issues

- When using Firefox or any browsers without full support to [Custom Elements](https://developers.google.com/web/fundamentals/web-components/customelements), you can run the project with ES5 transpiling enabled (it'll slow down the live rebuilding a bit but it'll work). To do so, modify the `start` NPM script and add the `--es5` flag at the end of the command.
