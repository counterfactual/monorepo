This is a high-level overview of a candidate protocol. The key innovation is to use 0-timeout dependency nonces to quickly uninstall applications, to use atomic multisends that revert if any individual transaction reverts in order to get 2-message installs and uninstalls, and to have a root nonce that only changes in a "cleanup" step.

## Contracts

Dependency nonces are placed in NonceRegistry.sol, and they must be able to specify a custom timeout. We use nonces with timeout 0 as what we call "uninstall bits"; they are only ever set from an unset state to 1.

## Install

The install commitment is a multisend that

- asserts the root nonce is at an expected value
- asserts that the uninstall bit is unset
- sets the freebalance state
- does a conditional transfer

## Uninstall

The uninstall commitment is a multisend that

- sets the uninstall bit to 1
- sets the freebalance state

## Cleanup

The cleanup protocol does the following:

1. Let the next higher root nonce value be r
1. For each active app, sign a multisend commitment that
    - asserts the root nonce is at r
    - asserts that the uninstall bit is 0
    - does a conditional transfer for the app
1. Sign a multisend commitment that
    - asserts the root nonce is at r
    - does a conditional transfer for the freebalance
1. Set the root nonce to r

