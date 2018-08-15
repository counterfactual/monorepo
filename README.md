[![CircleCI](https://circleci.com/gh/counterfactual/machine/tree/master.svg?style=svg&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c)](https://circleci.com/gh/counterfactual/machine/tree/master)

## Dependencies

Until the monorepo is broken up, the packages in the monorepo can be linked as dependencies of the machine repo.

The NPM script `install:contracts_deps` pulls in the packages and does the linking & building.

This script is wrapped around `install` so simply running:

```
npm install
```

will install all the dependencies, including the monorepo packages.

More concretely, this linking allows the monorepo packages to be treated like regular dependencies in the machine, as follows:

```
import * as utils from "@counterfactual/test-utils";

console.log("Standard ETH unit");
console.log(utils.UNIT_ETH);
```
