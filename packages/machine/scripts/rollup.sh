#!/bin/bash

for file in ./rollup/rollup.config.*.js; do
		./node_modules/.bin/rollup -c $file
done
