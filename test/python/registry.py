#!/usr/bin/env python3

with open('contracts/common/Registry.sol') as f:
    code = f.readlines()

with open('contracts/interfaces/IRegistry.sol') as f:
    iregistry = f.read()

# hack to delete IRegistry
registry_source = iregistry + ''.join(
    line for line in code
    if "import" not in line
)
