FROM mhart/alpine-node:10.9.0

RUN apk add --update git python make g++ emacs vim curl

WORKDIR /app

ENV CONTRACTS_REPO_COMMIT_HASH=4bf72eb8abae90aaf1aa2b104e8da8ea9194ffa5

RUN git clone https://github.com/counterfactual/contracts

RUN cd contracts && \
    git reset --hard $CONTRACTS_REPO_COMMIT_HASH && \
		npm i sha3 && \
		yarn install && \
		yarn build
