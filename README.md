Counterfactual Smart Contracts
======================

[![CircleCI](https://circleci.com/gh/counterfactual/counterfactual-contracts/tree/develop.svg?style=svg&circle-token=755f90dc490099c4e5f4334f16355a6262158bcf)](https://circleci.com/gh/counterfactual/counterfactual-contracts/tree/develop)
[![Coverage Status](https://coveralls.io/repos/github/counterfactual/counterfactual-contracts/badge.svg?branch=develop&t=Pc5Qbc)](https://coveralls.io/github/counterfactual/counterfactual-contracts?branch=develop)


<p align="center">
  <br/>
  <img width="100" height="100" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5a56e2c5ec212d24a8ac0bc6/1516740168424/?format=1500w"></img>
</p>

Collection of smart contracts for the Counterfactual state channels framework (https://counterfactual.com).

Tests are written in truffle and in pyethereum. In addition, running migrate from this repository is the recommended way to deploy these contracts onto a local ganache instance.

Testing: truffle
-------
### Install requirements with npm:

```bash
npm install
```

### Run all tests:

```bash
npm test
```

These require Node version >=7 for `async/await`. Truffle will automatically run TestRPC in the background.

### Lint the JS

```bash
npm run lint
```

Testing: pyethereum
------

### Install requirements with pip:

```bash
pip3 install -r requirements.txt
```

```bash
python3 ./test/python.py
```

Security and Liability
----------------------
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

License
-------
All smart contracts are released under GPL v.3.

Contributors
------------
- Liam Horne ([snario](https://github.com/snario/))
- Li Xuanji ([ldct](https://github.com/ldct))
