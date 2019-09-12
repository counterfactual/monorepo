FROM resinci/npm-x86_64-ubuntu-node10

# add ethereum ppa
RUN add-apt-repository ppa:ethereum/ethereum

RUN apt-get update

# there doesn't appear to be any way to specify solc version num
# https://launchpad.net/~ethereum/+archive/ubuntu/ethereum/+packages?field.name_filter=solc&field.status_filter=published&field.series_filter=
RUN apt-get install -y solc

# install node 10.x and yarn 1.10.x
RUN apt-get install -y curl && \
  curl -sL https://deb.nodesource.com/node_10.x/pool/main/n/nodejs/nodejs_10.15.3-1nodesource1_amd64.deb > nodejs-10.15.3.deb && \
  dpkg -i nodejs-10.15.3.deb && \
  rm /usr/local/bin/node && \
  npm install -g yarn@1.12.3 && \
  rm /usr/local/bin/yarn

# environment variables for greenboard
ENV CHROME_DRIVER_PATH=/usr/bin/chromedriver
ENV CHROME_BINARY_PATH=/usr/bin/chromium-browser
ENV NODE_EXTENDED_PRIVATE_KEY=xprv9s21ZrQH143K3SUeRQphNwVqZc2hJg3bZiNQwbMyTGcyDuLXay2xWCMDmC2Tu8JHiCGbyy3rYjVq4LRYZ716Yn1WSkMUx2VzpgJr79g3iEt
ENV TEST_BROWSER_FLAG_DEBUG=#
ENV TEST_BROWSER_FLAG_DISABLE_GPU=#

# Install browser, driver and X virtual framebuffer
RUN apt-get install -y chromium-browser chromium-chromedriver xvfb nc
