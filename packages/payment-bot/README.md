# Payment Bot
Functionality of installing, updating, and uninstalling payment threads from state channels.

# Instructions
Payment functionality is demonstrated by using two payment bots connected to an intermediary (in this demo, the `playground-server`).

## Initial Setup
* Run the [playground-server](../playground-server) by referring to its readme.
* Configure the payment bots:
  * Get the node ID of the playground server (starts with `xpub...`) and put it into `.env-cmdrc` as `INTERMEDIARY_IDENTIFIER`.
  * All other config options should be good as is, you can check these address on kovan.etherscan.io to make sure they have some KETH (please replenish if you use, the mnemonics and PKs are in source control for easy bootstrapping/testing):
    * Bot 1: `0xA0Ae1A3d4ff42AE77154fB9eBbCa0af2B5B7F357`
    * Bot 2: `0x24ac59b070eC2EA822249cB2A858208460305Faa`
* Run the payment bots while depositing into their channels:
  * Open two terminal windows.
  * Run `DEPOSIT_AMOUNT=0.1 yarn start:bot1` to deposit 0.1 ETH into the channel for Payment Bot 1.
  * Run `DEPOSIT_AMOUNT=0.1 yarn start:bot2` to deposit 0.1 ETH into the channel for Payment Bot 2.
* Bots will display the free balance after their channels are deposited into.

## Interacting with the Bots
* Select one bot as "sender" and one bot as "receiver".
* Copy the node identifier from the "receiver" to the "sender" when prompted (starts with `xpub...`).
* Enter the amount to deposit into your payment thread (must be less than channel's free balance).
* Follow the prompts to send payments from sender to receiver, view balances, and uninstall to recover balance into channel.
