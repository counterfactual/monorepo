FROM node:10.16.2-alpine

ARG yarn_version

ENV CHROME_DRIVER_PATH=/usr/bin/chromedriver
ENV CHROME_BINARY_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=test
ENV NODE_EXTENDED_PRIVATE_KEY=xprv9s21ZrQH143K3SUeRQphNwVqZc2hJg3bZiNQwbMyTGcyDuLXay2xWCMDmC2Tu8JHiCGbyy3rYjVq4LRYZ716Yn1WSkMUx2VzpgJr79g3iEt
ENV TEST_BROWSER_FLAG_DEBUG=#
ENV TEST_BROWSER_FLAG_DISABLE_GPU=#

RUN \
  # Switch to apk branch 3.10.
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories; \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories; \
  \
  # Install dependencies.
  apk update; \
  apk add \
  git python2 make gcc g++ openssh tar gzip ca-certificates dbus libexecinfo-dev libexecinfo \
  xvfb-run chromium chromium-chromedriver; \
  \
  # Set a machine-id (this makes Chromium complain a bit less).
  dbus-uuidgen > /etc/machine-id; \
  \
  # Set PYTHON environment variable for node-gyp.
  PYTHON=$(which python2.7); \
  \
  # Install specified versions of `yarn`.
  npm i -g yarn@${yarn_version};
