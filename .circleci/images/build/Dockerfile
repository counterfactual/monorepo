FROM node:10.15.3-jessie

# install solc binary
RUN add-apt-repository ppa:ethereum/ethereum
RUN apt-get update
RUN apt-get install -y solc
RUN node -v & solc --version

# update yarn
RUN npm install -g yarn
RUN yarn --version
