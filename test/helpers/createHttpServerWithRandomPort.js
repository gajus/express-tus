// @flow

import http, {
  IncomingMessage as HttpIncomingMessage,
  ServerResponse as HttpServerResponse,
} from 'http';
import {
  createHttpTerminator,
} from 'http-terminator';

type RequestHandlerType = (incomingMessage: HttpIncomingMessage, outgoingMessage: HttpServerResponse, stop: () => Promise<void>) => Promise<void> | void;

type HttpServerType = {|
  +stop: () => Promise<void>,
  +url: string,
|};

export default async (responseBody: string | Buffer | RequestHandlerType): Promise<HttpServerType> => {
  const router = (request, response) => {
    if (typeof responseBody === 'function') {
      // eslint-disable-next-line no-use-before-define
      responseBody(request, response, stop);
    } else if (responseBody) {
      response.end(responseBody);
    }
  };

  const server = http.createServer(router);

  const httpTerminator = createHttpTerminator({
    server,
  });

  const stop = async () => {
    await httpTerminator.terminate();
  };

  return new Promise((resolve, reject) => {
    server.once('error', reject);

    // eslint-disable-next-line no-undefined
    server.listen(0, undefined, undefined, () => {
      const port = server.address().port;
      const url = 'http://localhost:' + port;

      resolve({
        stop,
        url,
      });
    });
  });
};
