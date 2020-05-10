FROM node:14

RUN \
  groupadd -r smith && useradd -r -m -g smith smith && \
  mkdir /node_modules  && \
  mkdir -p /home/smith && \
  chown -R smith:smith ${HOME} /node_modules /srv

USER smith

WORKDIR /srv

RUN wget -q http://www.libxl.com/download/libxl-lin-3.8.5.tar.gz

ENV \
  # @see https://github.com/ranisalt/node-argon2/issues/244#issuecomment-590076434
  NPM_CONFIG_BUILD_FROM_SOURCE="true" \
  NODE_LIBXL_SDK_ARCHIVE="/srv/libxl-lin-3.8.5.tar.gz" \
  LD_LIBRARY_PATH="/srv/node_modules/libxl/deps/libxl/lib64/" \
  NODE_ENV="production" \
  NPM_CONFIG_DEPTH=0 \
  NPM_CONFIG_LOGLEVEL="warn" \
  NPM_CONFIG_PACKAGE_LOCK=0 \
  PATH="./node_modules/.bin:${PATH}"

COPY --chown=smith:smith package.json /srv

RUN NODE_ENV=development npm install

COPY --chown=smith:smith . /srv

RUN npm run build

EXPOSE 8000
