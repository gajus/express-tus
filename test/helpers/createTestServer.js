// @flow

import express from 'express';
import createTusMiddleware from '../../src/factories/createTusMiddleware';
import createHttpServerWithRandomPort from './createHttpServerWithRandomPort';

type HttpServerType = {|
  +stop: () => Promise<void>,
  +url: string,
|};

export default async (configuration): Promise<HttpServerType> => {
  const app = express();

  app.disable('x-powered-by');

  app.use(createTusMiddleware(configuration));

  // eslint-disable-next-line no-unused-vars
  app.use((error, incomingMessage, outgoingMessage, next) => {
    // eslint-disable-next-line no-console
    console.error(error);

    outgoingMessage
      .status(500)
      .end(JSON.stringify(error));
  });

  return await createHttpServerWithRandomPort(app);
};
