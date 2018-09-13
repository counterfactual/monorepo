This is a description of a candidate set of contracts and protocol. The key design decision is to make use of uninstall bits as well as a root nonce, to pack these together with the balance refund's nonce, as well as to rely on the atomicity of updating this "packed nonce".

## Contracts

The only dependency nonce used per channel is a single `uint256`. Each app continues to have an app-specific local nonce used for updates. The free balance does not have a local nonce. There can be at most 128 active apps (an active app is defined as one that has been installed but not uninstalled).

The dependency nonce has multiple dependents, but a dependent may in general depend on only some of the bits of the dependency nonce. We therefore treat the dependency nonce as a bitvector. Note that for determining which version of a dependency nonce is more recent we continue to interpret the dependency nonce as a `uint` (an equivalent way of saying this is that we order dependency nonces, treated as bitvectors, lexicographically).

The dependency nonce is logically divided into three regions:

```
d_nonce[0:120]      => rooted order bits
d_nonce[120:128]    => balance order bits
d_nonce[128:256]    => installation bits
```

Each app is associated with an index, `0 <= i <= 128`, as well as a 120-bit value denoted `r`. To finalize, the app checks that

1. `d_nonce[0:120] == r`
2. `d_nonce[128+i] == 1`

A free balance is associated with a 128-bit value denoted `r`. To finalize, the freebalance commitment checks that

1. `d_nonce[0:128] == r`

That's it!

## Protocol

The protocol mantains a dependency nonce `uint256 d_nonce` and an index `uint8 i`, both initially all zero.

### Install

If `i == 255`, perform the cleanup protocol, then try installing again.

Let `uint8 b := d_nonce[120:128]`, i.e., interpret the balance order bits as an unsigned integer. Similarly let `r_b = d_nonce[0:128]`.

Let `i' = i + 1`. Let `b' = b + 1`. Let `r_b' = r_b' + 1`. Sign commitments to deploy an app with r-value `d_nonce[0:120]` and i-value `i'`. Sign commitments to deploy a new free balance with r-value `r_b'`. Let `uint256 d'` be defined as

1. `d'[0:120] = d_nonce[0:120]`
2. `d'[120:128] = b'`
3. `d'[128 + i']` = 1
4. `d'[128 + j] = d_nonce[128 + j]` for `0 <= j <= 128, j != i'`.

Sign a commitment to increment the dependency nonce to `d'`. Set the protocol's `d_nonce` value to `d'` and the protocol's i-value to `i'`.

### Uninstall

Let `k` be the i-value of the app you wish to uninstall.

Let `uint8 b := d_nonce[120:128]`, and `uint8 r = d_nonce[120:128]`. Let `b' = b + 1` (there will be no overflow). Let `uint256 d'` be defined as

1. `d'[0:120] = d_nonce[0:120]`
2. `d'[120:128] = b'`
3. `d'[128 + k]` = 0
4. `d'[128 + j] = d_nonce[128 + j]` for `0 <= j <= 128, j != k`.

Set the protocol's `d_nonce` value to `d'`.

### Cleanup

Let `uint120 r = d_nonce[0:120], uint8 b := d_nonce[120:128]`. Let `r' = r + 1`. Let A be the list of active apps. For each 0 <= a < len(A), create a commitment to deploy the contract for A[a] with r-value `r'` and i-value `a`. Then, let `d'` be defined as

1. `d'[0:120] = r'`
2. `d'[120:128] = 0`
3. `d'[128 + i] = 1` for `0 <= i < len(A)`
4. `d'[128 + i] = 0` for `len(A) <= i < 256`

sign a commitment to increment the dependency nonce to `d'`. Let the protocol's `d_nonce` value to `d'` and the protocol's i-value to `len(A) - 1`.

## Intuition

An install and an uninstall

1. increment the balance order bits
2. flip the installation bit
3. leave the rooted order bits unchanged

A cleanup

1. increments the rooted order bits
2. cleans up uninstalled apps; a situation where this would be helpful is if `i == 255` but there are only 2 active apps. For instance, this situation arises if 128 apps were installed but 126 apps uninstalled.

## Footnotes

1: If there is, perform the cleanup protocol, and do the install
