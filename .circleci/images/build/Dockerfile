FROM resinci/npm-x86_64-ubuntu-node10

# add ethereum ppa
RUN add-apt-repository ppa:ethereum/ethereum

RUN apt-get update

RUN apt-get install -y solc

# install node 10.x and yarn 1.10.x
RUN apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/node_10.x/pool/main/n/nodejs/nodejs_10.15.3-1nodesource1_amd64.deb > nodejs-10.15.3.deb && \
    dpkg -i nodejs-10.15.3.deb && \
    rm /usr/local/bin/node && \
    npm install -g yarn@1.12.3 && \
    rm /usr/local/bin/yarn
