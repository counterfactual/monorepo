FROM resinci/npm-x86_64-ubuntu-node10

# install solc binary
RUN add-apt-repository ppa:ethereum/ethereum
RUN apt-get update
RUN apt-get install -y solc
RUN node -v & solc --version

# update yarn
RUN npm install -g yarn
RUN yarn --version
