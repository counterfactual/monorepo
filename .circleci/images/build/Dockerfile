FROM resinci/npm-x86_64-ubuntu-node10

# add ethereum ppa
RUN add-apt-repository ppa:ethereum/ethereum

RUN apt-get update

RUN apt-get install -y solc

# install node 10.x
RUN apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get install nodejs && \
    rm /usr/local/bin/node

# update yarn
RUN npm install -g yarn
