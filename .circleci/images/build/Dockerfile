FROM resinci/npm-x86_64-ubuntu-node10

# add ethereum ppa
RUN add-apt-repository ppa:ethereum/ethereum

RUN apt-get update

# install solc binary
RUN apt-get install -y solc

# install node 10.x
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install nodejs

# update yarn
RUN npm install -g yarn
