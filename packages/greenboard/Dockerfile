FROM node:10.16.2-alpine

ARG npm_version
ARG yarn_version
ARG metamask_repository
ARG metamask_branch
ARG counterfactual_branch

# Add some aliases.
ENV yarn_ci_command="yarn --frozen-lockfile --ignore-engines"
ENV yarn_build_command="yarn --ignore-engines build"
ENV yarn_dist_command="yarn --ignore-engines dist"
ENV yarn_rm_command="yarn --ignore-engines remove"
ENV yarn_add_command="yarn --ignore-engines add -D"

# Greenboard configuration.
ENV CHROME_DRIVER_PATH=/usr/bin/chromedriver
ENV CHROME_BINARY_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=test
ENV NODE_EXTENDED_PRIVATE_KEY=xprv9s21ZrQH143K3SUeRQphNwVqZc2hJg3bZiNQwbMyTGcyDuLXay2xWCMDmC2Tu8JHiCGbyy3rYjVq4LRYZ716Yn1WSkMUx2VzpgJr79g3iEt
ENV TEST_BROWSER_FLAG_DEBUG=#
ENV TEST_BROWSER_FLAG_DISABLE_GPU=#

# Switch to apk branch 3.10.
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.10/main" > /etc/apk/repositories
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.10/community" >> /etc/apk/repositories
RUN apk update

# Install dependencies.
RUN apk add \
  # Build tools.
  git python2 make gcc g++ \
  # System tools for headless browser.
  dbus \
  # Screen & browser tools.
  xvfb-run \
  chromium=73.0.3683.103-r0	 \
  chromium-chromedriver=73.0.3683.103-r0

# Set a machine-id (this makes Chromium complain a bit less).
RUN dbus-uuidgen > /etc/machine-id

# Set workspace directory.
WORKDIR /greenboard

# Set PYTHON environment variable for node-gyp.
RUN PYTHON=$(which python2.7)

# Install specified versions of `npm` and `yarn`.
RUN npm i -g npm@${npm_version}
RUN npm i -g yarn@${yarn_version}

# Clone MetaMask.
RUN git clone --depth 1 --single-branch --branch ${metamask_branch} https://github.com/${metamask_repository} ./metamask

# Clone CF branch.
WORKDIR /greenboard/counterfactual
RUN git clone --depth 1 --single-branch --branch ${counterfactual_branch} https://github.com/counterfactual/monorepo .
RUN $yarn_ci_command && $yarn_build_command

# Injected CF IIFE dependencies into MetaMask.
RUN cp ./packages/cf.js/dist/index-iife.js /greenboard/metamask/app/vendor/counterfactual/node/cf.js.iife.js
RUN cp ./packages/node/dist/index.iife.js /greenboard/metamask/app/vendor/counterfactual/node/node.iife.js
RUN cp ./packages/firebase-client/dist/index.iife.js /greenboard/metamask/app/vendor/counterfactual/node/firebase-client.iife.js

# Build MetaMask without some heavy binaries. Mostly done because @sentry/cli
# isn't compatible with Alpine Linux, and we don't need it in this case.
# We also manually add @babel/core because on a subdependency level, it was
# getting installed and it's necessary for transpilation.
WORKDIR /greenboard/metamask
RUN mv package.json package.json.original
RUN sed -r '/\@sentry\/cli|\@storybook|eslint|chromedriver|geckodriver|selenium-webdriver|jsdom|\"karma|\"mocha|tape|testem|qunitjs|gh-pages|\"ganache-cli/d' package.json.original > package.json
RUN $yarn_ci_command
RUN $yarn_add_command @babel/core
RUN $yarn_dist_command

# Move the extension to Greenboard.
WORKDIR /greenboard/counterfactual
RUN mv /greenboard/metamask/dist/chrome ./packages/greenboard/extension

# Spin up the Hub and the Wallet UI.
RUN yarn run:wallet:e2e &

# Clean up.
RUN rm -rf /greenboard/metamask

# Setup final working directory.
WORKDIR /greenboard/counterfactual/packages/greenboard
ADD ./run-ci.sh ./run-ci.sh

ENTRYPOINT ["./run-ci.sh"]
