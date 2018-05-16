#!/usr/bin/env python3

# TODO(ldct): use solidity's built-in import resolution
# TODO(ldct): this breaks if any of the below files don't have a newline at the end

with open('contracts/common/Proxy.sol') as f:
    proxy = f.read() + '\n'

with open('contracts/factory/ProxyFactory.sol') as f:
    proxyFactory = f.read() + '\n'

with open('contracts/common/Registry.sol') as f:
    registry = f.read() + '\n'

with open('contracts/interfaces/IRegistry.sol') as f:
    iregistry = f.read() + '\n'

# hack to delete IRegistry
registry_source = proxy + proxyFactory + iregistry + registry

registry_source = registry_source.split('\n')

registry_source = (
    line for line in registry_source
    if "import" not in line and "pragma" not in line
)

registry_source = '\n'.join(registry_source)
