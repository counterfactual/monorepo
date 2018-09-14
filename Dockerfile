FROM mhart/alpine-node:10.9.0

RUN apk add --update git python make g++ emacs vim curl

WORKDIR /app

ENV CONTRACTS_REPO_COMMIT_HASH=0f86cd1ad263b766f32e1f0b67a049433c37bc3c

RUN git clone https://github.com/counterfactual/contracts

RUN cd contracts && \
    git reset --hard $CONTRACTS_REPO_COMMIT_HASH && \
    npm i sha3 && \
    yarn install && \
    yarn build
