FROM node:10.16.2-alpine

ARG npm_version
ARG yarn_version
ARG metamask_repository
ARG metamask_branch
ARG counterfactual_branch

# Set workspace directory.
RUN mkdir -p /greenboard
WORKDIR /greenboard

# Install git.
RUN apk add git

# Install specified versions of `npm` and `yarn`.
RUN npm i -g npm@${npm_version}
RUN npm i -g yarn@${yarn_version}

# Clone MetaMask.
RUN git clone --depth 1 --single-branch --branch ${metamask_branch} https://github.com/${metamask_repository} ./metamask

# Clone CF branch.
WORKDIR /greenboard/counterfactual
RUN git clone --depth 1 --single-branch --branch ${counterfactual_branch} https://github.com/counterfactual/monorepo .
RUN yarn --frozen-lockfile --ignore-engines && yarn --ignore-engines build
RUN cp ./cf.js/dist/index-iife.js /greenboard/metamask/app/vendor/counterfactual/node/cf.js.iife.js
RUN cp ./node/dist/index.iife.js ./metamask/app/vendor/counterfactual/node/node.iife.js
RUN cp ./firebase-client/dist/index-iife.js ./metamask/app/vendor/counterfactual/node/firebase-client.iife.js

# Build MetaMask.
WORKDIR /greenboard/metamask
RUN yarn --frozen-lockfile --ignore-engines && yarn --ignore-engines dist

# Install Chrome.
RUN apk add chromium-browser
