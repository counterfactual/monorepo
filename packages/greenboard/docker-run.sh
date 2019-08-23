#!/bin/sh

# Set workspace directory.
cd /greenboard-workspace/counterfactual/packages/greenboard

# Run the tests through Xvfb.
xvfb-run yarn start
