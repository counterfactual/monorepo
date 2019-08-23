FROM node:10.16.2-alpine

ARG yarn_version
ARG metamask_repository
ARG metamask_branch
ARG counterfactual_path

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

WORKDIR /greenboard-workspace

ADD ${counterfactual_path} ./counterfactual

RUN \
  # Switch to apk branch 3.10.
  echo "http://dl-cdn.alpinelinux.org/alpine/v3.10/main" > /etc/apk/repositories; \
  echo "http://dl-cdn.alpinelinux.org/alpine/v3.10/community" >> /etc/apk/repositories; \
  \
  # Install dependencies.
  apk update; \
  apk add \
  git python2 make gcc g++ openssh tar gzip ca-certificates dbus \
  xvfb-run chromium=73.0.3683.103-r0 chromium-chromedriver=73.0.3683.103-r0; \
  \
  # Set a machine-id (this makes Chromium complain a bit less).
  dbus-uuidgen > /etc/machine-id; \
  \
  # Set PYTHON environment variable for node-gyp.
  PYTHON=$(which python2.7); \
  \
  # Install specified versions of `yarn`.
  npm i -g yarn@${yarn_version};

RUN \
  # Clone MetaMask.
  git clone --depth 1 --single-branch --branch ${metamask_branch} https://github.com/${metamask_repository} ./metamask; \
  \
  # Inject CF IIFE dependencies into MetaMask.
  cp ./counterfactual/packages/cf.js/dist/index-iife.js ./metamask/app/vendor/counterfactual/node/cf.js.iife.js; \
  cp ./counterfactual/packages/node/dist/index.iife.js ./metamask/app/vendor/counterfactual/node/node.iife.js; \
  cp ./counterfactual/packages/firebase-client/dist/index.iife.js ./metamask/app/vendor/counterfactual/node/firebase-client.iife.js;


WORKDIR /greenboard-workspace/metamask

RUN \
  # Build MetaMask without some heavy binaries. Mostly done because @sentry/cli
  # isn't compatible with Alpine Linux, and we don't need it in this case.
  # We also manually add @babel/core because on a subdependency level, it was
  # getting installed and it's necessary for transpilation.
  mv package.json package.json.original; \
  sed -r '/\@sentry\/cli|\@storybook|eslint|chromedriver|geckodriver|selenium-webdriver|jsdom|"karma|"mocha|tape|testem|qunitjs|gh-pages|"ganache-cli/d' package.json.original > package.json; \
  $yarn_ci_command; \
  $yarn_add_command @babel/core; \
  $yarn_dist_command;

WORKDIR /greenboard-workspace

RUN \
  # List directory (wtf is going on?)
  unlink ./counterfactual/packages/greenboard/extension || true; \
  mv ./metamask/dist/chrome ./counterfactual/packages/greenboard/extension; \
  \
  # Clean up.
  rm -rf /greenboard-workspace/metamask;

WORKDIR /greenboard-workspace/counterfactual/packages/greenboard

ENTRYPOINT ["./docker-run.sh"]
