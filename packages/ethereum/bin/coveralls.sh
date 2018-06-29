#!/usr/bin/env bash

cat coverage/lcov.info | ./node_modules/.bin/coveralls
