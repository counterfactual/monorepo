#!/usr/bin/env python3

with open('contracts/Registry/Registry.sol') as f:
    code = f.readlines()

with open('contracts/Registry/IRegistry.sol') as f:
    iregistry = f.read()

# hack to delete IRegistry
registry_source = iregistry + ''.join(
    line for line in code
    if "import" not in line
)
